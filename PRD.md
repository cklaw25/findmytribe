# FindMyTribe Product Requirements Document (YC-Friendly)

## 1) Product Goal and Wedge

FindMyTribe helps a person walk into a room of strangers and immediately know who to meet, where they are, and what to say.

The wedge is real-time, in-event matching with proactive nudges. The core loop is:
- AI builds your tribe list.
- Live location data shows where they are now.
- Proactive alert tells you when a match enters your zone.
- One tap sends a connection intro via Luffa.

## 2) Scope Lock (Single Source of Truth)

This PRD includes only the features listed in the approved screen-by-screen scope:
- Web app delivery only (browser-based, mobile-friendly PWA; no native apps).
- Screen 1: Login/Profile Picker (`/`)
- Screen 2: Tribe List (`/tribe/[userId]`) including proactive AI alert banner
- Screen 3: Live Map (`/tribe/[userId]/map` or map tab)
- Screen 4: Host Dashboard (`/host`)
- Cross-screen loading, empty, and error states
- Luffa bot full integration (tribe list message, proactive alerts, connect intro)

If a feature is not listed above, it is out of scope.

## 3) Dependency-Ordered Build Sequence (No Timelines)

### P0 - Screen 2 Core + Alert Banner (Start Here)
- Header with user name/role, event name, current zone.
- Tap-in zone check-in row with 5 zones and active highlight.
- Tribe list card system for 8 matches.
- Proactive AI alert banner when a match enters your zone.

### P1 - Screen 3 Live Map
- Zone floor plan with labels and per-zone counts.
- Dot system (you/tribe/others), legend, and find-on-map pulse/zoom behavior.

### P2 - Screen 1 Login/Profile Picker
- App branding, event name, and tappable demo profile cards for sign-in-as flow.

### P3 - Screen 4 Host Dashboard
- Top stats, zone chart, attendee grid, social graph, isolated attendees panel.

### P4 - Luffa End-to-End Integration
- Message bot receives tribe list.
- Proactive zone-entry messages.
- Connect button sends intro via Luffa.

### P5 - Loading, Empty, and Error States
- Required states for all screens and network pathways.

## 4) Screen-by-Screen Functional Requirements

## Screen 1 - Login/Profile Picker (`/`)

### Must-Have Requirements
- `S1-FR1` Display app name and tagline: "Find your people. Right now. In this room."
- `S1-FR2` Display event name: "Encode Club AI London 2026."
- `S1-FR3` Display grid of demo attendee cards with:
  - name,
  - role,
  - company,
  - photo placeholder.
- `S1-FR4` Each card must be tappable and sign in as that person.

### Acceptance Criteria
- Selecting a card routes user into their tribe view context.
- All required card fields render without fallback errors.

## Screen 2 - Tribe List (`/tribe/[userId]`)

### Header Bar Requirements
- `S2-FR1` Show current user name + role.
- `S2-FR2` Show event name.
- `S2-FR3` Show current zone text ("You're in: <zone>").

### Zone Check-In Row Requirements
- `S2-FR4` Show exactly 5 tappable zones:
  - Entrance,
  - Main Hall,
  - Workshop,
  - Chill Zone,
  - Outside.
- `S2-FR5` Highlight active zone.
- `S2-FR6` Tapping a zone updates the user's map dot instantly.
- `S2-FR6a` Location tracking for attendees must use manual tap-in zone updates as the primary and required tracking mechanism.

### AI Alert Banner Requirements (Key Feature)
- `S2-FR7` Banner appears unprompted when a tribe match enters the user's current zone.
- `S2-FR8` Banner copy includes match name and zone ("<name> is in Main Hall right now - go say hi").
- `S2-FR9` Banner is dismissable.
- `S2-FR10` Banner uses pulsing animation to attract attention.

### Tribe List Card Requirements (Exactly 8 Cards)
- `S2-FR11` Display exactly 8 match cards.
- `S2-FR12` Each card shows:
  - avatar/photo placeholder,
  - name + role + company,
  - match percent,
  - match type chip (Collaborator, Mentor, Peer, Founder Match),
  - mutual friend badge when applicable,
  - one-line reason.
- `S2-FR13` Each card includes "Find on map" action that switches to map and highlights match dot.
- `S2-FR14` Tapping card expands to reveal all 3 talking points.
- `S2-FR15` Each card includes "Connect" button tied to Luffa intro flow.

### Bottom Tab Bar Requirements
- `S2-FR16` Include two tabs:
  - Tribe List
  - Map

### Acceptance Criteria
- Zone change updates visible zone state and reflected position without page reload.
- Alert banner triggers only on zone-entry condition and can be dismissed.
- "Find on map" opens map view with the selected match visibly highlighted.
- Expanded card always shows exactly 3 talking points.

## Screen 3 - Live Map (`/tribe/[userId]/map` or map tab)

### Must-Have Requirements
- `S3-FR1` Render venue floor plan with 5 zones as simple colored rectangles.
- `S3-FR2` Display zone labels and attendee counts (for example "Main Hall - 12 people").
- `S3-FR3` Render dot semantics:
  - You: red pulsing dot,
  - Your tribe: green named dots,
  - Others: grey anonymous dots.
