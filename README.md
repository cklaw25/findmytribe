# FindMyTribe

> Find your people. Right now. In this room.

An autonomous AI agent for live networking events. It reads every attendee profile, ranks your best matches by compatibility, shows where they are on a live map, and tells you exactly what to say. When a match enters your zone, it alerts you unprompted — no searching, no scrolling, no luck.

## Demo

- [Video Pitch]() <!-- add YouTube/Loom link before submission -->
- [Live App]() <!-- add Vercel URL before submission -->

## Tracks

- **AI Agents (primary)** — Autonomous PERCEIVE → REASON → ACT → ADAPT loop. No human in the loop.
- **Luffa LuffaNator** — Bot lives inside Luffa: send any message → get tribe list. Bot proactively alerts you when a match enters your zone.
- **Onchain AI (secondary)** — Soulbound "we met" token (stretch)

## How it works

**Attendee view (mobile PWA)**
- AI analyses every attendee profile and builds your Tribe List — top 8 people to meet
- Each card shows: name, role, match %, match type, why you match, 3 personalised talking points
- Live zone map showing where every tribe member is right now
- Zone check-in: tap your area → your dot moves on the map
- Alert fires unprompted when a top match enters your zone
- Invitation system + post-event chat inbox

**Organiser view (`/host`)**
- Real-time stats, zone heatmap, attendee grid, social graph, isolated attendees panel

**Luffa bot**
- Message the bot → receive your tribe list in Luffa chat
- Bot proactively messages you when a match arrives in your zone
- Reply `CONNECT <n>` → AI-drafted intro sent via Luffa

## The AI Agent Loop

```
PERCEIVE  → reads all attendee bios, interests, goals, past events
REASON    → OpenAI GPT-4o batch scoring + embedding pre-filter
ACT       → tribe list + talking points + proactive zone alerts + Luffa messages
ADAPT     → re-ranks continuously as attendees move zones
```

## Tech Stack

| Layer | Tech |
|-------|------|
| AI Matchmaking | OpenAI GPT-4o + text-embedding-3-small |
| Backend | Python 3.12 + FastAPI |
| Frontend | TypeScript + Next.js 16 (PWA — mobile installable) |
| Database + Realtime | Supabase (Postgres + Realtime subscriptions) |
| Messaging | Luffa Bot API |
| Deploy | Railway (backend) + Vercel (frontend) |

## Running locally

### 1. Backend (FastAPI, port 8000)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env.local   # fill in your keys
uvicorn main:app --reload
```

### 2. Frontend (Next.js, port 3000)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Simulate live locations (for demo)

```bash
cd backend
python simulate_locations.py
```

Moves attendees between zones every 8s — makes the map animate for demos.

## Environment Variables

```env
# backend/.env.local
OPENAI_API_KEY=                    # real AI matching (falls back to mock without it)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
LUFFA_BOT_TOKEN=                   # from Luffa bot registration
LUFFA_API_BASE=https://api.luffa.im/v1

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Team

Built at Encode Club AI London 2026
