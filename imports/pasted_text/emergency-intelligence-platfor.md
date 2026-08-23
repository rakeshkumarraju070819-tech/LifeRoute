Design and prototype a **production-quality emergency ambulance response platform** called:

# “Emergency Intelligence”

### AI-Powered Ambulance Routing & Hospital Coordination

This is a real-world emergency response platform with **Role-Based Authentication (RBAC)** and three user roles:

1. **Ambulance Crew**
2. **Dispatcher**
3. **Hospital Staff**

There is **NO Admin dashboard** in this MVP.

The design must clearly separate what each role can **VIEW** and **UPDATE**.

---

# 1. GLOBAL DESIGN SYSTEM

Create a professional healthcare/emergency-response SaaS design.

### Visual style

* Modern enterprise healthcare technology
* Professional, trustworthy and high-tech
* Dark navy primary color
* White/light gray surfaces
* Emergency red used only for critical alerts
* Blue used for active/primary actions
* Green for available/success states
* Amber for warnings
* Clean typography
* Rounded cards, but avoid excessive card nesting
* Large readable typography
* Strong whitespace
* Accessible contrast
* Desktop-first responsive design

### Important UX rule

This is an emergency system.

Do NOT create flashy gaming-style interfaces.

Information must be:

* Fast to scan
* Clearly prioritized
* Easy to understand
* Accessible with minimal interaction
* Color-coded consistently
* Never hidden behind unnecessary menus

Use:

* Tables
* Maps
* Status badges
* Timeline components
* KPI cards
* Alerts
* Side navigation
* Modal dialogs
* Confirmation dialogs

Do not overcrowd dashboards.

---

# 2. AUTHENTICATION

Create complete authentication screens before the dashboards.

## A. Landing / Welcome Page

Create a professional landing page with:

**Emergency Intelligence**

Subtitle:

**Real-Time Emergency Routing & Hospital Coordination**

Short explanation:

“Connect ambulances, emergency dispatchers and hospitals through one intelligent real-time response platform.”

Primary buttons:

**Sign In**

**Create Account**

Include a subtle emergency city/map visualization.

---

# 3. SIGN UP PAGE

Create a dedicated registration page.

### Fields

* Full Name
* Email Address
* Phone Number
* Password
* Confirm Password
* Organization / Hospital Name
* Role

### Role selector

Provide exactly:

**Ambulance Crew**

**Dispatcher**

**Hospital Staff**

Do NOT show Admin.

### Role-specific behavior

If user selects:

**Ambulance Crew**

Show:

* Ambulance ID
* Organization / Ambulance Service
* License/employee ID

**Dispatcher**

Show:

* Dispatch Center
* Employee ID

**Hospital Staff**

Show:

* Hospital Name
* Department
* Employee ID

### Sign-up actions

Primary button:

**Create Account**

Secondary:

**Already have an account? Sign In**

Include:

* Password strength indicator
* Show/hide password
* Validation messages
* Required-field indicators
* Email validation
* Password confirmation validation
* Terms/privacy checkbox

### Registration success

Show:

**Account Created Successfully**

Then:

**Your account is awaiting verification.**

Provide:

**Continue to Sign In**

---

# 4. LOGIN PAGE

Create a clean enterprise login page.

Fields:

* Email
* Password

Actions:

**Sign In**

**Forgot Password?**

**Create Account**

Include:

* Show/hide password
* Remember me
* Invalid credentials error
* Account not verified error
* Account disabled error
* Loading state

After successful login:

**Automatically redirect based on the user's role.**

Ambulance Crew → Ambulance Dashboard

Dispatcher → Dispatcher Dashboard

Hospital Staff → Hospital Dashboard

Do NOT show a generic dashboard.

---

# 5. FORGOT PASSWORD

Create:

### Forgot Password

Field:

* Email address

Button:

**Send Reset Link**

Success state:

**Password reset link sent.**

Also create:

### Reset Password

Fields:

* New Password
* Confirm Password

Button:

**Reset Password**

---

# 6. ROLE-BASED ROUTING

Implement the following navigation behavior:

```text
LOGIN
   ↓
AUTHENTICATE USER
   ↓
CHECK ROLE
   ├── AMBULANCE_CREW → Ambulance Dashboard
   ├── DISPATCHER → Dispatcher Dashboard
   └── HOSPITAL_STAFF → Hospital Dashboard
```

