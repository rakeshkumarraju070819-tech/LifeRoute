# The Ambulance That Couldn't Wait
### AI-Powered Emergency Routing & Hospital Intelligence
> **Emergency Response Intelligence System** — Hackathon Project Documentation

---

## 1. Problem Statement & Core Issues

### The Problem

Emergency ambulances operate under extreme time pressure. In a critical situation, reaching the patient quickly is only the first challenge — the ambulance must also reach a hospital that can immediately provide the required treatment. When these two decisions are made separately, without shared context, avoidable delays occur.

Traditional navigation systems answer *"How do I get from A to B?"* They do not consider the full emergency picture: the type and severity of the emergency, live road conditions, ambulance travel time, or the hospital's current ability to receive and treat the patient.

**The real problem is not finding the shortest route. It is making the best emergency decision when every minute matters.**

---

### Core Issues

#### Issue 1 — Traffic Gridlock & Delayed Arrivals
Congested streets, road closures, accidents, and construction can prevent ambulances from reaching patients quickly. A route that was clear two minutes ago may now be the worst option. Without live traffic awareness, crews follow outdated plans.

#### Issue 2 — Overwhelmed or Unsuitable Hospitals
The nearest hospital is not always the right hospital. A cardiac emergency needs a cardiac unit. A trauma case needs a trauma bay. A facility may be geographically close but have no ICU capacity, no relevant specialist, or no available emergency beds. Sending a patient there creates a dangerous secondary delay.

#### Issue 3 — Incomplete Dispatch Information
Dispatchers and crews often make critical routing decisions with partial, changing information. Route and hospital selection are treated as separate decisions when they are fundamentally connected. The route taken determines the ETA; the ETA affects which hospital is still viable.

#### Issue 4 — No Continuous Reassessment
A single recommendation made at dispatch becomes outdated the moment conditions change. Traffic worsens. A hospital fills up. A road closes. Without continuous reassessment, the system provides one good answer at one moment — not the right answer throughout the journey.

---

### One-Line Definition

> Build an intelligent emergency response system that dynamically recommends the fastest practical ambulance route and the most suitable available hospital by considering the emergency type, live traffic and road conditions, and current hospital capacity — and continuously reassesses that recommendation as conditions change.

---

## 2. System Architecture & Tech Stack

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Operator / Ambulance User        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│     React + TypeScript Dashboard         │
│   (Role-based: Crew / Dispatcher / Hospital) │
└──────────────────┬──────────────────────┘
                   │  REST + WebSocket
┌──────────────────▼──────────────────────┐
│        Node.js + Express Backend         │
│  ┌────────────┬──────────┬────────────┐  │
│  │ Emergency  │Ambulance │  Hospital  │  │
│  │ Management │Management│ Management │  │
│  ├────────────┴──────────┴────────────┤  │
│  │   Route Integration  │   Auth/RBAC │  │
│  ├──────────────────────┴────────────┤  │
│  │       WebSocket Gateway            │  │
└──┴────────────────────────────────────┴──┘
          │              │            │
┌─────────▼──┐   ┌───────▼───┐  ┌────▼──────────┐
│ PostgreSQL  │   │   Redis   │  │ Decision Engine│
│  + PostGIS  │   │  (cache)  │  │ Weighted Score │
└─────────────┘   └───────────┘  └───────────────┘
                   │
     ┌─────────────▼──────────────┐
     │  Recommendation Result      │
     │  Route + Hospital + ETA     │
     │  + Human-Readable Reason    │
     └─────────────┬──────────────┘
                   │ WebSocket push
     ┌─────────────▼──────────────┐
     │  Live Dashboard Update      │
     │  (all connected clients)    │
     └────────────────────────────┘
