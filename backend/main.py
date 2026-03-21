from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from matchmaker import build_tribe_list
from dotenv import load_dotenv
import json
import os

load_dotenv(".env.local")
load_dotenv()  # .env as fallback (won't override existing vars)

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


app = FastAPI(title="FindMyTribe API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("mock_data.json") as f:
    ATTENDEES: list = json.load(f)

_matched_users: set = set()


@app.get("/")
def root():
    return {"status": "FindMyTribe API running"}


@app.get("/attendees")
def get_all_attendees():
    return ATTENDEES


@app.get("/attendees/{user_id}")
def get_attendee(user_id: str):
    user = next((a for a in ATTENDEES if a["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/match/{user_id}")
def get_tribe_list(user_id: str):
    user = next((a for a in ATTENDEES if a["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        result = build_tribe_list(user, ATTENDEES)
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
    user = next((a for a in ATTENDEES if a["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = build_tribe_list(user, ATTENDEES)
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

    return {"status": "ok", "user_id": user_id, "zone": zone}


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

    zone_counts: dict = {}
    attendees_with_zones = []
    for a in ATTENDEES:
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
        "total_attendees": len(ATTENDEES),
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
def create_connection(from_user: str, to_user: str):
    """Create a pending connection request. Auto-accepts if reverse pending exists."""
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
