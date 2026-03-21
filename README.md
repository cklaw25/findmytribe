# 🔮 FindMyTribe

> Find your people. Right now. In this room.

## What is it?

FindMyTribe is an AI-powered social OS for networking events. It uses an AI agent to match attendees by interests and mutual connections, shows where they are in real-time on an event map, and gives you AI-generated conversation starters so you can walk up with confidence.

## Demo

<!-- Add links after recording -->
- [Video Pitch]()
- [Live App]()

## Tracks

- **Primary: AI Agents** — The matchmaking engine is an autonomous AI agent (perceive → reason → act)
- **Secondary: Onchain AI**

## Tech Stack

| Layer | Tech |
|-------|------|
| AI Matchmaking | Claude API (claude-sonnet-4-6) |
| Backend | Python + FastAPI |
| Frontend | TypeScript + Next.js (PWA) |
| Database + Realtime | Supabase |
| Location (stretch) | ESP32 BLE beacons |

## Running locally

Both keys are **optional** for local dev — the app falls back to mock data without them.

### 1. Backend (FastAPI, port 8000)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend (Next.js, port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Simulate live locations (optional, for demo)

```bash
cd backend
python simulate_locations.py
```

Moves random attendees between zones every 8s so the live map animates.

## Environment Variables

All optional — the app runs in demo mode without them.

```env
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...        # enables real AI matchmaking (otherwise uses interest overlap scoring)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000   # default, only change if backend is on a different port
```

## Team

Built at Encode Club AI London 2026 🇬🇧
