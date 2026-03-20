# FindMyTribe Product Requirements Document (PRD)

## 1) Product Context

FindMyTribe is an AI-powered social operating system for in-person networking events. It helps attendees identify the most relevant people to meet, shows where those people are in real time, and provides conversation starters. It also gives organisers a live view of attendee distribution and engagement.

The product solves three core problems:
- Social friction at events (people do not know who to approach).
- Missed high-value connections (people with strong overlap do not meet).
- Lack of live context (attendees and organisers cannot see the room state in a useful way).

## 2) Personas and Primary Use Cases

### Attendee (Primary)
- Wants a short list of high-value people to meet now.
- Needs confidence prompts (talking points) before approaching someone.
- Needs real-time location hints to find target matches quickly.

Primary use cases:
- Select own profile and generate top matches.
- View match rationale and talking points.
- Find a specific match on the event map.
- Update own zone and see map refresh.

### Organiser / Host (Primary)
- Wants a live operational view of event activity.
- Needs to identify crowding and low-engagement zones.
- Needs to spot isolated attendees for intervention.

Primary use cases:
- View event overview with all attendee locations.
- Monitor zone distribution over time.
- Refresh frequently enough for live event steering.

## 3) Scope

### MVP Scope
- Attendee profile selection and tribe list generation (top 8 matches).
- AI-generated reason + talking points for each match.
- Live zone map with check-in based location updates.
- Host dashboard with event overview and zone distribution.
- Supabase-backed storage and realtime location stream.
- Core backend endpoints: `/attendees`, `/match/{user_id}`, `/location/{user_id}`, `/locations`, `/event/overview`.

### Stretch Scope
- Passive location tracking with ESP32 BLE lanyard + anchors.
- Onchain identity primitives and optional connection token concept.
- Post-event AI follow-up message drafting.

### Out of Scope (for this PRD baseline)
- Native mobile apps (iOS/Android); PWA only.
- Large-scale privacy/compliance frameworks beyond event-level consent controls.
- Production-grade anti-abuse/fraud systems.

## 4) Success Criteria

### Product Outcomes
- Attendee can complete end-to-end "find and approach a match" flow without manual assistance.
- Organiser can observe meaningful live event state via dashboard.
- AI output quality is explainable and specific enough for real conversations.

### MVP Acceptance Outcomes
- Tribe list returns exactly 8 ranked matches for a valid user.
- Each match card contains score, reason, and at least 3 talking points.
- Zone updates are reflected in map and host view within acceptable latency.

## 5) Dependency-Ordered Requirements

## Layer 0 - Foundations

### Functional Requirements
- `L0-FR1` The system must run locally with separate backend and frontend services.
- `L0-FR2` Environment variable templates must be present for backend and frontend.
- `L0-FR3` A mock attendee dataset must exist with enough profile richness to power matching (interests, goals, social context).
- `L0-FR4` Frontend must include route shells for attendee and host experiences.

### Acceptance Criteria
- Backend serves API docs and responds on configured local URL.
- Frontend boots and reaches base route and core pages.
- Missing key environment variables fail with actionable errors.

### Dependencies
- None. This is the prerequisite for all later layers.

## Layer 1 - Core Data Backbone

### Functional Requirements
- `L1-FR1` The data model must include `profiles`, `locations`, and `tribe_list`.
- `L1-FR2` Location records must be keyed by user and track `zone` + `updated_at`.
- `L1-FR3` Realtime publication/subscription must include `locations`.
- `L1-FR4` Profiles must support matching fields (interests, goals, past events, mutual connections).

### Acceptance Criteria
- Schema can be created from SQL with no manual patching.
- Location update writes are persisted and observable in realtime channel.
- Profile records can be seeded and read by backend endpoints.

### Dependencies
- Requires Layer 0 environment and service setup.

## Layer 2 - Backend Core Services

### Functional Requirements
- `L2-FR1` `GET /attendees` must return all available attendee profiles.
- `L2-FR2` `POST /location/{user_id}` must update attendee zone.
- `L2-FR3` `GET /locations` must return current zone state for all tracked attendees.
- `L2-FR4` `GET /event/overview` must aggregate data for organiser dashboard.
- `L2-FR5` `POST /match/{user_id}` must orchestrate matchmaking and return ranked results.

### Acceptance Criteria
- Each endpoint returns stable JSON contract and expected HTTP status codes.
- Invalid user IDs return clear client errors.
- Endpoint responses are consumable by frontend without adapter hacks.

### Dependencies
- Requires Layer 1 schema and data availability.

## Layer 3 - AI Matchmaking Engine

### Functional Requirements
- `L3-FR1` Matchmaker must score all candidate attendees against the requesting user.
- `L3-FR2` Engine must rank results and return top 8.
- `L3-FR3` Each match must include:
  - compatibility score,
  - concise reason,
  - at least 3 context-aware talking points,
  - source category (`interest_match`, `mutual_friend`, etc.).
- `L3-FR4` Mutual connection signal should boost ranking.
- `L3-FR5` Output must be deterministic in structure even if AI text varies.

### Acceptance Criteria
- For a valid user, `/match/{user_id}` always returns 8 structured cards.
- Returned text references profile-grounded details (not generic filler).
- JSON parse failures or model errors are handled with retry/fallback behavior.

### Dependencies
- Requires Layer 2 orchestration endpoint and Layer 1 profile data.

## Layer 4 - Attendee Experience

