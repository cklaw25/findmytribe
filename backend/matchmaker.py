import json
import math
import os
from typing import List

_openai_client = None


def _get_client():
    """Lazy-load OpenAI client (only when OPENAI_API_KEY is set)."""
    global _openai_client
    if _openai_client is None:
        key = os.getenv("OPENAI_API_KEY", "")
        if key:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=key)
    return _openai_client


SYSTEM_PROMPT = """You are a world-class professional networking matchmaker at a live tech event.

You will receive a USER profile and a list of CANDIDATE profiles. Score every candidate on how valuable a conversation with the user would be.

## Scoring rubric (adapt weights dynamically based on the user's goals and background)

1. **Interest overlap** — shared topics in bio, skills, interests
2. **Goal alignment** — complementary event goals (e.g. "find co-founder" + "looking to join a startup")
3. **Social graph** — mutual connections signal trust and warm-intro potential
4. **Past event overlap** — shared communities indicate aligned worlds
5. **Role complementarity** — complementary roles score higher than identical ones (e.g. designer + engineer > engineer + engineer)

### Adaptive weighting
- If the user wants to "find a co-founder" → weight goal alignment and role complementarity heavily
- If the user is a student or early-career → weight mentor potential and learning opportunities
- If the user is an investor → weight founder potential and traction signals
- Otherwise balance all dimensions roughly equally

## Match types
Assign exactly one: collaborator, mentor, peer, founder_match, investor

## Output format
Return a JSON object with a single key "matches" containing an array. Each element:
{
  "id": "<candidate id>",
  "score": <integer 0-100>,
  "reason": "<one sentence: why these two should meet>",
  "talking_points": ["<specific opener 1>", "<specific opener 2>", "<specific opener 3>"],
  "match_type": "<collaborator|mentor|peer|founder_match|investor>",
  "background": "<2-3 sentence paragraph about this candidate, written for the user — highlight what makes them interesting and relevant>"
}

Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON."""


def _format_profile(p: dict) -> str:
    """Format a single profile for inclusion in the prompt."""
    parts = [
        f"ID: {p['id']}",
        f"Name: {p['name']}",
        f"Role: {p['role']} at {p.get('company', 'N/A')}",
        f"Bio: {p['bio']}",
        f"Interests: {', '.join(p.get('interests', []))}",
        f"Goals: {p.get('goals', 'N/A')}",
    ]
    if p.get("past_events"):
        parts.append(f"Past events: {', '.join(p['past_events'])}")
    if p.get("mutual_friend_ids"):
        parts.append(f"Mutual connections: {len(p['mutual_friend_ids'])}")
    return "\n".join(parts)


def _batch_match_openai(user: dict, candidates: List[dict]) -> List[dict]:
    """Single GPT-4o call that scores all candidates at once."""
    client = _get_client()
    if client is None:
        return []

    candidate_blocks = []
    for i, c in enumerate(candidates, 1):
        candidate_blocks.append(f"### Candidate {i}\n{_format_profile(c)}")

    user_message = (
        f"## USER PROFILE\n{_format_profile(user)}\n\n"
        f"## CANDIDATES ({len(candidates)} people)\n\n"
        + "\n\n".join(candidate_blocks)
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        max_tokens=4096,
        temperature=0.7,
        timeout=30,
    )

    data = json.loads(response.choices[0].message.content)
    return data.get("matches", [])


def normalize_score(raw: float, min_out: float = 35, max_out: float = 95, steepness: float = 0.08) -> int:
    """Sigmoid compression to prevent extreme scores.

    Maps raw 0-100 → bounded min_out-max_out range with smooth falloff.
    """
    midpoint = 50
    sigmoid = 1 / (1 + math.exp(-steepness * (raw - midpoint)))
    return int(min_out + sigmoid * (max_out - min_out))


def _mock_match(a: dict, b: dict) -> dict:
    """Score match by shared interests when no API key is available."""
    shared = set(a.get("interests", [])) & set(b.get("interests", []))
    score = min(95, 50 + len(shared) * 10)
    topic = next(iter(shared), a.get("interests", ["tech"])[0])
    return {
        "score": score,
        "reason": f"Both interested in {topic} — worth a conversation.",
        "talking_points": [
            f"Ask about their work on {topic}.",
            f"You're both at {b.get('company', 'this event')} — compare notes.",
            "What's the most surprising thing you've learned today?",
        ],
        "match_type": "peer",
        "background": f"{b['name']} works as {b['role']} at {b.get('company', 'their company')}. They're interested in {', '.join(b.get('interests', ['technology'])[:3])}.",
    }


def build_tribe_list(user: dict, all_attendees: List[dict]) -> List[dict]:
    """Build ranked tribe list using batch OpenAI matching with mock fallback."""
    candidates = [a for a in all_attendees if a["id"] != user["id"]]
    mutual_ids = set(user.get("mutual_friend_ids", []))

    # Try batch OpenAI call
    ai_lookup: dict = {}
    try:
        ai_matches = _batch_match_openai(user, candidates)
        for m in ai_matches:
            ai_lookup[m["id"]] = m
    except Exception as e:
        print(f"OpenAI batch match error: {e}")

    results = []
    for attendee in candidates:
        ai = ai_lookup.get(attendee["id"])
        if ai:
            match = {
                "score": normalize_score(ai["score"]),
                "reason": ai["reason"],
                "talking_points": ai.get("talking_points", []),
                "match_type": ai.get("match_type", "peer"),
                "background": ai.get("background", ""),
            }
        else:
            match = _mock_match(user, attendee)

        is_mutual = attendee["id"] in mutual_ids
        if is_mutual:
            match["score"] = min(100, match["score"] + 15)

        results.append({
            **attendee,
            "match_score": match["score"],
            "match_reason": match["reason"],
            "talking_points": match["talking_points"],
            "match_type": match["match_type"],
            "background": match.get("background", ""),
            "source": "mutual_friend" if is_mutual else "interest_match",
        })

    return sorted(results, key=lambda x: x["match_score"], reverse=True)
