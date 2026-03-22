"""
FindMyTribe — Luffa Bot Integration
API: https://apibot.luffa.im (polling, not webhook)

LB-FR1: Any DM to bot → matchmaking → tribe list with CONNECT buttons
LB-FR2: Zone entry → proactive DM to watcher
LB-FR3: CONNECT <n> / button click → AI-drafted intro sent via Luffa
LB-FR4: Message format: name, role, match %, one talking point
"""
import os
import json
import asyncio
import httpx
from fastapi import APIRouter, Request

router = APIRouter()

LUFFA_API_BASE = "https://apibot.luffa.im"
LUFFA_BOT_SECRET = os.getenv("LUFFA_BOT_SECRET", "")
LUFFA_BOT_UID = os.getenv("LUFFA_BOT_UID", "")

# Dedup — Luffa can return the same message on consecutive polls
_seen_msg_ids: set = set()

# In-memory map: luffa_user_id <-> internal user_id
_luffa_to_internal: dict = {}
_internal_to_luffa: dict = {}

# Last tribe list per luffa user, for CONNECT command
_pending_connects: dict = {}


def register_luffa_user(luffa_id: str, internal_user_id: str):
    _luffa_to_internal[luffa_id] = internal_user_id
    _internal_to_luffa[internal_user_id] = luffa_id


# ============================================================
# SEND
# ============================================================

async def send_luffa_message(luffa_user_id: str, text: str) -> bool:
    """Send a plain-text DM to a Luffa user."""
    if not LUFFA_BOT_SECRET:
        print(f"[Luffa] No secret — would send to {luffa_user_id}: {text[:80]}")
        return False
    try:
        msg = json.dumps({"text": text})
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{LUFFA_API_BASE}/robot/send",
                json={"secret": LUFFA_BOT_SECRET, "uid": luffa_user_id, "msg": msg},
            )
            resp.raise_for_status()
            print(f"[Luffa] Sent to {luffa_user_id}: {text[:60]}")
            return True
    except Exception as e:
        print(f"[Luffa] Send failed to {luffa_user_id}: {e}")
        return False


async def send_luffa_message_buttons(luffa_user_id: str, text: str, buttons: list) -> bool:
    """Send a DM with interactive button list."""
    if not LUFFA_BOT_SECRET:
        print(f"[Luffa] No secret — would send buttons to {luffa_user_id}")
        return False
    try:
        msg_obj = {"text": text, "button": buttons, "dismissType": "select"}
        msg = json.dumps(msg_obj)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{LUFFA_API_BASE}/robot/send",
                json={"secret": LUFFA_BOT_SECRET, "uid": luffa_user_id, "msg": msg},
            )
            resp.raise_for_status()
            return True
    except Exception as e:
        print(f"[Luffa] Send buttons failed to {luffa_user_id}: {e}")
        return False


# ============================================================
# POLL LOOP (replaces webhook)
# ============================================================

async def _poll_once() -> list:
    """Call /robot/receive and return list of conversation objects."""
    if not LUFFA_BOT_SECRET:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{LUFFA_API_BASE}/robot/receive",
                json={"secret": LUFFA_BOT_SECRET},
            )
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[Luffa] Poll error: {e}")
        return []


async def luffa_poll_loop():
    """
    Background loop: polls Luffa every second for new messages.
    Handles DMs only — ignores group chats for now.
    Launched from main.py lifespan alongside the zone-watch agent loop.
    """
    print("[Luffa] Message polling loop started")
    while True:
        try:
            conversations = await _poll_once()
            for conv in conversations:
                uid = conv.get("uid", "")          # sender's Luffa ID
                msg_type = str(conv.get("type", "0"))  # "0"=DM, "1"=group
                messages = conv.get("message", [])

                if msg_type != "0":
                    continue  # skip group chats

                for raw in messages:
                    try:
                        msg_data = json.loads(raw) if isinstance(raw, str) else raw
                    except Exception:
                        continue

                    msg_id = msg_data.get("msgId")
                    if msg_id:
                        if msg_id in _seen_msg_ids:
                            continue
                        _seen_msg_ids.add(msg_id)

                    text = msg_data.get("text", "").strip().upper()

                    if text.startswith("CONNECT "):
                        parts = text.split()
                        if len(parts) == 2 and parts[1].isdigit():
                            asyncio.create_task(
                                handle_connect_command(uid, int(parts[1]) - 1)
                            )
                    else:
                        # Any other message → run matchmaking
                        asyncio.create_task(handle_tribe_list_request(uid))

        except Exception as e:
            print(f"[Luffa] Poll loop error: {e}")

        await asyncio.sleep(1)


# ============================================================
# HANDLERS
# ============================================================

async def handle_tribe_list_request(luffa_user_id: str):
    """Run matchmaking for this Luffa user and send their tribe list."""
    from main import get_attendees
    from matchmaker import build_tribe_list

    internal_id = _luffa_to_internal.get(luffa_user_id)
    attendees = get_attendees()

    if not internal_id:
        # Not registered — ask them to register
        await send_luffa_message(
            luffa_user_id,
            "👋 Welcome to FindMyTribe!\n\nTo get your matches, first register at:\nhttps://findmytribe-theta.vercel.app\n\nThen reply here with your user ID (starts with usr_)"
        )
        return

    user = next((a for a in attendees if a["id"] == internal_id), None)
    if not user:
        await send_luffa_message(luffa_user_id, "⚠️ Profile not found. Make sure you're registered.")
        return

    await send_luffa_message(luffa_user_id, "🔍 Finding your tribe... hang tight!")

    try:
        result = build_tribe_list(user, attendees)
        matches = result["tribe_list"][:5]
        _pending_connects[luffa_user_id] = matches

        text = format_tribe_list_message(matches, user.get("name", "you"))
        buttons = [
            {
                "name": f"CONNECT {i+1} — {m.get('name', '?')}",
                "selector": f"CONNECT {i+1}",
                "isHidden": "0",
            }
            for i, m in enumerate(matches)
        ]
        await send_luffa_message_buttons(luffa_user_id, text, buttons)
    except Exception as e:
        print(f"[Luffa] Matchmaking error for {luffa_user_id}: {e}")
        await send_luffa_message(luffa_user_id, "⚠️ Couldn't generate your tribe list right now. Try again in a moment.")


