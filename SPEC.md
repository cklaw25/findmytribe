# FindMyTribe — Build Checklist

## Phase 1 — Foundation (Fri 5–10pm)

- [ ] `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- [ ] `cp .env.example .env` → paste Anthropic API key
- [ ] Test `match_two_profiles()` with 2 mock profiles — confirm JSON returns `score`, `reason`, `talking_points`
- [ ] Create Supabase project at supabase.com — name: `findmytribe`
- [ ] Paste SQL schema from `TEAM_BRIEF.md` into Supabase SQL Editor and run it
- [ ] Share `SUPABASE_URL`, anon key, service_role key in group chat
- [ ] `uvicorn main:app --reload` → `curl POST /location/usr_001?zone=main_hall` → confirm 200
- [ ] `cd frontend && npm install && npm run dev` → confirm localhost:3000 loads

## Phase 2 — Integration (Fri 10pm–Sat 2am)

- [ ] Verify Supabase Realtime: insert a row in dashboard → confirm it appears live
- [ ] Tune Claude prompt in `matchmaker.py` — make `talking_points` more specific and punchy (test with `usr_001` vs `usr_002`)
- [ ] Test all 5 demo users via `curl POST /match/usr_XXX` — flag any bad/generic matches
- [ ] `seed_profiles.py` — reads `mock_data.json`, upserts each profile into Supabase `profiles` table. Run it.
- [ ] `python simulate_locations.py` → confirm zone changes appear in Supabase `locations` table
- [ ] With backend + simulator running, open frontend map tab → confirm dots move every ~8s
- [ ] Load app as `usr_001` → confirm tribe list loads (8 cards render)
- [ ] Confirm EventMap dots appear for tribe members
- [ ] Tap zone buttons → confirm `POST /location` fires → dot moves on map
- [ ] Deploy backend to Railway: `npm install -g @railway/cli && railway login && railway init && railway up`
- [ ] Set Railway env vars: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- [ ] Deploy frontend: `cd frontend && npx vercel --prod` → set `NEXT_PUBLIC` env vars in Vercel
- [ ] Open deployed Vercel URL on actual phone → test full flow

## Phase 3 — Main Build (Sat 8am–6pm)

- [ ] Polish `ProfileCard`: expand/collapse on tap, mutual friend badge, `match_type` label visible
- [ ] Polish `EventMap`: smooth dot transitions, highlight on "Find on map" tap
- [ ] Polish `/host` dashboard — zone bar chart, attendee grid, auto-refresh every 10s
- [ ] Add loading skeleton states to tribe page (replace spinner with skeleton cards)
- [ ] Add empty state if `tribeList.length === 0`
- [ ] Run full demo walkthrough end-to-end on phone (deployed URL): login → tribe list → find on map → check in zone → host dashboard
- [ ] Confirm Railway + Vercel URLs both work
- [ ] Run `simulate_locations.py` pointing at production Supabase (set env vars)
- [ ] Update app title in `layout.tsx` and favicon

## Phase 4 — Polish (Sat 6pm–10pm)

- [ ] Full demo walkthrough on phone at deployed URL — note anything that jars, fix it
- [ ] Confirm Railway backend + Vercel frontend are live and talking to each other
- [ ] Practice full demo on deployed URL (not localhost)
- [ ] Check `.env.example` and `frontend/.env.local.example` exist with no real keys committed

## Phase 5 — Submission (Sun 8am–12pm)

- [ ] Final `git push` → confirm repo is public on GitHub
- [ ] Verify README has video link + live app URL
- [ ] Submit on platform (link in Discord #announcements) — deadline Sun 12pm
