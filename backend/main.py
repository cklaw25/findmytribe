from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from matchmaker import build_tribe_list
from dotenv import load_dotenv
import json
import os
import asyncio
from pathlib import Path

# Load env relative to this file's location, not CWD
_here = Path(__file__).resolve().parent
load_dotenv(_here / ".env.local")
load_dotenv(_here / ".env")  # fallback

# Lazy-load Supabase so the app still boots without keys during dev
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if url and key:
            from supabase import create_client
            _supabase = create_client(url, key)
    return _supabase


# ============================================================
# BACKGROUND AGENT LOOP
# Continuously monitors zone changes and fires proactive alerts.
# This is what makes the system autonomous — it never stops, never
# waits to be asked. PERCEIVE → REASON → ACT → ADAPT.
# ============================================================

_last_known_zones: dict = {}   # {user_id: zone}
AGENT_POLL_INTERVAL = 8        # seconds between zone polls


async def _agent_loop():
    """
    Autonomous agent: polls Supabase every 8s for zone changes.
    When a user moves into a new zone, fires zone-match alerts to
    every watcher who has that user in their tribe list.
    Runs for the lifetime of the server process.
    """
    global _last_known_zones
    print("[Agent] Background zone-watch loop started")
    while True:
        try:
            sb = get_supabase()
            if sb:
                rows = sb.table("locations").select("user_id, zone").execute().data
                for row in rows:
                    uid = row["user_id"]
                    zone = row["zone"]
                    if _last_known_zones.get(uid) != zone:
                        if uid in _last_known_zones:
                            # Zone changed — fire proactive alerts in a thread
                            # (sync Supabase client can't run in async context directly)
                            loop = asyncio.get_event_loop()
                            await loop.run_in_executor(
                                None, _notify_zone_watchers, uid, zone
                            )
                        _last_known_zones[uid] = zone
        except Exception as e:
            print(f"[Agent] Loop error: {e}")
        await asyncio.sleep(AGENT_POLL_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start autonomous background agent on server boot
    task = asyncio.create_task(_agent_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="FindMyTribe API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Luffa bot routes
from luffa_bot import router as luffa_router
app.include_router(luffa_router)

with open(_here / "mock_data.json") as f:
    _MOCK_ATTENDEES: list = json.load(f)

# In-memory profile cache — survives Supabase disconnects.
# Seeded with mock data; updated whenever Supabase returns profiles
# or a new profile is registered this session.
_profile_cache: dict = {a["id"]: a for a in _MOCK_ATTENDEES}


def _update_cache(profiles: list):
    """Merge a list of profiles into the cache (Supabase data wins)."""
    for p in profiles:
        _profile_cache[p["id"]] = p


# Dynamic attendees: Supabase profiles + in-memory cache fallback
def get_attendees() -> list:
    sb = get_supabase()
    if sb:
        try:
            rows = sb.table("profiles").select("*").execute()
            if rows.data:
                _update_cache(rows.data)
                return rows.data
        except Exception as e:
            print(f"Supabase profiles fetch error: {e}")
    # Return everything we know: mock data overridden/merged with any
    # profiles registered this session or previously fetched from Supabase.
    return list(_profile_cache.values())

# Cached view for endpoints that need it synchronously
ATTENDEES: list = _MOCK_ATTENDEES

_matched_users: set = set()


@app.get("/")
def root():
    return {"status": "FindMyTribe API running"}


@app.post("/profiles")
async def create_profile(request: Request):
    """Register a new attendee profile. Stores in Supabase + returns generated userId."""
    import uuid
    data = await request.json()
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name required")

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    profile = {
        "id": user_id,
        "name": name,
        "role": data.get("role", "Attendee"),
        "company": data.get("company", ""),
        "bio": data.get("bio", f"{data.get('role','Attendee')} attending Encode Club AI London."),
        "interests": data.get("interests", []),
        "goals": data.get("goals", ""),
        "past_events": [],
        "mutual_friend_ids": [],
    }

    sb = get_supabase()
    if sb:
        try:
            sb.table("profiles").upsert(profile).execute()
        except Exception as e:
            print(f"Supabase profile insert error: {e}")

    # Always add to in-memory cache so this session sees them even if
    # Supabase is down or the write failed.
    _profile_cache[user_id] = profile

    return profile


@app.get("/attendees")
def get_all_attendees():
    return get_attendees()


@app.get("/attendees/{user_id}")
def get_attendee(user_id: str):
    attendees = get_attendees()
    user = next((a for a in attendees if a["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/match/{user_id}")
def get_tribe_list(user_id: str):
    attendees = get_attendees()
    user = next((a for a in attendees if a["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        result = build_tribe_list(user, attendees)
    except Exception as e:
        print(f"build_tribe_list error: {e}")
        raise HTTPException(status_code=500, detail="Matchmaking failed")

    top8 = result["tribe_list"][:8]

    # Persist to Supabase if available
    sb = get_supabase()
    if sb:
        for match in top8:
            row = {
                "user_id": user_id,
                "match_id": match["id"],
                "score": match["match_score"],
                "reason": match["match_reason"],
                "talking_points": match["talking_points"],
                "match_type": match["match_type"],
                "source": match["source"],
                "background": match.get("background", ""),
            }
            try:
                sb.table("tribe_list").upsert(row).execute()
            except Exception:
                # background column may not exist yet — retry without it
                try:
                    row.pop("background", None)
                    sb.table("tribe_list").upsert(row).execute()
                except Exception:
                    pass

    _matched_users.add(user_id)

    return {"user_id": user_id, "tribe_list": top8}


@app.get("/debug/match/{user_id}")
def debug_match(user_id: str):
    attendees = get_attendees()
    user = next((a for a in attendees if a["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = build_tribe_list(user, attendees)
    debug = result["debug"]
    debug["supabase_connected"] = get_supabase() is not None

    return {
        "user_id": user_id,
        "debug": debug,
        "tribe_list": result["tribe_list"],
    }


def _rerank_user(user_id: str):
    """Background task: re-run build_tribe_list for a matched user and persist results."""
    user = next((a for a in ATTENDEES if a["id"] == user_id), None)
    if not user:
        return
    try:
        result = build_tribe_list(user, ATTENDEES)
        top8 = result["tribe_list"][:8]
        sb = get_supabase()
        if sb:
            for match in top8:
                row = {
                    "user_id": user_id,
                    "match_id": match["id"],
                    "score": match["match_score"],
                    "reason": match["match_reason"],
                    "talking_points": match["talking_points"],
                    "match_type": match["match_type"],
                    "source": match["source"],
                }
                try:
                    sb.table("tribe_list").upsert(row).execute()
                except Exception:
                    pass
    except Exception as e:
        print(f"Background re-rank error for {user_id}: {e}")


@app.post("/location/{user_id}")
def update_location(user_id: str, zone: str, background_tasks: BackgroundTasks):
    valid_zones = {"entrance", "main_hall", "workshop", "chill_zone", "outside"}
    if zone not in valid_zones:
        raise HTTPException(status_code=400, detail=f"Invalid zone. Must be one of: {valid_zones}")

    sb = get_supabase()
    if sb:
        try:
            sb.table("locations").upsert({"user_id": user_id, "zone": zone}).execute()
        except Exception as e:
            print(f"Supabase location upsert error: {e}")

    # Re-rank if user has been matched before (uses cached embeddings — cheap)
    if user_id in _matched_users:
        background_tasks.add_task(_rerank_user, user_id)

    # LB-FR2: Check if any OTHER users have this person as a top match — notify them via Luffa
    background_tasks.add_task(_notify_zone_watchers, user_id, zone)

    return {"status": "ok", "user_id": user_id, "zone": zone}


def _notify_zone_watchers(arriving_user_id: str, zone: str):
    """
    When someone checks into a zone, find other users in the same zone who have
    them as a top match and send a proactive Luffa alert. This is the autonomous
    agent behavior — fires with zero user input.
    """
    from luffa_bot import notify_zone_match, _internal_to_luffa

    arriving = next((a for a in ATTENDEES if a["id"] == arriving_user_id), None)
    if not arriving:
        return

    # Only check users who have Luffa linked AND have been matched
    for watcher_internal_id in list(_internal_to_luffa.keys()):
        if watcher_internal_id == arriving_user_id:
            continue
        if watcher_internal_id not in _matched_users:
            continue

        # Check if the arriving user is in their tribe list (cached in Supabase)
        sb = get_supabase()
        if sb:
            try:
                rows = (
                    sb.table("tribe_list")
                    .select("score, reason, talking_points, match_type")
                    .eq("user_id", watcher_internal_id)
                    .eq("match_id", arriving_user_id)
                    .execute()
                )
                if rows.data:
                    match_data = rows.data[0]
                    match_info = {
                        **arriving,
                        "match_score": int(match_data.get("score", 0)),
                        "match_reason": match_data.get("reason", ""),
                        "talking_points": match_data.get("talking_points", []),
                        "match_type": match_data.get("match_type", "peer"),
                    }
                    asyncio.run(notify_zone_match(watcher_internal_id, match_info, zone))
            except Exception as e:
                print(f"[ZoneWatcher] Error checking matches for {watcher_internal_id}: {e}")


@app.get("/location/{user_id}")
def get_location(user_id: str):
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("locations").select("*").eq("user_id", user_id).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            print(f"Supabase location fetch error: {e}")
    return {"user_id": user_id, "zone": "main_hall"}


@app.get("/locations")
def get_all_locations():
    sb = get_supabase()
    if sb:
        try:
            result = sb.table("locations").select("*").execute()
            return result.data
        except Exception as e:
            print(f"Supabase locations fetch error: {e}")
    # Fallback: return mock locations
    return [{"user_id": a["id"], "zone": "main_hall"} for a in ATTENDEES]


@app.get("/event/overview")
def event_overview():
    """Host dashboard: all attendees with their current zones + stats."""
    sb = get_supabase()
    locations = {}
    if sb:
        try:
            loc_data = sb.table("locations").select("*").execute().data
            locations = {l["user_id"]: l["zone"] for l in loc_data}
        except Exception as e:
            print(f"Supabase overview locations error: {e}")

    all_attendees = get_attendees()
    zone_counts: dict = {}
    attendees_with_zones = []
    for a in all_attendees:
        zone = locations.get(a["id"], "unknown")
        zone_counts[zone] = zone_counts.get(zone, 0) + 1
        attendees_with_zones.append({**a, "zone": zone})

    matches_made = len(_matched_users)
    if sb:
        try:
            rows = sb.table("tribe_list").select("user_id").execute().data
            matches_made = len({r["user_id"] for r in rows})
        except Exception:
            pass

    return {
        "total_attendees": len(all_attendees),
        "matches_made": matches_made,
        "zone_counts": zone_counts,
        "attendees": attendees_with_zones,
    }


# ============================================================
# CONNECTIONS
# ============================================================

# In-memory fallback when Supabase is not available
_connections_store: list = []


@app.post("/connections/{from_user}/{to_user}")
def create_connection(from_user: str, to_user: str, enforce_match: bool = True):
    """Create a pending connection request. Only allowed if they're mutual matches. Auto-accepts if reverse pending exists."""
    # Enforce mutual match: to_user must appear in from_user's tribe list
    if enforce_match:
        from_user_profile = next((a for a in ATTENDEES if a["id"] == from_user), None)
        if from_user_profile:
            try:
                result = build_tribe_list(from_user_profile, ATTENDEES)
                tribe_ids = {m["id"] for m in result["tribe_list"]}
                if to_user not in tribe_ids:
                    raise HTTPException(status_code=403, detail="You can only connect with people in your tribe list")
            except HTTPException:
                raise
            except Exception:
                pass  # If matching fails, allow the connection
    sb = get_supabase()
    if sb:
        try:
            # Check if reverse pending exists
            reverse = (
                sb.table("connections")
                .select("*")
                .eq("from_user", to_user)
                .eq("to_user", from_user)
                .eq("status", "pending")
                .execute()
            )
            if reverse.data:
                # Auto-accept both directions
                sb.table("connections").update({"status": "accepted"}).eq("from_user", to_user).eq("to_user", from_user).execute()
                sb.table("connections").upsert({"from_user": from_user, "to_user": to_user, "status": "accepted"}).execute()
                return {"status": "accepted", "from_user": from_user, "to_user": to_user}
            else:
                sb.table("connections").upsert({"from_user": from_user, "to_user": to_user, "status": "pending"}).execute()
                return {"status": "pending", "from_user": from_user, "to_user": to_user}
        except Exception as e:
            print(f"Supabase connections error: {e}")

    # In-memory fallback
    existing = next((c for c in _connections_store if c["from_user"] == to_user and c["to_user"] == from_user and c["status"] == "pending"), None)
    if existing:
        existing["status"] = "accepted"
        _connections_store.append({"from_user": from_user, "to_user": to_user, "status": "accepted"})
        return {"status": "accepted", "from_user": from_user, "to_user": to_user}
    _connections_store.append({"from_user": from_user, "to_user": to_user, "status": "pending"})
    return {"status": "pending", "from_user": from_user, "to_user": to_user}


@app.get("/connections/{user_id}")
def get_connections(user_id: str):
    """Return all connections (sent + received) for a user."""
    sb = get_supabase()
    if sb:
        try:
            sent = sb.table("connections").select("*").eq("from_user", user_id).execute()
            received = sb.table("connections").select("*").eq("to_user", user_id).execute()
            results = []
            for row in sent.data:
                results.append({**row, "direction": "sent"})
            for row in received.data:
                results.append({**row, "direction": "received"})
            return results
        except Exception as e:
            print(f"Supabase connections fetch error: {e}")

    # In-memory fallback
    results = []
    for c in _connections_store:
        if c["from_user"] == user_id:
            results.append({**c, "direction": "sent"})
        elif c["to_user"] == user_id:
            results.append({**c, "direction": "received"})
    return results


@app.patch("/connections/{from_user}/{to_user}")
def update_connection(from_user: str, to_user: str, status: str):
    """Accept or decline a connection request. On accept, upsert reverse direction."""
    if status not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'declined'")

    sb = get_supabase()
    if sb:
        try:
            sb.table("connections").update({"status": status}).eq("from_user", from_user).eq("to_user", to_user).execute()
            if status == "accepted":
                sb.table("connections").upsert({"from_user": to_user, "to_user": from_user, "status": "accepted"}).execute()
            return {"status": status, "from_user": from_user, "to_user": to_user}
        except Exception as e:
            print(f"Supabase connection update error: {e}")

    # In-memory fallback
    for c in _connections_store:
        if c["from_user"] == from_user and c["to_user"] == to_user:
            c["status"] = status
            if status == "accepted":
                existing_reverse = next((x for x in _connections_store if x["from_user"] == to_user and x["to_user"] == from_user), None)
                if existing_reverse:
                    existing_reverse["status"] = "accepted"
                else:
                    _connections_store.append({"from_user": to_user, "to_user": from_user, "status": "accepted"})
            return {"status": status, "from_user": from_user, "to_user": to_user}
    raise HTTPException(status_code=404, detail="Connection not found")


# ============================================================
# MESSAGES (chat persistence)
# ============================================================

import time as _time

_messages_store: list = []  # in-memory fallback


@app.post("/messages/{from_user}/{to_user}")
async def post_message(from_user: str, to_user: str, request: Request):
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    msg = {
        "id": f"msg_{int(_time.time() * 1000)}",
        "from_user": from_user,
        "to_user": to_user,
        "text": text,
        "created_at": _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime()),
    }
    sb = get_supabase()
    if sb:
        try:
            sb.table("messages").insert(msg).execute()
            return msg
        except Exception as e:
            print(f"Supabase message insert error: {e}")
    _messages_store.append(msg)
    return msg


@app.get("/messages/{user_id}/{other_user}")
def get_messages(user_id: str, other_user: str):
    sb = get_supabase()
    if sb:
        try:
            sent = sb.table("messages").select("*").eq("from_user", user_id).eq("to_user", other_user).execute()
            received = sb.table("messages").select("*").eq("from_user", other_user).eq("to_user", user_id).execute()
            combined = sorted(sent.data + received.data, key=lambda m: m.get("created_at", ""))
            return combined
        except Exception as e:
            print(f"Supabase messages fetch error: {e}")
    # In-memory fallback
    return sorted(
        [m for m in _messages_store if
         (m["from_user"] == user_id and m["to_user"] == other_user) or
         (m["from_user"] == other_user and m["to_user"] == user_id)],
        key=lambda m: m.get("created_at", "")
    )
