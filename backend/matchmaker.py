import anthropic
import json
import os
from typing import List

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MATCH_PROMPT = """You are a professional networking matchmaker at a tech event.

Analyze these two attendee profiles and assess how well they would connect professionally.

PROFILE A (the user seeking connections):
Name: {name_a}
Role: {role_a} at {company_a}
Bio: {bio_a}
Interests: {interests_a}
Goals at this event: {goals_a}

PROFILE B (potential match):
Name: {name_b}
Role: {role_b} at {company_b}
Bio: {bio_b}
Interests: {interests_b}
Goals at this event: {goals_b}

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):
{{"score": <integer 0-100>, "reason": "<one sentence: why these two should meet>", "talking_points": ["<specific opener 1>", "<specific opener 2>", "<specific opener 3>"], "match_type": "<one of: collaborator|mentor|peer|founder_match|investor>"}}"""


def match_two_profiles(a: dict, b: dict) -> dict:
    prompt = MATCH_PROMPT.format(
        name_a=a["name"], role_a=a["role"], company_a=a.get("company", ""),
        bio_a=a["bio"], interests_a=", ".join(a["interests"]), goals_a=a.get("goals", ""),
        name_b=b["name"], role_b=b["role"], company_b=b.get("company", ""),
        bio_b=b["bio"], interests_b=", ".join(b["interests"]), goals_b=b.get("goals", ""),
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(response.content[0].text)


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
    }


def build_tribe_list(user: dict, all_attendees: List[dict]) -> List[dict]:
    use_ai = bool(os.getenv("ANTHROPIC_API_KEY"))
    results = []
    mutual_ids = set(user.get("mutual_friend_ids", []))

    for attendee in all_attendees:
        if attendee["id"] == user["id"]:
            continue
        try:
            match = match_two_profiles(user, attendee) if use_ai else _mock_match(user, attendee)
        except Exception as e:
            print(f"Match error for {attendee['id']}: {e}")
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
            "source": "mutual_friend" if is_mutual else "interest_match",
        })

    return sorted(results, key=lambda x: x["match_score"], reverse=True)
