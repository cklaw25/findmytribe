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

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Simulate live locations (for demo)

```bash
cd backend
python simulate_locations.py
```

## Environment Variables

```env
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Team

Built at Encode Club AI London 2026 🇬🇧