```

---

### Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React + TypeScript + Tailwind CSS | Type-safe, role-specific dashboards with minimal render latency |
| **Mapping** | TomTom Maps SDK + MapLibre GL | Live route, traffic, ambulance, and hospital visualisation |
| **Backend** | Node.js + Express | REST APIs for emergency coordination, RBAC, and orchestration |
| **Decision Engine** | Explainable weighted scoring | Route and hospital scoring with configurable weights and human-readable reasons |
| **Real-Time** | WebSockets / Socket.IO | Instant push of route updates, status changes, and capacity shifts to all clients |
| **Database** | PostgreSQL + PostGIS | Structured emergency data with native geographic distance and query support |
| **Cache** | Redis *(optional)* | Sub-millisecond reads for fast-changing state — positions, scores, hospital load |
| **Deployment** | Vercel + Railway / Render | Frontend on Vercel; backend and database on Railway or Render |

---

### Decision Engine Design

The decision engine uses transparent, configurable weighted scoring — not a black-box ML model. Every recommendation includes a reason the crew or dispatcher can read and trust.

**Route Score** = weighted sum of:
- Estimated travel time
- Traffic severity index
- Road disruption / closure status
- Distance from ambulance to pickup
- Emergency priority level

**Hospital Score** = weighted sum of:
- Required medical capability match (cardiac, trauma, ICU, neurology)
- Available ICU and emergency bed capacity
- Emergency department status
- Estimated travel time from pickup to hospital
- Distance
- Current hospital load

For critical emergencies, travel time and medical capability automatically receive higher weight. Weights are configurable without code changes.

---

### Real-Time Event Flow

```
1. Ambulance departs on recommended route
2. Road blockage detected → backend receives event
3. Affected route marked degraded
4. Decision engine recalculates all candidate routes
5. Best new route selected
6. WebSocket pushes update to all connected dashboards
7. Crew and dispatcher see new route + ETA immediately
                           ↓
          (If hospital capacity also changes)
