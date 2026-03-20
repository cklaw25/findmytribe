# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FindMyTribe is an AI-powered social OS for networking events (Encode Club AI London 2026 hackathon). It matches attendees using Claude AI, shows real-time locations on an event map, and generates conversation starters.

## Commands

### Backend (Python + FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload          # http://localhost:8000, docs at /docs
```

### Frontend (Next.js 16 + TypeScript)
```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # eslint
```

### Demo location simulator
```bash
cd backend && python simulate_locations.py   # moves attendees between zones every 8s
```

## Architecture

**Two-service architecture:** Next.js frontend calls a FastAPI backend, which calls the Claude API for matchmaking. Supabase provides persistence and real-time location updates.

### Backend (`backend/`)
- `main.py` — FastAPI app with all endpoints. Lazy Supabase init (works without Supabase keys by falling back to mock data from `mock_data.json`). CORS enabled for all origins.
- `matchmaker.py` — AI matchmaking engine. For each candidate, calls Claude (`claude-sonnet-4-6`) with both profiles and gets back a JSON score, reason, talking_points, and match_type. Boosts score +15 for mutual friends. Returns top 8 matches.
- `mock_data.json` — 15 demo attendee profiles.
- `simulate_locations.py` — Moves random attendees between zones for demo purposes.

**Key API endpoints:**
- `POST /match/{user_id}` — Run AI matchmaking, returns top 8 matches
- `POST /location/{user_id}?zone=...` — Update zone location
- `GET /locations` — All user locations (polled by map)
- `GET /event/overview` — Host dashboard aggregated data

### Frontend (`frontend/`)
Uses Next.js 16 App Router with `"use client"` for interactive pages. Tailwind v4 for styling.

- `src/app/page.tsx` — Profile picker (login screen with 5 demo users)
- `src/app/tribe/[userId]/page.tsx` — Main attendee view: match cards + zone check-in + live map tabs
- `src/app/host/page.tsx` — Host dashboard: stats, zone distribution chart, attendee grid (auto-refreshes)
- `src/components/ProfileCard.tsx` — Match card showing score, talking points, interests, "find on map"
- `src/components/EventMap.tsx` — Canvas-style zone map with colored dots for tribe members, polls every 5s
- `src/lib/api.ts` — Backend API wrapper functions
- `src/lib/supabase.ts` — Supabase client init
- `src/types/index.ts` — Shared TypeScript interfaces (Attendee, TribeMatch, Location)

Path alias: `@/*` maps to `./src/*`.

### Zones
Five venue zones used throughout: `entrance`, `main_hall`, `workshop`, `chill_zone`, `outside`.

## Environment Variables

Backend (`backend/.env`): `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)

## Important Notes

- **Next.js 16 breaking changes:** The frontend AGENTS.md warns that this Next.js version has breaking changes from training data. Read `node_modules/next/dist/docs/` before modifying Next.js-specific code.
- **No auth system** — demo mode with hardcoded users selected from a profile picker.
- **No tests yet** — test manually via browser and FastAPI's auto-generated docs at `/docs`.
- **Supabase is optional for local dev** — the backend gracefully falls back to in-memory mock data when Supabase env vars are missing.
