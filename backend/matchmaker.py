import json
import math
import os
import time
from typing import List

_anthropic_client = None
_openai_client = None  # kept for optional embedding pre-filter only

PREFILTER_TOP_K = int(os.getenv("TRIBE_PREFILTER_K", "20"))
EMBEDDING_MODEL = "text-embedding-3-small"
_embedding_cache: dict = {}  # {profile_id: [float, ...]}


def _retry(fn, max_retries=2, backoff=1.0):
    """Retry a callable with exponential backoff. Returns the result or re-raises."""
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            if attempt < max_retries:
                time.sleep(backoff * (2 ** attempt))
    raise last_exc


def _get_anthropic_client():
    """Lazy-load Anthropic client (only when ANTHROPIC_API_KEY is set)."""
    global _anthropic_client
    if _anthropic_client is None:
        key = os.getenv("ANTHROPIC_API_KEY", "")
        if key:
            from anthropic import Anthropic
            _anthropic_client = Anthropic(api_key=key)
    return _anthropic_client


def _get_openai_client():
    """Lazy-load OpenAI client — used only for embedding pre-filter."""
    global _openai_client
    if _openai_client is None:
        key = os.getenv("OPENAI_API_KEY", "")
        if key:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=key)
    return _openai_client


SYSTEM_PROMPT = """You are a world-class professional networking matchmaker at a live tech event.

You will receive a USER profile and a list of CANDIDATE profiles. You MUST score every single candidate — return exactly one entry per candidate in the "matches" array. Do not skip anyone.

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

IMPORTANT: The "matches" array MUST contain exactly one entry for every candidate. Do not omit any.

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


def _batch_match_claude(user: dict, candidates: List[dict]) -> List[dict]:
    """Single Claude API call that scores all candidates at once."""
    client = _get_anthropic_client()
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

    response = _retry(lambda: client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ))

    content = response.content[0].text.strip()
    # Strip markdown fences if present
    if "```" in content:
        # Extract content between first ``` and last ```
        start = content.find("```")
        end = content.rfind("```")
        if start != end:
            content = content[start+3:end].strip()
            if content.startswith("json"):
                content = content[4:].strip()
    # Extract JSON object by finding outermost { }
    brace_start = content.find("{")
    brace_end = content.rfind("}")
    if brace_start != -1 and brace_end != -1:
        content = content[brace_start:brace_end+1]
    data = json.loads(content)
    return data.get("matches", [])


def normalize_score(raw: float, min_out: float = 35, max_out: float = 95, steepness: float = 0.08) -> int:
    """Sigmoid compression: maps raw 0-100 → bounded min_out-max_out range."""
    midpoint = 50
    sigmoid = 1 / (1 + math.exp(-steepness * (raw - midpoint)))
    return int(min_out + sigmoid * (max_out - min_out))


def _mock_match(a: dict, b: dict) -> dict:
    """Score match by shared interests when no API key is available."""
    shared = set(a.get("interests", [])) & set(b.get("interests", []))
    score = min(95, 50 + len(shared) * 10)
    topic = next(iter(shared), a.get("interests", ["tech"])[0] if a.get("interests") else "tech")
    return {
        "score": score,
        "reason": f"Both interested in {topic} — worth a conversation.",
        "talking_points": [
            f"Ask about their work on {topic}.",
            f"You're both building at this event — compare notes.",
            "What's the most surprising thing you've learned today?",
        ],
        "match_type": "peer",
        "background": f"{b['name']} works as {b['role']} at {b.get('company', 'their company')}. They're interested in {', '.join(b.get('interests', ['technology'])[:3])}.",
    }


def _build_embedding_text(profile: dict) -> str:
    """Concatenate profile fields into a single string for embedding."""
    parts = [
        profile.get("role", ""),
        profile.get("company", ""),
        profile.get("bio", ""),
        profile.get("goals", ""),
        ", ".join(profile.get("interests", [])),
    ]
    return " ".join(p for p in parts if p)


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity using stdlib math. Returns 0.0 on degenerate input."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _get_embeddings_batch(profiles: List[dict]) -> dict:
    """Fetch embeddings for profiles via OpenAI (optional pre-filter only)."""
    client = _get_openai_client()
    if client is None:
        return {}

    result = {}
    to_fetch = []
    for p in profiles:
        pid = p["id"]
        if pid in _embedding_cache:
            result[pid] = _embedding_cache[pid]
        else:
            to_fetch.append(p)

    if not to_fetch:
        return result

    try:
        texts = [_build_embedding_text(p) for p in to_fetch]
        response = _retry(lambda: client.embeddings.create(model=EMBEDDING_MODEL, input=texts))
        for p, item in zip(to_fetch, response.data):
            _embedding_cache[p["id"]] = item.embedding
            result[p["id"]] = item.embedding
    except Exception as e:
        print(f"Embedding API error: {e}")
        return {}

    return result


def _prefilter_candidates(
    user: dict, candidates: List[dict], top_k: int = PREFILTER_TOP_K
) -> tuple:
    """Return (filtered_candidates, debug_dict). Short-circuits when candidates <= top_k."""
    debug = {
        "prefilter_top_k": top_k,
        "candidates_total": len(candidates),
        "prefilter_skipped": False,
        "candidates_prefiltered": len(candidates),
        "embeddings_cached": 0,
        "embeddings_computed": 0,
    }

    if len(candidates) <= top_k:
        debug["prefilter_skipped"] = True
        return candidates, debug

    all_profiles = [user] + candidates
    cached_before = len(_embedding_cache)
    embeddings = _get_embeddings_batch(all_profiles)
    cached_after = len(_embedding_cache)
    new_computed = cached_after - cached_before

    debug["embeddings_computed"] = new_computed
    debug["embeddings_cached"] = len(all_profiles) - new_computed

    user_emb = embeddings.get(user["id"])
    if not user_emb:
        debug["prefilter_skipped"] = True
        return candidates, debug

    scored = []
    for c in candidates:
        c_emb = embeddings.get(c["id"])
        if c_emb:
            scored.append((c, _cosine_similarity(user_emb, c_emb)))
        else:
            scored.append((c, 0.0))

    scored.sort(key=lambda x: x[1], reverse=True)
    filtered = [c for c, _ in scored[:top_k]]
    debug["candidates_prefiltered"] = len(filtered)
    return filtered, debug


def build_tribe_list(user: dict, all_attendees: List[dict]) -> dict:
    """Build ranked tribe list using Claude API matching with mock fallback.

    Returns a dict with keys:
      - tribe_list: sorted list of match dicts (each includes ai_source)
      - debug: metadata about AI scoring status
    """
    candidates = [a for a in all_attendees if a["id"] != user["id"]]
    mutual_ids = set(user.get("mutual_friend_ids", []))

    anthropic_key_set = bool(os.getenv("ANTHROPIC_API_KEY", ""))
    api_call_ok = False
    ai_scored = 0
    mock_scored = 0

    # Pre-filter candidates via embedding similarity (optional, uses OpenAI if available)
    filtered_candidates, prefilter_debug = _prefilter_candidates(user, candidates)

    # Batch Claude API call on pre-filtered candidates
    ai_lookup: dict = {}
    try:
        ai_matches = _batch_match_claude(user, filtered_candidates)
        for m in ai_matches:
            ai_lookup[m["id"]] = m
        if ai_matches:
            api_call_ok = True
    except Exception as e:
        print(f"Claude batch match error: {e}")

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
            ai_source = "claude-sonnet-4-6"
            ai_scored += 1
        else:
            match = _mock_match(user, attendee)
            ai_source = "mock"
            mock_scored += 1

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
            "ai_source": ai_source,
        })

    tribe_list = sorted(results, key=lambda x: x["match_score"], reverse=True)

    return {
        "tribe_list": tribe_list,
        "debug": {
            "anthropic_key_set": anthropic_key_set,
            "api_call_ok": api_call_ok,
            "ai_scored": ai_scored,
            "mock_scored": mock_scored,
            "model": "claude-sonnet-4-6",
            **prefilter_debug,
        },
    }