### Functional Requirements
- `L4-FR1` Attendee can choose demo/user profile from onboarding route.
- `L4-FR2` Tribe page must request and render match list from backend.
- `L4-FR3` Card UI must display score, reason, talking points, and expansion behavior.
- `L4-FR4` Event map must show current zones for tribe members.
- `L4-FR5` "Find on map" action must focus/highlight selected match.
- `L4-FR6` Zone check-in controls must write to `/location/{user_id}` and reflect updates.

### Acceptance Criteria
- User reaches tribe list and map in one continuous flow.
- Selecting zone updates map location and persists backend-side.
- UX handles loading, empty, and transient failure states.

### Dependencies
- Requires Layer 2 endpoints and Layer 3 matchmaking outputs.

## Layer 5 - Organiser Experience

### Functional Requirements
- `L5-FR1` Host route must display attendee and zone overview data.
- `L5-FR2` Dashboard must refresh/subscribe often enough for live operations.
- `L5-FR3` Host can view room distribution by zone and attendee-level state.
- `L5-FR4` UI must support quick interpretation during live demo/event operations.

### Acceptance Criteria
- Dashboard reflects latest zone changes from attendee check-ins/simulation.
- Zone distribution view updates on regular cadence or realtime feed.
- Host page remains usable on laptop/tablet without layout breakage.

### Dependencies
- Requires Layers 1-4 to provide reliable location and attendee data.

## Layer 6 - Stretch Capabilities

### ESP32 Passive Tracking
- `L6-FR1` Anchor nodes must detect lanyard beacon proximity and infer zone.
- `L6-FR2` Inferred zones must publish through existing location API/data path.
- `L6-FR3` System must allow fallback to manual check-in when hardware unavailable.

Acceptance criteria:
- At least one beacon/anchor pair can generate observable zone updates.
- Hardware pipeline does not break manual MVP flow.

### Onchain Identity / Connection Token
- `L6-FR4` Optional wallet identity link can attach to attendee profile.
- `L6-FR5` Optional "we met" token concept can be represented for demo narrative.

Acceptance criteria:
- Feature can be toggled off without impacting MVP.
- Demo path clearly separates speculative/onchain components from core flow.

### Post-Event Follow-Up AI
- `L6-FR6` System can draft post-event intro/follow-up message from match context.

Acceptance criteria:
- Generated follow-up references real shared context from profile/match data.

### Dependencies
- Requires stable Layers 1-5; stretch modules must integrate via existing contracts.

## 6) Non-Functional Requirements

### Performance
- Match generation should complete quickly enough for interactive use (target: seconds, not minutes).
- Location updates should propagate fast enough to appear near-real-time in map/dashboard.

### Reliability
- Core endpoints should fail gracefully with explicit error payloads.
- Frontend must surface recoverable errors and allow retry actions.

### Privacy and Safety
- Participation is opt-in at event level.
- Location visibility should be scoped to necessary product contexts (attendee tribe, organiser dashboard).
- Event data retention policy should default to short-lived storage after event ends.

### Observability
- Backend should log endpoint errors and AI call failures for demo/debug readiness.

## 7) Data Model and API Contract Summary

### Core Entities
- `Profile`: id, name, role, company, bio, interests[], goals, social links, past_events[], mutual_friend_ids[].
- `Location`: user_id, zone, updated_at.
- `TribeMatch`: user_id, match_id, score, reason, talking_points[], match_type, source, generated_at.

### API Contracts
- `GET /attendees` -> `[Profile]`
- `POST /match/{user_id}` -> `{ user_id, matches: TribeMatch[] }` (8 items)
- `POST /location/{user_id}?zone=<zone>` -> `{ user_id, zone, updated_at }`
- `GET /locations` -> `[Location]`
- `GET /event/overview` -> `{ totals, zones, attendees, updated_at }` (exact shape implementation-owned)

## 8) Risks, Assumptions, and Constraints

### Assumptions
- Attendee profile data quality is sufficient for meaningful AI matching.
- Supabase realtime remains stable throughout event use.
- API keys and environment values are correctly configured.

### Risks
- AI output may become generic if prompts or profile depth are weak.
- Realtime lag can reduce trust in map/dashboard usefulness.
- Stretch hardware may fail under venue constraints (signal noise, setup time).

### Mitigations
- Keep a validated mock dataset and a known-good demo user.
- Provide simulation script as deterministic fallback for realtime demo.
- Keep stretch features isolated behind feature flags/fallback paths.

## 9) Dependency-Ordered Milestone Checklist (No Dates)

1. **Foundation Ready**
   - Local backend/frontend run.
   - Env templates complete.
   - Mock profiles available.
2. **Data Backbone Ready**
   - Supabase schema created.
   - Realtime location publication enabled.
   - Seed data loaded.
3. **API Baseline Ready**
   - All core endpoints implemented and contract-tested.
4. **AI Matching Ready**
   - Top-8 ranked outputs with reason + talking points.
   - Error handling and response shape stabilized.
5. **Attendee UX Ready**
   - Onboarding -> tribe list -> map -> zone update flow works.
6. **Host UX Ready**
   - Dashboard reflects live attendee/zone state.
7. **Stretch Integrations Ready (Optional)**
   - ESP32 pipeline integrated or safely disabled.
   - Onchain and follow-up modules demoable without impacting MVP.

## 10) Open Decisions for Implementation Phase

- Define exact zone taxonomy and naming consistency across frontend/backend.
- Confirm final JSON schema for `event/overview` to avoid frontend drift.
- Decide whether location updates are polling-only, realtime-only, or hybrid.
- Define retention and cleanup job for post-event data.