8. Hospital re-evaluated against new ETA and current capacity
9. If better option exists → recommendation updated with reason
10. WebSocket pushes hospital update to all clients
```

---

## 3. Role-Based Interfaces & Permissions

### Common Dashboard Structure

All three dashboards share:
- Left sidebar with role-specific navigation
- Top header with page title, notification bell, live connection status, user name, role badge, and logout
- Real-time indicator: 🟢 **Live System Connected** / 🔴 **Connection Lost**

---

### 🚑 Ambulance Crew Dashboard

**Purpose:** Help the crew respond to an assigned emergency and reach the correct hospital as quickly as possible.

**Can VIEW:**
- Own ambulance status, ID, and current GPS location
- Assigned emergency — type, severity, pickup location, ETA, dispatch time
- Live map — ambulance position, pickup, recommended route, alternative route, destination hospital, traffic, road closures
- AI hospital recommendation — name, ETA, emergency dept status, ICU availability, specialty availability
- Route alerts — congestion detected, road closure, route recalculated, hospital capacity changed

**Can UPDATE:**
- Own ambulance status: `AVAILABLE` → `ACCEPTED` → `EN ROUTE` → `AT HOSPITAL` → `OFF DUTY`
- Emergency workflow actions: Accept → Confirm Pickup → Patient Picked Up → Arrived at Hospital → Complete
- Select alternative route if system provides one

**Cannot:**
- Edit hospital capacity or ICU availability
- Assign or modify another ambulance
- Create or cancel emergencies
- Modify the routing algorithm

---

### 🚨 Dispatcher Dashboard

**Purpose:** Coordinate emergencies, ambulances, and hospitals in real time across the full fleet.

**Can VIEW:**
- KPI cards — active emergencies, available ambulances, active ambulances, hospitals available, critical count
- All active emergencies table — ID, type, severity, location, assigned ambulance, status, ETA, hospital, created time
- Full ambulance fleet — ID, status, location, assigned emergency, crew, ETA, last update
- Live city map — all ambulances, emergency locations, hospital locations, routes, traffic, incidents
- Hospital capacity overview — all facilities, emergency dept, ICU, trauma, cardiac, incoming ambulances

**Can UPDATE:**
- Create, edit, and cancel emergencies
- Set emergency type, severity, pickup location, and status
- Assign, reassign, and cancel ambulance assignments
- Send operational notes and instructions to crew

**Cannot:**
- Edit hospital bed counts or ICU capacity directly (Hospital Staff owns this)
- Modify ambulance GPS coordinates
- Change the routing algorithm

---

### 🏥 Hospital Staff Dashboard

**Purpose:** Maintain accurate emergency capacity so the decision engine always has correct data.

**Can VIEW:**
- Own hospital overview — name, status, emergency dept status, occupancy, ICU occupancy
- Capacity breakdown — general beds, ICU beds, emergency dept, trauma unit, cardiac unit (available / total)
- Incoming ambulances table — ambulance ID, emergency ID, type, severity, ETA, route status
- Emergency readiness panel — dept readiness with 🟢 Available / 🟡 Limited / 🔴 Full indicators

**Can UPDATE:**
- General bed and ICU bed counts (available and total)
- Emergency department, ICU, trauma, and cardiac availability
- Hospital operational status: `AVAILABLE` / `BUSY` / `FULL`
- Accept or pause incoming ambulance assignments with a reason

**Cannot:**
- Assign ambulances or modify GPS
- Modify another hospital's data
- Access dispatcher fleet controls
- Change emergency routing

---

### Role-Based Access Matrix

| Feature | Ambulance Crew | Dispatcher | Hospital Staff |
|---|---|---|---|
| View own profile | ✅ View + Edit | ✅ View + Edit | ✅ View + Edit |
| View active emergency | Assigned only | All | Incoming only |
| Create emergency | ❌ | ✅ | ❌ |
| Accept / update emergency status | ✅ | ✅ | ❌ |
| Assign ambulance | ❌ | ✅ | ❌ |
| Reassign ambulance | ❌ | ✅ | ❌ |
| View ambulance fleet | Own only | All | Incoming only |
| View routes and ETA | Own only | All | Incoming only |
| View hospital capacity | Recommended | All | Own only |
| Update hospital capacity | ❌ | ❌ | ✅ |
| Accept incoming ambulance | ❌ | ❌ | ✅ |
| Manage hospital status | ❌ | ❌ | ✅ |
| View AI recommendation | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ |

---

## 4. Feature Tiers

### Tier 1 — Mandatory Core *(must be working)*

These form the minimum complete solution. Without all of these, the core problem is not being solved.

- **Emergency Registration** — capture case, patient info, emergency type, and priority
- **Emergency Type & Priority** — identify category and severity: Critical / Serious / Moderate
- **Patient & Ambulance Location** — pinpoint both positions on the map
- **Route Recommendation** — evaluate available routes and recommend the fastest practical option
- **Traffic & Road Conditions** — account for congestion, construction, accidents, and closures
- **Hospital Recommendation** — recommend appropriate hospital, not merely nearest
- **Emergency-to-Hospital Matching** — match type to capabilities: cardiac, trauma, ICU, neurology
- **Hospital Capacity Check** — consider ICU beds, emergency dept status, and available resources
- **ETA Display** — show estimated travel time for route and hospital
- **Clear Recommendation** — present route + hospital + reason clearly enough for immediate action

> ✅ Tier 1 success: a complete emergency case can be entered, routes and hospitals compared, and a sensible recommendation produced based on needs, road conditions, and capacity.

---

### Tier 2 — Strongly Recommended *(should be working)*

These make the solution intelligent, adaptive, and clearly different from a basic map or directory.

- **Dynamic Route Recalculation** — recalculate route when traffic or road conditions change
- **Hospital Re-evaluation** — reassess destination if selected hospital's capacity changes mid-route
- **Explainable Recommendation** — clearly explain why this route and hospital were chosen, and why alternatives were not
- **Live Emergency Alerts** — notify when a major route or hospital condition changes
- **Ambulance Tracking** — show current position, destination, and continuously updated ETA
- **Multiple Route Comparison** — display alternatives with distance, traffic condition, and ETA
- **Hospital Status Dashboard** — emergency status, ICU availability, specialist services, current load
- **Decision Scoring** — consistent ranking combining travel time, traffic, road conditions, hospital suitability, and capacity

> ✅ Tier 2 success: the system feels like an emergency decision-support platform, not a navigation app. It explains and adapts its decisions.

---

### Tier 3 — Advanced / Wow Factor *(optional)*

These are not required for the core solution. Implementing one or two of them well creates a strong impression at judging. Better to do one properly than add several unfinished ones.

- **Live Situation Simulation** — simulate a new road blockage, traffic surge, or hospital capacity change and show the system adapting in real time
- **Predictive ETA** — estimate how travel time may change based on expected traffic, not just current conditions
- **Hospital Load Balancing** — when multiple hospitals are suitable, distribute patients to avoid concentration at one facility
- **Ambulance Assignment Optimisation** — recommend which available ambulance to dispatch based on location, suitability, and ETA
- **Advanced Emergency Prioritisation** — use urgency as an explicit factor across all route and hospital decisions
- **AI Decision Assistant** — natural-language explanation: *"A farther hospital was selected because City General's ICU reached capacity 4 minutes ago"*
- **Historical Analytics** — response trends, average travel time, hospital load, route delay heatmaps
- **Command-Centre View** — all active emergencies, ambulances, routes, hospital statuses, alerts, and recommendations in one screen

> ✅ Tier 3 success: the project demonstrates advanced intelligence, simulation, or operational coordination beyond the basic routing requirement.

---

## 5. API & Environment Setup

### Required External Services

| Key | Required | Purpose |
|---|---|---|
| `TOMTOM_API_KEY` | ✅ Yes | Maps SDK, Routing API, Traffic API, Geocoding, Matrix Routing |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `JWT_SECRET` | ✅ Yes | Token signing — use a long random string in production |
| `API_PORT` | No | Backend port, defaults to `8787` |
| `CLIENT_ORIGIN` | No | Allowed CORS origin for production |
| `AI_API_KEY` | No | Optional — only needed for AI explanation assistant (Tier 3) |

### Environment File

Copy `.env.example` to `.env` in the project root:

```env
TOMTOM_API_KEY=your_tomtom_key_here
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=replace_with_a_long_random_secret
API_PORT=8787
CLIENT_ORIGIN=http://localhost:5173
AI_API_KEY=optional_ai_key
```

> ⚠️ Never commit `.env` to version control. Never expose `TOMTOM_API_KEY` in frontend source code or browser DevTools. The backend proxies all TomTom requests so the key stays server-side only.

---

### TomTom APIs Used

| API | Used For |
|---|---|
| Map Display API | Render ambulance, patient, hospitals, routes, and traffic overlay |
| Routing API | Calculate fastest route, alternative routes, distances, and ETAs |
| Traffic API | Detect traffic flow and incidents for dynamic route decisions |
| Geocoding API | Convert entered addresses to coordinates |
| Reverse Geocoding API | Convert ambulance/patient coordinates to readable addresses |
| Matrix Routing API | Compare travel times from one ambulance to multiple hospitals simultaneously |

The free TomTom evaluation tier covers all of these. No credit card is required for the free evaluation. Always verify current limits on the TomTom pricing page before submission as limits can change.

---

### Running the Project

```bash
# Install dependencies
npm install

