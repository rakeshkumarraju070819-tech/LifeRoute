# The Ambulance That Couldn't Wait

**AI-Powered Emergency Routing & Hospital Intelligence**

> Every second matters. Every decision saves time.

---

## Problem Statement

Emergency ambulances operate under extreme time pressure. Reaching the patient quickly is only the first challenge — the ambulance must also reach a hospital that can immediately provide the required treatment.

Traditional navigation answers *"How do I get from A to B?"* — it does not account for the full emergency context: the type and severity of the emergency, live road conditions, ambulance travel time, or the hospital's current ability to receive and treat the patient.

**The real problem is not finding the shortest route. It is making the best emergency decision when every minute matters.**

---

## Core Issues

| Issue | Impact |
|---|---|
| Traffic gridlock & road closures | Ambulances follow outdated routes, increasing ETA |
| Nearest hospital ≠ right hospital | Patients arrive at facilities lacking required capability or capacity |
| Static dispatch decisions | No adaptation when conditions change mid-journey |
| Incomplete information for crews | Routing and hospital selection treated as separate, unconnected decisions |

---

## How We Solve It

A single intelligent system that combines route analysis, live traffic, and hospital capacity into one connected decision — continuously reassessed as conditions change.

### Five Core Capabilities

**1. Intelligent Route Selection**
Recommends the fastest *practical* route, not the shortest. A slightly longer road that is clear beats a congested direct route every time.

**2. Live Traffic & Road-Condition Awareness**
Accounts for congestion, construction, accidents, and closures in real time. If a route degrades mid-journey, the system recalculates and pushes the update immediately.

**3. Emergency-Based Hospital Recommendation**
Matches the emergency type to hospital capability — cardiac, trauma, ICU, neurology — rather than defaulting to the nearest facility.

**4. Real-Time Hospital Capacity**
Considers current bed availability, ICU status, and department readiness. A full hospital is excluded from the recommendation even if it is geographically closest.

**5. Continuous Reassessment**
Conditions change while the ambulance is en route. Every change in traffic or hospital capacity triggers a re-evaluation and pushes an updated recommendation to all dashboards via WebSocket.

### Decision Scoring (Explainable — No Black Box)

Every recommendation is produced by a weighted scoring engine with a human-readable reason.

- **Route Score** — travel time · traffic severity · road disruption · distance · emergency priority
- **Hospital Score** — medical capability match · ICU/bed capacity · emergency dept status · ETA · distance · current load

Example output: *"City Care Hospital selected: cardiac capability confirmed, ICU available, ETA 11 min. General Hospital excluded: ICU at capacity."*

---

## Three Role-Based Interfaces

Each dashboard is purpose-built for its operator's decision context.

### 🚑 Ambulance Crew
- Live map with recommended route and alternative
- Active emergency details, severity, and patient priority
- Real-time ETA and assigned hospital information
- One-tap status updates: Accepted → En Route → At Scene → At Hospital

### 🚨 Dispatcher
- Fleet map showing all ambulance positions and statuses
- Emergency queue with priority ranking and assignment controls
- Create, assign, and reassign emergencies in real time
- Hospital capacity overview across all registered facilities

### 🏥 Hospital Staff
- Live bed count, ICU availability, and department readiness
- Incoming ambulance ETA and patient type preview
- Self-service capacity updates that feed directly into the scoring engine
- Toggle availability to accept or pause incoming assignments

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Tailwind CSS | Type-safe, role-specific dashboards |
| Mapping | TomTom Maps SDK / MapLibre GL | Live route, traffic, and hospital visualisation |
| Backend | Node.js + Express | REST APIs, RBAC, service orchestration |
| Decision Engine | Explainable weighted scoring | Route + hospital scoring with configurable weights |
| Real-Time | WebSockets / Socket.IO | Instant push of route updates and capacity shifts |
| Database | PostgreSQL + PostGIS | Structured emergency data + geographic queries |
| Cache | Redis (optional) | Fast reads for ambulance positions and hospital load |
| Deployment | Vercel + Railway / Render | Frontend on Vercel; backend + DB on Railway |

### Environment Variables

```env
TOMTOM_API_KEY=       # Required — Maps, Routing, Traffic, Geocoding
DATABASE_URL=         # Required — PostgreSQL connection string
JWT_SECRET=           # Required — long random value
API_PORT=8787         # Optional — defaults to 8787
CLIENT_ORIGIN=        # Optional — for production CORS
AI_API_KEY=           # Optional — AI explanation assistant only
```

Copy `.env.example` to `.env` and fill in the required values before running.

### Running Locally

```bash
npm install
npm run dev:full      # starts Vite (port 8443) + Express backend (port 8787)
```

To run separately:

```bash
npm run dev           # frontend only
npm run server        # backend only
```

---

## System Architecture

```
Operator / Ambulance User
        |
React + TypeScript Dashboard
        |
Node.js Application Backend
  +-- Emergency Management
  +-- Ambulance Management
  +-- Hospital Management
  +-- Route / Map Integration
  +-- Authentication & RBAC
  +-- Real-Time WebSocket Gateway
        |
 ┌──────┴──────┬──────────────┐
 │             │              │
PostgreSQL   Redis       Decision Engine
+ PostGIS   (cache)    (weighted scoring)
        |
Recommendation: Route + Hospital + ETA + Reason
        |
Live Dashboard Update (all connected clients)
```

### Real-Time Event Flow

1. Ambulance starts on recommended route
2. New road blockage detected → backend receives event
3. Route status updated → decision engine recalculates all candidates
4. Best new route selected → WebSocket pushes update to all dashboards
5. Operator sees new route and ETA immediately — no page refresh needed

---

## Known Limitations

- **Simulated hospital data** — availability is seeded, not pulled from a live EHR or capacity system
- **Traffic data** — relies on TomTom's API; highly localised events may lag or be absent
- **No ML model** — decision engine uses explainable weighted scoring with manually configured weights; no learned model
- **No predictive ETA** — estimates are based on current traffic only; historical patterns not modelled
- **Read-only map for crews** — no bidirectional GPS telemetry push from the vehicle
- **Session auth** — localStorage-based tokens; not hardened for production deployment
- **Basic fleet coordination** — no optimised multi-ambulance dispatch algorithm
- **Redis optional** — all state currently served from PostgreSQL; cache layer not yet wired to production

---

## Future Vision

- **Predictive ETA** — estimate how traffic will change based on time-of-day patterns, not just current conditions
- **Hospital load balancing** — distribute incoming patients across suitable facilities to prevent concentration at one site
- **Ambulance assignment optimisation** — recommend which available unit to dispatch based on location, capability, and ETA
- **ML-based route scoring** — replace static weights with a model trained on historical response-time data
- **Live GPS telemetry** — real-time ambulance position push from the vehicle to the dispatcher map
- **Natural-language AI assistant** — plain-English explanation of every recommendation and what changed
- **Command-centre analytics** — response trends, average ETA, hospital load history, and route delay heatmaps
- **EHR integration** — pull real hospital capacity from connected health information systems

---

*The Ambulance That Couldn't Wait — Hackathon Project*