Users must NEVER see dashboard navigation belonging to another role.

For example:

Ambulance Crew must not see:

* Hospital management pages
* Dispatcher fleet management
* Other ambulance controls

Hospital Staff must not see:

* Fleet assignment
* Other hospital management
* Dispatcher controls

Dispatcher must not edit hospital capacity.

---

# 7. COMMON DASHBOARD STRUCTURE

All three dashboards should have:

### Left Sidebar

Role-specific navigation.

### Top Header

Include:

* Page title
* Notification icon
* Connection status
* User profile
* Role badge
* Logout

### Real-time indicator

Show:

🟢 **Live System Connected**

If disconnected:

🔴 **Connection Lost**

---

# 8. AMBULANCE CREW DASHBOARD

Role:

**AMBULANCE CREW**

Primary purpose:

**Help ambulance crew respond to an assigned emergency and reach the correct hospital as quickly as possible.**

## Sidebar

Show only:

* Dashboard
* Active Emergency
* Navigation
* Emergency History
* Notifications
* Profile
* Logout

---

## Ambulance Dashboard — VIEW

Display:

### Current Ambulance Status

* Ambulance ID
* Current status
* Current GPS location
* Crew members
* Last location update
* Connection status

Status options:

**AVAILABLE**

**DISPATCHED**

**EN ROUTE TO PATIENT**

**PATIENT PICKED UP**

**EN ROUTE TO HOSPITAL**

**ARRIVED**

---

### Active Emergency

Show:

* Emergency ID
* Emergency type
* Severity
* Pickup location
* Distance to patient
* ETA
* Dispatch time
* Important medical information available to crew

Use clear severity indicators:

Critical / High / Medium / Low

---

### Live Navigation

Large map section showing:

* Ambulance current location
* Pickup location
* Recommended route
* Alternative route
* Destination hospital
* Traffic conditions
* Road closures
* Accidents/obstructions
* ETA
* Distance remaining

---

### AI Hospital Recommendation

Show:

**Recommended Hospital**

Display:

* Hospital name
* Distance
* ETA
* Emergency department status
* ICU availability
* Relevant specialty availability
* Hospital readiness

Example:

**City General Hospital**

**8 min ETA**

🟢 ICU Available

🟢 Cardiac Unit Available

---

### Route Alerts

Show alerts such as:

**Heavy congestion detected**

**Road closure detected**

**Route recalculated**

**Hospital capacity changed**

---

# 9. AMBULANCE CREW — UPDATE PERMISSIONS

The ambulance crew can UPDATE:

### Ambulance status

* Available
* Dispatched
* En Route to Patient
* Patient Picked Up
* En Route to Hospital
* Arrived

### Emergency workflow

Actions:

**Accept Emergency**

**Confirm Pickup**

**Patient Picked Up**

**Arrived at Hospital**

**Complete Emergency**

### Location

GPS location is updated automatically.

### Emergency response

Crew can:

* Acknowledge emergency
* Report road obstruction
* Report delay
* Contact dispatcher
* Reject/decline an assignment with a reason if permitted

### Important restrictions

Ambulance Crew CANNOT:

* Edit hospital capacity
* Edit ICU availability
* Assign another ambulance
* Modify another ambulance
* Create hospital records
* Change dispatcher settings
* Modify the AI route algorithm

The crew may choose **“Use Alternative Route”** if the system provides alternatives, but they cannot manually modify the AI's underlying route calculation.

---

# 10. DISPATCHER DASHBOARD

Role:

**DISPATCHER**

Primary purpose:

**Coordinate emergencies, ambulances and hospitals in real time.**

## Sidebar

Show:

* Dashboard
* Emergencies
* Ambulance Fleet
* Live Map
* Hospitals
* Emergency History
* Notifications
* Profile
* Logout

---

# 11. DISPATCHER DASHBOARD — VIEW

### KPI section

Show:

* Active Emergencies
* Available Ambulances
* Active Ambulances
* Hospitals Available
* Critical Emergencies

---

### Active Emergencies

Table columns:

* Emergency ID
* Type
* Severity
* Location
* Assigned Ambulance
* Status
* ETA
* Hospital
* Created Time

Filters:

* Severity
* Status
* Emergency Type
* Time

Search by Emergency ID.

---

### Ambulance Fleet

Show:

* Ambulance ID
* Current status
* Location
* Assigned emergency
* Crew
* ETA
* Last update
* Connection status

Status colors:

Available = Green

Dispatched = Blue

En Route = Blue

Critical/Delayed = Red

Offline = Gray

---

### Live City Map

Show:

* All active ambulances
* Emergency locations
* Hospital locations
* Ambulance routes
* Traffic
* Road incidents
* Hospital status

Provide map filters:

* Ambulances
* Emergencies
* Hospitals
* Traffic
* Road incidents

---

### Hospital Status

Dispatcher can VIEW:

* Hospital name
* Emergency department status
* ICU availability
* General bed availability
* Trauma availability
* Cardiac availability
* Incoming ambulance
* ETA

---

# 12. DISPATCHER — UPDATE PERMISSIONS

Dispatcher CAN UPDATE:

### Emergency

* Create emergency
* Edit emergency details
* Set emergency type
* Set severity
* Set pickup location
* Update emergency status
* Cancel emergency
* Close emergency

### Ambulance assignment

* Assign ambulance
* Reassign ambulance
* Cancel assignment

### Communication

* Send instructions to ambulance
* Send emergency alerts
* Contact ambulance crew
* Add operational notes

### Emergency status

Allowed statuses:

**NEW**

**ASSIGNING**

**ASSIGNED**

**AMBULANCE EN ROUTE**

**PATIENT PICKED UP**

**EN ROUTE TO HOSPITAL**

**COMPLETED**

**CANCELLED**

---

### Dispatcher restrictions

Dispatcher CANNOT directly edit:

* Hospital bed count
* ICU count
* Hospital medical capacity
* Ambulance GPS coordinates
* AI routing algorithm

Hospital capacity must be updated by Hospital Staff.

GPS must be automatically generated.

---

# 13. HOSPITAL STAFF DASHBOARD

Role:

**HOSPITAL STAFF**

Primary purpose:

**Maintain accurate hospital emergency capacity and prepare for incoming patients.**

## Sidebar

Show:

* Dashboard
* Hospital Capacity
* Incoming Ambulances
* Emergency Readiness
* History
* Notifications
* Profile
* Logout

---

# 14. HOSPITAL DASHBOARD — VIEW

### Hospital Overview

Show:

* Hospital name
* Hospital status
* Emergency department status
* Current occupancy
* ICU occupancy
* Available resources
* Incoming ambulances

---

### Capacity Overview

Display:

**General Beds**

Available / Total

**ICU Beds**

Available / Total

**Emergency Department**

Available Capacity / Maximum

**Trauma Unit**

Available / Full

**Cardiac Unit**

Available / Full

---

### Incoming Ambulances

Table:

* Ambulance ID
* Emergency ID
* Emergency type
* Severity
* ETA
* Current location
* Route status
* Arrival status

---

### Emergency Readiness

Show:

* Emergency department readiness
* ICU readiness
* Trauma readiness
* Cardiac readiness
* Critical equipment availability

Use:

🟢 Available

🟡 Limited

🔴 Full / Unavailable

---

# 15. HOSPITAL STAFF — UPDATE PERMISSIONS

Hospital Staff CAN UPDATE:

### Bed capacity

* Total general beds
* Available general beds
* Total ICU beds
* Available ICU beds

### Department availability

* Emergency department
* ICU
* Trauma
* Cardiac
* Other configured emergency specialties

### Resource availability

Where applicable:

* Ventilator availability
* Emergency equipment
* Critical resources

### Hospital operational status

Set:

**OPEN**

**LIMITED**

**FULL**

**EMERGENCY ONLY**

**CLOSED**

### Incoming ambulance

Hospital Staff can:

**Accept Incoming Ambulance**

or

**Mark Hospital Unavailable**

Provide a reason.

---

# 16. HOSPITAL STAFF RESTRICTIONS

Hospital Staff CANNOT:

* Assign ambulances
* Modify ambulance GPS
* Modify emergency routing
* Modify another hospital
* Change dispatcher data
* Create ambulance accounts
* Access dispatcher fleet controls

They only manage **their own hospital's information**.

---

# 17. PROFILE PAGE

