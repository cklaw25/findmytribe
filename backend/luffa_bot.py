"""
FindMyTribe — Luffa Bot Integration
Handles:
  LB-FR1: Any message from user → triggers matchmaking → returns tribe list in chat
  LB-FR2: Zone entry event → proactively messages user unprompted
  LB-FR3: Connect button → AI-drafted intro sent via Luffa
  LB-FR4: Message format: name, role, match %, one talking point
"""
import os
import httpx
from fastapi import APIRouter, Request, BackgroundTasks

router = APIRouter()

LUFFA_API_BASE = os.getenv("LUFFA_API_BASE", "https://api.luffa.im/v1")
LUFFA_BOT_TOKEN = os.getenv("LUFFA_BOT_TOKEN", "")

# In-memory map: luffa_user_id -> internal user_id
# For demo: pre-populate with demo accounts
# In prod: store in Supabase profiles.luffa_id column
_luffa_to_internal: dict = {
    # Fill these in once you have real Luffa user IDs from the event
    # "luffa_abc123": "usr_001",
}

# Reverse map for sending messages
_internal_to_luffa: dict = {}


def register_luffa_user(luffa_id: str, internal_user_id: str):
    """Call this when a user links their Luffa account."""
    _luffa_to_internal[luffa_id] = internal_user_id
    _internal_to_luffa[internal_user_id] = luffa_id


async def send_luffa_message(luffa_user_id: str, text: str) -> bool:
    """Send a message to a Luffa user. Returns True on success."""
    if not LUFFA_BOT_TOKEN:
        print(f"[Luffa] No bot token set — would send to {luffa_user_id}: {text[:80]}...")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{LUFFA_API_BASE}/messages",
                headers={"Authorization": f"Bearer {LUFFA_BOT_TOKEN}"},
                json={"to": luffa_user_id, "text": text},
            )
            resp.raise_for_status()
            return True
    except Exception as e:
        print(f"[Luffa] Failed to send message to {luffa_user_id}: {e}")
        return False


def format_tribe_list_message(matches: list, user_name: str = "you") -> str:
    """LB-FR4: Format tribe list as Luffa chat message."""
    lines = [
        f"🔥 *FindMyTribe* — Your tribe is ready!\n",
        f"Here are your top matches at this event:\n",
    ]
    for i, m in enumerate(matches[:5], 1):
        name = m.get("name", "?")
        role = m.get("role", "")
        company = m.get("company", "")
        score = m.get("match_score", 0)
        reason = m.get("match_reason", "")
        tp = (m.get("talking_points") or ["Say hi!"])[0]
        match_type = m.get("match_type", "peer").replace("_", " ").title()

        lines.append(
            f"{i}. *{name}* — {role} @ {company}\n"
            f"   {score}% match · {match_type}\n"
            f"   _{reason}_\n"
            f"   💬 \"{tp}\"\n"
        )
    lines.append("Reply *CONNECT <number>* to send an intro (e.g. CONNECT 1)")
    return "\n".join(lines)


def format_zone_alert_message(match: dict, zone: str) -> str:
    """LB-FR2: Proactive message when top match enters same zone."""
    name = match.get("name", "Someone")
    role = match.get("role", "")
    score = match.get("match_score", 0)
    tp = (match.get("talking_points") or ["Say hi!"])[0]
    zone_display = zone.replace("_", " ").title()
    return (
        f"📍 *{name}* just walked into *{zone_display}*\n"
        f"They're a {score}% match with you — {role}\n\n"
        f"Go now. Opening line:\n_{tp}_"
    )


def format_connect_intro(from_user: dict, to_user: dict, talking_point: str) -> str:
    """LB-FR3: AI-drafted intro sent via Luffa when Connect is tapped."""
    return (
        f"👋 Hi {to_user.get('name', 'there')}! I'm {from_user.get('name', 'someone')} "
        f"— {from_user.get('role', '')} at {from_user.get('company', '')}.\n\n"
        f"FindMyTribe matched us. Thought this might resonate:\n_{talking_point}_\n\n"
        f"Would love to connect while we're both here!"
    )