# Start both Vite frontend (port 8443) and Express backend (port 8787)
npm run dev:full

# Frontend only
npm run dev

# Backend only
npm run server
```

**Stopping the backend (Git Bash):**
```bash
fuser -k 8787/tcp
```

**Stopping the backend (PowerShell):**
```powershell
$p = netstat -ano | Select-String ":8787 " | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1
if ($p) { Stop-Process -Id $p -Force }
```

**If Vite cache causes map issues (maplibre-gl worker error):**
```bash
rm -rf node_modules/.vite
npm run dev:full
```

---

### Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `users` | Operator identity and role |
| `ambulances` | ID, status, coordinates, assigned emergency |
| `emergencies` | Type, priority, patient location, status, timestamps |
| `hospitals` | ID, coordinates, emergency status, capabilities |
| `hospital_resources` | ICU, beds, cardiac, trauma, neurology availability |
| `routes` | ETA, distance, traffic status, availability |
| `recommendations` | Selected route, selected hospital, score, reason, timestamp |
| `emergency_events` | Traffic changes, route blocks, hospital status changes, recalculation log |

---

## 6. Known Limitations

| Limitation | Detail |
|---|---|
| Simulated hospital data | Availability is seeded from local storage — not pulled from a live EHR or real capacity system |
| Traffic data lag | Relies on TomTom's API; highly localised events may not appear immediately or at all |
| No ML model | Decision engine uses manually configured weighted scoring — weights do not learn from outcomes |
| No predictive ETA | Estimates based on current traffic only; time-of-day or historical patterns not modelled |
| Read-only map for crews | No bidirectional GPS telemetry push from vehicle hardware to the dashboard |
| Session auth only | localStorage-based JWT tokens — not hardened for production deployment |
| Basic fleet coordination | No optimised multi-ambulance dispatch algorithm; nearest available is assigned |
| Redis not wired | Cache layer is included in the stack but all state currently served from PostgreSQL |
| No offline mode | Frontend requires backend connectivity; no service-worker cache fallback |

> These are acceptable constraints for a hackathon prototype. The architecture is designed so each limitation can be addressed independently without rewriting the system.

---

## 7. Future Vision & Demo Flow

### Future Vision

The current system demonstrates the core loop: receive emergency → score routes and hospitals → recommend with reason → adapt when conditions change. The next evolution adds prediction, learning, and deeper integration.

**Short-Term (next sprint)**
- Predictive ETA using time-of-day traffic patterns, not just current conditions
- Real GPS telemetry from ambulance hardware to the dispatcher map
- Hospital load balancing — distribute patients across suitable facilities automatically
- Redis cache fully wired to reduce PostgreSQL load on rapidly changing state

**Medium-Term**
- ML-based route scoring trained on historical response-time data — weights that improve from every completed emergency
- EHR integration to pull real hospital capacity rather than relying on manual staff updates
- Ambulance assignment optimisation — factor in crew experience, vehicle equipment, and patient type alongside ETA
- Offline-capable crew dashboard with service-worker cache for poor-connectivity environments

**Long-Term**
- Natural-language AI assistant: *"Route B was chosen. Route A is 0.4 km shorter but a collision was reported 6 minutes ago and the average clearance time for this intersection is 18 minutes."*
- Command-centre analytics — response trend heatmaps, average ETA by district, hospital saturation forecasts
- Multi-agency coordination — share emergency state across city departments, police, and fire services on one platform
- Predictive hospital capacity — flag when a hospital is likely to reach ICU capacity before the ambulance arrives based on current trajectory

---

### Demo Flow for Judges

The strongest demonstration shows the system making a *connected, adaptive emergency decision* — not just routing or displaying a map.

```
Step 1 — Create Emergency
        Cardiac arrest, rush hour, multiple hospitals visible on map