Create a profile page for all roles.

Show:

* Full name
* Email
* Phone
* Role
* Organization
* Employee ID
* Account status

Allow:

* Edit phone
* Edit name where permitted
* Change password
* Notification preferences

Role must be **read-only**.

---

# 18. NOTIFICATION CENTER

Create role-specific notifications.

### Ambulance Crew

* New emergency assignment
* Route changed
* Traffic alert
* Hospital recommendation changed
* Dispatcher message

### Dispatcher

* New emergency
* Ambulance unavailable
* Ambulance delayed
* Hospital capacity changed
* Critical emergency alert

### Hospital Staff

* Incoming ambulance
* Emergency severity alert
* Capacity warning
* Hospital status warning

---

# 19. ERROR / EMPTY / LOADING STATES

Create UI states for:

### Loading

Skeleton loaders.

### No active emergency

**No active emergency**

“You currently have no assigned emergency.”

### No ambulances available

**No ambulances available**

“All available units are currently assigned.”

### Hospital full

🔴 **Hospital currently unavailable**

### Network disconnected

🔴 **Connection lost**

“Real-time updates are temporarily unavailable.”

### Unauthorized

**Access Denied**

“You don't have permission to access this resource.”

### Session expired

**Session Expired**

“Please sign in again.”

---

# 20. ROLE-BASED ACCESS MATRIX

Use this as the definitive permission model.

| Feature                   | Ambulance Crew     | Dispatcher  | Hospital Staff |
| ------------------------- | ------------------ | ----------- | -------------- |
| View own profile          | VIEW/UPDATE        | VIEW/UPDATE | VIEW/UPDATE    |
| View active emergency     | Assigned only      | ALL         | Incoming only  |
| Create emergency          | NO                 | UPDATE      | NO             |
| Accept emergency          | UPDATE             | UPDATE      | NO             |
| Update emergency status   | UPDATE             | UPDATE      | NO             |
| Assign ambulance          | NO                 | UPDATE      | NO             |
| Reassign ambulance        | NO                 | UPDATE      | NO             |
| View ambulance fleet      | Own                | ALL         | Incoming only  |
| Track GPS                 | Own                | ALL         | Incoming       |
| View routes               | Own                | ALL         | Incoming       |
| Report road issue         | UPDATE             | UPDATE      | NO             |
| View hospital capacity    | Recommended/needed | ALL         | Own            |
| Update hospital capacity  | NO                 | NO          | UPDATE         |
| Accept incoming ambulance | NO                 | NO          | UPDATE         |
| Manage hospital status    | NO                 | NO          | UPDATE         |
| Manage users              | NO                 | NO          | NO             |
| Access another hospital   | NO                 | VIEW        | NO             |
| Access another ambulance  | NO                 | VIEW        | NO             |
| AI route calculation      | VIEW               | VIEW        | NO             |
| Notifications             | VIEW               | VIEW        | VIEW           |

---

# 21. RESPONSIVE DESIGN

Design all screens for:

* Desktop: 1440 × 900
* Laptop: 1280 × 800
* Tablet: 1024 × 768

Use responsive layouts.

Do not let:

* Tables overflow
* Maps overlap cards
* Sidebar cover content
* Text overlap buttons
* Cards collide
* Dialogs extend outside screen

---

# 22. PROTOTYPE FLOW

Create clickable prototype connections:

```text
Landing
 ↓
Sign Up ──→ Role Selection
 ↓
Account Created
 ↓
Login
 ↓
Role Detection
 ├── Ambulance Dashboard
 ├── Dispatcher Dashboard
 └── Hospital Dashboard
```

Create working navigation within each role.

Do not allow navigation to unauthorized pages.

Example:

Ambulance Crew attempting to access:

`/dispatcher/fleet`

must see:

**Access Denied**

---

# 23. FINAL DESIGN REQUIREMENT

The finished Figma prototype should look like a **real emergency-response SaaS product that could be deployed by a city ambulance network**, not a generic student dashboard.

Prioritize:

**Clarity → Safety → Speed → Real-time information → Role-based permissions**

Every dashboard must clearly distinguish:

**WHAT THE USER CAN SEE**

from

**WHAT THE USER CAN CHANGE.**

Do not invent additional roles, permissions, dashboards or features outside this specification.