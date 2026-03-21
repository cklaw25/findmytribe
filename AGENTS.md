# AGENTS.md

## Project overview

FindMyTribe is an AI-powered networking app for live events. Attendees pick a demo profile, an AI agent scores them against every other attendee, and returns a ranked tribe list with match reasons and conversation starters. A live map shows where everyone is in the venue in real time. There is also a host dashboard for event organisers to monitor zone occupancy and isolated attendees.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, TypeScript, Tailwind v4 |
| Backend | Python 3, FastAPI, Uvicorn |
| AI matchmaking | Anthropic Claude (`claude-sonnet-4-6`) |
| Database / realtime | Supabase (optional — falls back to mock data) |
| Fonts | Geist (body), Instrument Serif (headings) |

## Architecture

Two services: Next.js frontend (`frontend/`) and FastAPI backend (`backend/`). The frontend polls the backend; no direct Supabase calls from the frontend yet.

```
backend/
  main.py              # FastAPI app, all endpoints
  matchmaker.py        # AI scoring engine + mock fallback
  mock_data.json       # 15 demo attendee profiles
  simulate_locations.py

frontend/src/
  app/
    page.tsx                    # login / profile picker
    tribe/[userId]/page.tsx     # main attendee view
    host/page.tsx               # host dashboard
    globals.css                 # CSS design tokens + keyframes
    layout.tsx                  # font loading (Geist + Instrument Serif)
  components/
    ProfileCard.tsx    # match card (score, reason, conversation starters)
    EventMap.tsx       # CSS div-zone map with animated dots
    LoadingScreen.tsx  # "Agent working" skeleton animation
    TopBar.tsx         # sticky top bar
    TabBar.tsx         # fixed bottom tab bar
    AlertStrip.tsx     # dismissable amber alert
    ZoneScroll.tsx     # horizontal zone pill selector; exports ZONE_LABELS
  lib/
    api.ts             # all backend fetch calls
  types/
    index.ts           # Attendee, TribeMatch, Zone, ZonePosition
```

Key API endpoints: `POST /match/{user_id}`, `POST /location/{user_id}?zone=`, `GET /locations`, `GET /event/overview`.

Five zones used throughout: `entrance`, `main_hall`, `workshop`, `chill_zone`, `outside`.

## Build & run commands

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload          # http://localhost:8000

# Backend (if nix is available)
nix-shell -p python3 python3Packages.fastapi python3Packages.uvicorn python3Packages.httpx python3Packages.anthropic python3Packages.pydantic python3Packages.python-dotenv --run "uvicorn main:app --reload"

# Frontend
cd frontend
npm install
npm run dev                        # http://localhost:3000
npm run build                      # production build — run this to catch TS errors

# Simulate live locations
cd backend && python simulate_locations.py
```

There is no test suite yet. Verify changes manually via the browser and the FastAPI docs at `http://localhost:8000/docs`.

## Coding conventions

- **Styling:** components use inline `style` props with CSS variables (`var(--green)`, `var(--card)`, etc.) rather than Tailwind class names. This is intentional — the design token system lives in `globals.css`.
- **Fonts:** reference `var(--font-instrument-serif), serif` and `var(--font-geist-sans), sans-serif` in style props; never import fonts directly in components.
- **Zone keys:** always use the snake_case form (`main_hall`, `chill_zone`) in code and API calls. Display labels come from `ZONE_LABELS` exported by `ZoneScroll.tsx`.
- **New pages:** use `"use client"` directive; Next.js 16 App Router with async params (`use(params)` pattern — see existing pages).
- **API calls:** add new backend calls to `lib/api.ts`, not inline in components.

## Common mistakes

- **Moving the `supabase` import:** `from supabase import create_client` in `main.py` must stay inside the `if url and key:` block. Moving it outside crashes the server when the package isn't installed.
- **Removing the mock matchmaking fallback:** `_mock_match()` in `matchmaker.py` is what makes the app work without an `ANTHROPIC_API_KEY`. Do not delete it.
- **Empty tribe list:** almost always means the Claude API call is silently failing. Check the key is set, or verify the mock fallback path is reached.
- **Next.js 16 API changes:** params are now a Promise; use `use(params)` to unwrap. Font imports changed. Read `node_modules/next/dist/docs/` before touching routing or font code.
- **Demo user IDs:** the profile picker hardcodes `usr_001`, `usr_002`, `usr_003`, `usr_006`, `usr_015` — these must exist in `mock_data.json`.

## Links to deeper docs

- `CLAUDE.md` — full environment variable reference and architecture notes
- `PRD.md` — product requirements and feature scope
- `TEAM_BRIEF.md` — team context and hackathon brief
- `frontend/AGENTS.md` — Next.js-specific agent rules
- `findmytribe.html` — original single-file UI prototype (source of truth for visual design)
