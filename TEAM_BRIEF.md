# FindMyTribe — Team Brief
### Encode Club AI London 2026 | March 20–22 | Encode Hub, Shoreditch

---

## THE IDEA (30 seconds)

**FindMyTribe** is an AI-powered social OS for networking events.

- The **organiser** gets a live dashboard — all attendees, their zones, a social graph.
- Each **attendee** gets an AI agent on their phone that finds who they should meet, shows where those people are in real-time on a map, and gives them conversation starters.

> "You walk into a room of 200 strangers. FindMyTribe shows you the 8 people you should meet, where they're standing right now, and what to say."

---

## TEAM ROLES

| Person | Role | Owns |
|--------|------|------|
| Dev 1 | Backend / AI | `backend/matchmaker.py`, Claude API, `/match` endpoint |
| Dev 2 | Backend / Infra | Supabase setup, location WebSockets, `/location` endpoints, ESP32 (stretch) |
| Dev 3 | Frontend | Next.js PWA — tribe list page, event map, profile cards, host dashboard |
| Pitcher | Product / Pitch | Slide deck, video pitch, demo script, README polish |

---

## REPO STRUCTURE

```
C:\findmytribe\               ← root (also on GitHub)
├── backend/
│   ├── main.py               ← FastAPI server — all API endpoints
│   ├── matchmaker.py         ← Claude AI matchmaking engine
│   ├── mock_data.json        ← 15 realistic fake attendee profiles
│   ├── simulate_locations.py ← Animates people moving zones (for demo)
│   ├── requirements.txt
│   └── .env.example          ← copy to .env and fill keys
└── frontend/
    ├── src/app/page.tsx                  ← Login / demo profile picker
    ├── src/app/tribe/[userId]/page.tsx   ← Attendee view: tribe list + map
    ├── src/app/host/page.tsx             ← Organiser dashboard
    ├── src/components/ProfileCard.tsx    ← Match card with talking points
    ├── src/components/EventMap.tsx       ← Live zone map
    ├── src/lib/api.ts                    ← All backend API calls
    ├── src/lib/supabase.ts               ← Supabase realtime client
    ├── src/types/index.ts                ← Shared TypeScript types
    └── .env.local.example               ← copy to .env.local and fill keys
```

---

## GETTING STARTED (each dev does this once)

### Prerequisites
- Node.js 20+ → https://nodejs.org
- Python 3.11+ → https://python.org
- Git

### Clone & install

```bash
git clone https://github.com/YOUR_ORG/findmytribe.git
cd findmytribe
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# → Open .env and paste the Anthropic API key + Supabase keys (get from team lead)
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
# → Open .env.local and paste Supabase keys (get from team lead)
```

---

## RUNNING LOCALLY

Open 3 terminals:

```bash
# Terminal 1 — backend API
cd backend && source venv/Scripts/activate && uvicorn main:app --reload
# → Runs at http://localhost:8000
# → API docs at http://localhost:8000/docs

# Terminal 2 — frontend
cd frontend && npm run dev
# → Runs at http://localhost:3000

# Terminal 3 — location simulator (run during demos)
cd backend && source venv/Scripts/activate && python simulate_locations.py
# → Animates attendees moving between zones every 8s
```

---

## KEY API ENDPOINTS

| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | `/attendees` | List all mock attendees |
| POST | `/match/{user_id}` | Run AI matchmaking → returns top 8 tribe matches |
| POST | `/location/{user_id}?zone=main_hall` | Update user's zone |
| GET | `/locations` | All current locations |
| GET | `/event/overview` | Host dashboard data |

**Test it immediately:**
```bash
curl -X POST http://localhost:8000/match/usr_001
```

---

## ENV KEYS NEEDED

Everyone needs these — team lead shares them on Discord/WhatsApp:

```
# backend/.env
ANTHROPIC_API_KEY=             ← Get from team lead or Anthropic console
SUPABASE_URL=                  ← From Supabase project settings
SUPABASE_SERVICE_KEY=          ← From Supabase project settings (service_role key)

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=      ← Same as above
NEXT_PUBLIC_SUPABASE_ANON_KEY= ← From Supabase project settings (anon key)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## SUPABASE SETUP (Dev 2 does this once)

1. Go to https://supabase.com → create new project → name it `findmytribe`
2. Go to SQL Editor → run this:

```sql
create table profiles (
  id text primary key,
  name text, role text, company text, bio text,
  interests text[], goals text, twitter text, github text,
  past_events text[], mutual_friend_ids text[],
  created_at timestamptz default now()
);

create table locations (
  user_id text primary key references profiles(id),
  zone text default 'entrance',
  updated_at timestamptz default now()
);

create table tribe_list (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id),
  match_id text references profiles(id),
  score float, reason text, talking_points text[],
  match_type text, source text,
  generated_at timestamptz default now()
);

alter publication supabase_realtime add table locations;
```

3. Go to Project Settings → API → copy `URL`, `anon key`, `service_role key` → share with team

---

## HACKATHON TRACKS TO WIN

- **Primary: AI Agents** — Our matchmaking IS an autonomous AI agent (perceive → reason → act loop)
- **Secondary: Onchain AI** — Can add wallet-based identity + soulbound connection tokens

**Pitch frame:** "Not a chatbot. An autonomous social navigator that finds your people."

---

## DEMO FLOW (for pitcher)

1. Open app on phone at `localhost:3000` (or deployed URL)
2. Select **"Aisha Patel"** as demo user
3. Show the loading screen: "AI is analysing all attendees"
4. Show **Tribe List** — 8 cards with match %, reason, talking points
5. Tap **"Find on map"** on top match → switches to map view, person highlighted
6. Switch back to list → tap a card to expand all 3 talking points
7. Show zone check-in buttons → tap "Workshop" → dot moves on map
8. Switch to **Host Dashboard** (`/host`) → show the real-time organiser view

**Total demo time: ~90 seconds**

---

## TIMELINE AT A GLANCE

| Time | Phase | Goal |
|------|-------|------|
| Fri 5–10pm | Foundation | Backend running, Claude returning matches, frontend scaffold |
| Fri 10pm–Sat 2am | Integration | Front-to-back connected, map shows live updates |
| Sat 8am–6pm | Main Build | Full demo flow, host dashboard, mobile polish |
| Sat 6–10pm | Polish | End-to-end demo rehearsal, README, video prep |
| Sun 8am–12pm | Submission | Record video, push to GitHub, submit |

**Submission deadline: Sunday March 22, 12:00pm**
Submit at: Encode Club platform (check Discord for link)
Deliverables: GitHub repo (public) + video pitch (YouTube/Loom link)

---

## ON ARRIVAL AT VENUE

1. Join Encode Club Discord immediately
2. Check `#announcements` and `#sponsor-challenges` for 2026-specific APIs + bounties
3. Book a mentor slot for Saturday morning
4. Confirm Anthropic API key situation (sponsor credits or BYOK)

---

## STRETCH FEATURES (only if ahead of schedule)

- **ESP32 BLE lanyard** — passive location tracking without user scanning QR
- **QR zone stations** — print QR codes, stick on venue walls, attendees scan to check in
- **Onchain identity** — wallet sign-in + soulbound "we met" token
- **Post-event follow-up** — AI-drafted intro message after the event

---

*FindMyTribe | Encode Club AI London 2026 | Built with Claude API + Supabase + Next.js*