async def handle_connect_command(luffa_user_id: str, match_index: int):
    """LB-FR3: Send AI-drafted intro to the chosen match via Luffa."""
    from main import get_attendees

    attendees = get_attendees()
    matches = _pending_connects.get(luffa_user_id, [])
    if match_index >= len(matches):
        await send_luffa_message(luffa_user_id, "❌ Invalid number. Message me first to get your tribe list.")
        return

    internal_id = _luffa_to_internal.get(luffa_user_id, "")
    from_user = next((a for a in attendees if a["id"] == internal_id), {})
    match = matches[match_index]
    to_user = next((a for a in attendees if a["id"] == match.get("id")), {})

    tp = (match.get("talking_points") or ["Would love to connect!"])[0]
    intro = format_connect_intro(from_user, to_user, tp)

    to_luffa_id = _internal_to_luffa.get(match.get("id", ""))
    if to_luffa_id:
        await send_luffa_message(to_luffa_id, intro)
        await send_luffa_message(luffa_user_id, f"✅ Intro sent to {to_user.get('name', 'them')} via Luffa!")
    else:
        await send_luffa_message(
            luffa_user_id,
            f"✅ Connection request sent to {to_user.get('name', 'them')}!\n(They'll see it in FindMyTribe)"
        )


# ============================================================
# FORMATTERS
# ============================================================

def format_tribe_list_message(matches: list, user_name: str = "you") -> str:
    """LB-FR4: Format tribe list as Luffa chat message."""
    lines = [f"🔥 FindMyTribe — Your tribe is ready!\n"]
    for i, m in enumerate(matches, 1):
        name = m.get("name", "?")
        role = m.get("role", "")
        company = m.get("company", "")
        score = m.get("match_score", 0)
        reason = m.get("match_reason", "")
        tp = (m.get("talking_points") or ["Say hi!"])[0]
        match_type = m.get("match_type", "peer").replace("_", " ").title()
        lines.append(
            f"{i}. {name} — {role} @ {company}\n"
            f"   {score}% match · {match_type}\n"
            f"   {reason}\n"
            f"   💬 \"{tp}\"\n"
        )
    lines.append("Tap a button below or reply CONNECT <number> to send an intro:")
    return "\n".join(lines)


def format_zone_alert_message(match: dict, zone: str) -> str:
    """LB-FR2: Proactive message when top match enters same zone."""
    name = match.get("name", "Someone")
    role = match.get("role", "")
    score = match.get("match_score", 0)
    tp = (match.get("talking_points") or ["Say hi!"])[0]
    zone_display = zone.replace("_", " ").title()
    return (
        f"📍 {name} just walked into {zone_display}!\n"
        f"They're a {score}% match — {role}\n\n"
        f"Go now. Opening line:\n\"{tp}\""
    )


def format_connect_intro(from_user: dict, to_user: dict, talking_point: str) -> str:
    """LB-FR3: AI-drafted intro sent to match."""
    return (
        f"👋 Hi {to_user.get('name', 'there')}! I'm {from_user.get('name', 'someone')} "
        f"— {from_user.get('role', '')} at {from_user.get('company', '')}.\n\n"
        f"FindMyTribe matched us. Thought this might resonate:\n\"{talking_point}\"\n\n"
        f"Would love to connect while we're both here!"
    )


# ============================================================
# ZONE ALERT (called from main.py agent loop)
# ============================================================

async def notify_zone_match(internal_user_id: str, match: dict, zone: str):
    """LB-FR2: Proactive zone alert — called by background agent when top match enters same zone."""
    luffa_user_id = _internal_to_luffa.get(internal_user_id)
    if not luffa_user_id:
        return
    message = format_zone_alert_message(match, zone)
    await send_luffa_message(luffa_user_id, message)


# ============================================================
# REST ENDPOINTS
# ============================================================

@router.post("/luffa/register")
async def luffa_register(request: Request):
    """
    Link a Luffa user ID to an internal FindMyTribe user ID.
    Body: {"luffa_id": "Kqfbwg7C8Kv", "user_id": "usr_memphis"}
    """
    data = await request.json()
    luffa_id = data.get("luffa_id", "").strip()
    user_id = data.get("user_id", "").strip()
    if not luffa_id or not user_id:
        return {"ok": False, "error": "luffa_id and user_id required"}
    register_luffa_user(luffa_id, user_id)
    return {"ok": True, "luffa_id": luffa_id, "user_id": user_id}


@router.get("/luffa/status")
def luffa_status():
    return {
        "configured": bool(LUFFA_BOT_SECRET),
        "bot_uid": LUFFA_BOT_UID,
        "api_base": LUFFA_API_BASE,
        "linked_users": len(_luffa_to_internal),
        "seen_messages": len(_seen_msg_ids),
    }