- `S3-FR4` Display legend for You / Your Tribe / Others.
- `S3-FR5` On "Find on map" from Screen 2, selected target dot pulses and map zooms toward it.
- `S3-FR6` Include back action to return to tribe list.

### Acceptance Criteria
- Dot colors and naming rules match role categories with no ambiguity.
- Highlight/zoom behavior is visible and tied to selected match.
- Back action restores tribe list context for the same user.

## Screen 4 - Host Dashboard (`/host`)

### Top Stats Requirements
- `S4-FR1` Show:
  - total attendees,
  - active right now,
  - number of matches made,
  - most popular zone.

### Zone Heatmap/Bar Chart Requirements
- `S4-FR2` Show one bar per zone with headcount.
- `S4-FR3` Color intensity communicates crowdedness.
- `S4-FR4` Chart updates every 10 seconds.

### Attendee Grid Requirements
- `S4-FR5` Show attendee cards with name, role, company, and current zone.
- `S4-FR6` Show "isolated" badge when attendee is alone in a zone.
- `S4-FR7` Grid auto-refreshes.

### Social Graph Requirements
- `S4-FR8` Display force-directed mutual connection graph.
- `S4-FR9` Nodes represent people; edges represent mutual friend links.
- `S4-FR10` Cluster structure is visible.

### Isolated Panel Requirements
- `S4-FR11` Show list of attendees currently alone in a zone.
- `S4-FR12` Include "Go introduce" prompt for organiser action.

### Acceptance Criteria
- Dashboard updates every 10 seconds without manual refresh.
- Isolated status is consistent between attendee grid and isolated panel.
- Social graph renders using current relationship data.

## 5) Cross-Screen States (Mandatory)

### Loading States
- `UX-FR1` AI analysis loading must show step-by-step text:
  - "Reading profiles..."
  - "Scoring interests..."
  - "Building your tribe..."
- `UX-FR2` Use skeleton card placeholders during list/card loading.

### Empty States
- `UX-FR3` Empty tribe state message: "AI is still analysing - check back in a moment."
- `UX-FR4` No zone data state message: "Be the first to check in."

### Error States
- `UX-FR5` API failures must show friendly error message and retry button.

### Acceptance Criteria
- Every screen has explicit loading, empty, and error handling UI.
- Retry actions call the same failed request and recover when backend is healthy.

## 6) Luffa Bot Full Integration (Must-Have)

### Required Flows
- `LB-FR1` User can message Luffa bot and receive their tribe list in chat.
- `LB-FR2` Luffa proactively messages user when a match enters their current zone.
- `LB-FR3` Pressing "Connect" sends intro via Luffa.

### Required Message Format
- `LB-FR4` Luffa tribe/match message must include:
  - name,
  - role,
  - match percent,
  - one talking point.

### Trigger Requirements
- `LB-FR5` Zone-entry trigger fires when:
  - user zone is known,
  - match zone updates into same zone,
  - match is in that user's tribe list.

### Acceptance Criteria
- Tribe list can be delivered through Luffa chat for signed-in user.
- Proactive Luffa zone-entry notification arrives after qualifying zone event.
- Connect action sends structured intro containing required fields.

## 7) Data and Event Contracts (Only Required Fields)

### Core UI Data Objects
- `UserContext`: userId, name, role, company, currentZone, eventName.
- `TribeCard`: matchId, name, role, company, avatar, matchPercent, matchType, mutualFriend, reasonLine, talkingPoints[3].
- `LocationState`: userId, zone, category (self|tribe|other), updatedAt.
- `HostStats`: totalAttendees, activeNow, matchesMade, mostPopularZone.
- `IsolatedEntry`: userId, name, role, company, zone.

### Event Triggers
- `EVT-1` `zoneChanged(userId, zone)`
- `EVT-2` `matchEnteredUserZone(userId, matchId, zone)` -> drives alert banner + Luffa proactive message.
- `EVT-3` `connectPressed(userId, matchId)` -> drives Luffa intro send.

## 8) Non-Functional Requirements

- `NFR-1` Zone change to UI feedback must feel immediate for demo usage.
- `NFR-2` Dashboard auto-refresh interval is fixed at 10 seconds.
- `NFR-3` Core UI must remain usable on phone (attendee) and laptop/tablet (host).
- `NFR-4` Failures must be recoverable by retry from screen-level error state.

## 9) Out of Scope / Do Not Build

Do not build anything not explicitly listed in this PRD. Specifically out of scope:
- Native mobile apps; this product is web app only.
- Extra screens or navigation paths beyond the 4 listed screens and map tab/back behavior.
- Additional analytics panels or admin tooling not listed under Screen 4.
- Any feature experiments not tied to tribe list, map, host dashboard, loading states, or Luffa flows.
- Unspecified integrations beyond Luffa requirements above.
- Passive hardware tracking implementations (for example BLE beacon-based auto-location) for this scoped build.

## 10) Final Acceptance Checklist

- Screen 2 + alert banner works end-to-end first.
- Screen 3 map behaviors work from Screen 2 actions.
- Screen 1 profile picker signs into correct user context.
- Screen 4 dashboard panels render and refresh every 10 seconds.
- Loading, empty, and error states exist on every screen.
- Luffa flows work end-to-end for tribe message, proactive zone alerts, and Connect intro.
- No unlisted features are included.