Step 2 — Show Multiple Routes
        System recommends a slightly longer road that avoids congestion
        Shortest route displayed but not recommended — ETA is higher

Step 3 — Show Hospital Selection
        Nearest hospital excluded — ICU at capacity
        Second-nearest selected with full explanation displayed

Step 4 — Read the Explanation
        "City Care Hospital: cardiac unit available, ICU available, ETA 11 min.
         General Hospital excluded: ICU reached capacity 4 min ago."

Step 5 — Simulate Road Blockage
        Trigger a new road closure on the current recommended route

Step 6 — Show Live Recalculation
        System selects new route, pushes update to all dashboards instantly
        Crew and dispatcher see updated route and new ETA — no page refresh

Step 7 — Change Hospital Capacity
        Mark the selected hospital as FULL via Hospital Staff dashboard

Step 8 — Show Re-evaluation
        System automatically reassigns to next-best hospital
        New explanation displayed with updated reason and ETA
```

**Key messages to land with judges:**
- The system does not make one decision at dispatch — it makes the right decision continuously
- Route and hospital are scored together, not separately
- Every recommendation has a reason a human can read and trust
- All three dashboards update in real time from a single event — no refresh, no polling delay

---

*The Ambulance That Couldn't Wait — Emergency Response Intelligence System*
*Hackathon Project · Full Technical Reference*