@router.post("/luffa/webhook")
async def luffa_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    LB-FR1: Receive any message from a Luffa user.
    Any message triggers matchmaking and returns their tribe list.
    """
    try:
        data = await request.json()
    except Exception:
        return {"ok": True}

    luffa_user_id = (data.get("from") or {}).get("id") or data.get("from_id")
    message_text = (data.get("message") or {}).get("text", "").strip().upper()

    if not luffa_user_id:
        return {"ok": True}

    # Handle CONNECT <n> command (LB-FR3)
    if message_text.startswith("CONNECT "):
        parts = message_text.split()
        if len(parts) == 2 and parts[1].isdigit():
            background_tasks.add_task(
                handle_connect_command, luffa_user_id, int(parts[1]) - 1
            )
            return {"ok": True}

    # Any other message → return tribe list (LB-FR1)
    background_tasks.add_task(handle_tribe_list_request, luffa_user_id)
    return {"ok": True}


async def handle_tribe_list_request(luffa_user_id: str):
    """Background: run matchmaking and send tribe list to user."""
    from main import ATTENDEES, build_tribe_list

    internal_id = _luffa_to_internal.get(luffa_user_id)
    if not internal_id:
        # For demo: use first attendee as fallback
        internal_id = "usr_001"

    user = next((a for a in ATTENDEES if a["id"] == internal_id), None)
    if not user:
        await send_luffa_message(luffa_user_id, "⚠️ User not found. Make sure you're registered at this event.")
        return

    try:
        result = build_tribe_list(user, ATTENDEES)
        matches = result["tribe_list"][:5]
        # Cache for CONNECT command
        _pending_connects[luffa_user_id] = matches
        message = format_tribe_list_message(matches, user.get("name", "you"))
        await send_luffa_message(luffa_user_id, message)
    except Exception as e:
        print(f"[Luffa] Matchmaking error for {luffa_user_id}: {e}")
        await send_luffa_message(luffa_user_id, "⚠️ Couldn't generate your tribe list right now. Try again in a moment.")


# Cache last tribe list per user for CONNECT command
_pending_connects: dict = {}


async def handle_connect_command(luffa_user_id: str, match_index: int):
    """LB-FR3: Send AI-drafted intro to the chosen match via Luffa."""
    from main import ATTENDEES

    matches = _pending_connects.get(luffa_user_id, [])
    if match_index >= len(matches):
        await send_luffa_message(luffa_user_id, "❌ Invalid number. Message me first to get your tribe list.")
        return

    internal_id = _luffa_to_internal.get(luffa_user_id, "usr_001")
    from_user = next((a for a in ATTENDEES if a["id"] == internal_id), {})
    match = matches[match_index]
    to_user = next((a for a in ATTENDEES if a["id"] == match.get("id")), {})

    tp = (match.get("talking_points") or ["Would love to connect!"])[0]
    intro = format_connect_intro(from_user, to_user, tp)

    # Send intro to the matched person if they have Luffa linked
    to_luffa_id = _internal_to_luffa.get(match.get("id", ""))
    if to_luffa_id:
        await send_luffa_message(to_luffa_id, intro)
        await send_luffa_message(luffa_user_id, f"✅ Intro sent to {to_user.get('name', 'them')} via Luffa!")
    else:
        await send_luffa_message(luffa_user_id, f"✅ Connection request sent to {to_user.get('name', 'them')}! (They'll see it in FindMyTribe)")


async def notify_zone_match(internal_user_id: str, match: dict, zone: str):
    """
    LB-FR2: Called by the zone update endpoint when a top match enters the same zone.
    Sends proactive Luffa message to the user — unprompted, autonomous agent behavior.
    """
    luffa_user_id = _internal_to_luffa.get(internal_user_id)
    if not luffa_user_id:
        return  # User hasn't linked Luffa
    message = format_zone_alert_message(match, zone)
    await send_luffa_message(luffa_user_id, message)


@router.post("/luffa/register")
async def register_user(request: Request):
    """
    Link a Luffa user ID to an internal FindMyTribe user ID.
    Call this when user first opens FindMyTribe via Luffa.
    Body: {"luffa_id": "...", "user_id": "usr_001"}
    """
    data = await request.json()
    luffa_id = data.get("luffa_id")
    user_id = data.get("user_id")
    if not luffa_id or not user_id:
        return {"ok": False, "error": "luffa_id and user_id required"}
    register_luffa_user(luffa_id, user_id)
    return {"ok": True, "luffa_id": luffa_id, "user_id": user_id}


@router.get("/luffa/status")
def luffa_status():
    """Check Luffa bot configuration."""
    return {
        "configured": bool(LUFFA_BOT_TOKEN),
        "api_base": LUFFA_API_BASE,
        "linked_users": len(_luffa_to_internal),
        "webhook_url": "/luffa/webhook",
    }
