# BedManager Roles, Permissions, and Workflows

This document clarifies the four stakeholder roles from the problem statement with minimal adjustments to reduce overlap and enable clean, separate landing pages and handoffs.

Roles covered:
- ER Staff
- ICU Manager
- Ward/Unit Staff
- Hospital Administration

## Role summaries (single sentence)
- ER Staff: Initiate emergency/scheduled bed requests with triage details and track request status; no direct bed assignment.
- ICU Manager: Owns bed allocation and transfers across ICU/wards; approves/denies requests and manages real-time capacity.
- Ward/Unit Staff: Operate beds on the ground—prepare, admit, discharge, and update bed statuses (available, reserved, cleaning, occupied).
- Hospital Administration: Review analytics and capacity trends; set planning parameters and policy thresholds; no operational control of beds.

## Permissions matrix (high level)
- ER Staff:
  - Can: create emergency/urgent bed requests; view request status; see filtered availability summary relevant to request (not full hospital state).
  - Cannot: allocate beds, edit bed statuses, override policies.
- ICU Manager:
  - Can: view full real-time occupancy; approve/deny/assign beds; override and re-route transfers; set ICU-level alert thresholds; pause admissions when critical.
  - Cannot: mark physical bed state changes (done by Ward/Unit) except set temporary holds/reservations.
- Ward/Unit Staff:
  - Can: update bed state lifecycle (available → reserved → occupied → cleaning → available); record admit/discharge timestamps; enter expected discharge times; acknowledge allocations; raise issues.
  - Cannot: allocate or reassign beds across units; change global thresholds or policies.
- Hospital Administration:
  - Can: view utilization reports, trends, and forecasts; configure planning parameters (e.g., forecasting horizon, target occupancy, reporting periods); export reports.
  - Cannot: allocate beds, modify real-time statuses, or approve requests.

## Primary KPIs by role
- ER Staff: time-to-confirmation for requests, request acceptance rate, diversion incidents.
- ICU Manager: allocation lead time, occupancy vs target, transfer turnaround, override frequency.
- Ward/Unit Staff: bed turnaround time (discharge → clean → available), data freshness (latency of updates), SLA adherence for cleaning.
- Hospital Administration: average occupancy by unit, variance from targets, forecast accuracy, bed churn, LOS distribution.

## Standard workflows and handoffs

### A) Emergency admission (ER → ICU → Ward)
1) ER Staff creates request with triage level, required equipment, and patient ETA.
2) System suggests candidate beds; ICU Manager reviews and approves assignment OR re-routes to alternative unit.
3) ICU Manager places a time-bound reservation on the bed and notifies Ward/Unit Staff.
4) Ward/Unit Staff prep the bed, set state to "reserved"; upon patient arrival set to "occupied" and complete admission.
5) Discharge later triggers Ward/Unit state change to "cleaning" then "available" (with timestamps).

Notes: ER has visibility into the specific request status and ETA windows only; ICU Manager has full visibility; Ward/Unit manage the physical state; Admin observes metrics.

### B) Scheduled admission / transfer (ICU → Ward)
1) ICU Manager creates or approves a scheduled transfer with expected time.
2) Reservation placed; Ward/Unit acknowledges and prepares.
3) Ward/Unit updates state to occupied at transfer, and later manages discharge and cleaning.

### C) Threshold alert (System → ICU → Ward)
1) System raises alert when occupancy crosses threshold or forecast predicts shortage.
2) ICU Manager may adjust allocation policy (e.g., postpone elective ICU admissions) and initiate transfers.
3) Ward/Unit executes operational changes and updates states.
4) Admin later reviews impact via reports.

## Bed state lifecycle (owned by Ward/Unit Staff)
- available → reserved (by ICU Manager) → occupied → cleaning → available
- Edge cases: reservation expiry (auto-revert to available if ETA exceeded); bed out-of-service (maintenance) handled by Ward/Unit with reason code.

## Data access scope
- ER Staff: request-scoped view, minimal PHI, masked beyond need-to-know.
- ICU Manager: full operational view for units managed; can see patient-level constraints required for allocation.
- Ward/Unit Staff: full detail for their unit only; no cross-unit allocation controls.
- Hospital Admin: de-identified aggregate analytics across the hospital; drilldowns stop before PHI.

## Landing page feature checklists

### ER Staff landing
- Create emergency/urgent bed request (triage, specialty/equipment, ETA).
- View request queue and each request’s status (pending, approved, reserved, fulfilled, cancelled).
- See limited availability summary relevant to request (counts only, not exact bed IDs).
- Notifications on approval/denial with assigned destination.

### ICU Manager landing
- Real-time occupancy dashboard (all states: occupied, available, cleaning, reserved) with filters by unit and equipment.
- Smart bed suggestions for incoming requests; approve/deny/assign; set reservation TTL.
- Transfer console (between wards/ICU), override tools, policy controls (ICU thresholds only).
- Alert center (threshold breaches, forecast shortages) and action shortcuts.

### Ward/Unit Staff landing
- My-unit bed board with bed cards and one-click state updates.
- Queue of incoming allocations/reservations to acknowledge.
- Discharge planner (expected discharge times), cleaning start/complete logging.
- Issue reporting (bed out-of-service, blocked, maintenance) with reason codes.

### Hospital Administration landing
- Utilization and trend dashboards (by unit, service line, time).
- Forecasting report (capacity vs demand), configurable planning horizon and targets.
- Policy/parameter configuration for reporting and forecasts (not real-time allocations).
- Export and scheduled report delivery.

## Minimal overlap resolution (clarifications)
- Only ICU Manager assigns beds and manages inter-unit transfers; ER and Ward/Unit cannot.
- Only Ward/Unit Staff change physical bed states; ICU Manager can place/expire reservations but not mark cleaning/occupied.
- ER Staff does not see exact bed identifiers—only request outcomes and limited counts.
- Hospital Admin has no operational controls, only analytics and planning parameters.

## Error and edge case handling
- Reservation expiry: automatic after TTL; alert ICU Manager if ER ETA slips.
- Conflicts: if two reservations collide, ICU Manager override decides; audit log required.
- Data staleness: highlight last update timestamps; block allocations on stale units until refreshed.
- Surge mode: ICU Manager can enable, adjusting thresholds and suggestion logic.

## Implementation notes (mapping to current code)
- Models present: Bed, Patient, OccupancyHistory, CleaningJob, CleaningStaff (if used, can be operated by Ward/Unit role in v1).
- Frontend components present: Dashboard, BedGrid, AlertPanel, CleaningDashboard, EmergencyAdmission, WardView.
- Suggested access control constants in frontend: see `src/constants/roles.js`.

