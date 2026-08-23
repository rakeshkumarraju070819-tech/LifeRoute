import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { MapPin, Truck, Clock, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import TomTomMap, { distanceKm } from '../../components/TomTomMap';
import { useSharedDataSync } from '../../hooks/useSharedDataSync';
import { ambulanceService } from '../../services/ambulanceService';
import { emergencyService } from '../../services/emergencyService';
import { hospitalService } from '../../services/hospitalService';
import { EmergencyStatus } from '../../types';

const STATUSES: import('../../types').AmbulanceStatus[] = ['AVAILABLE', 'ASSIGNED', 'ACCEPTED', 'EN ROUTE', 'AT HOSPITAL', 'OFF DUTY'];

const HOSPITAL_OPTIONS = [
  { id: 'H1', name: 'City General Hospital', status: 'OPEN', location: { lat: 40.7135, lng: -74.002 }, emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 12, total: 20 }, cardiac: { status: 'AVAILABLE' }, trauma: { status: 'AVAILABLE' } },
  { id: 'H2', name: 'St. Mary Medical Center', status: 'LIMITED', location: { lat: 40.719, lng: -73.99 }, emergencyDepartment: { status: 'LIMITED' }, icu: { available: 2, total: 20 }, cardiac: { status: 'AVAILABLE' }, trauma: { status: 'LIMITED' } },
  { id: 'H3', name: 'Metro Health Hospital', status: 'OPEN', location: { lat: 40.722, lng: -74.012 }, emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 5, total: 16 }, cardiac: { status: 'LIMITED' }, trauma: { status: 'AVAILABLE' } },
];

// The crew's mock GPS is a static point in the seed data, so "distance
// traveled" doesn't map to a real speedometer feed. We derive an estimated
// travel speed from the same assumed-average-speed model used for ETA,
// rather than fabricate a live telemetry number — see distanceKm/etaMinutes
// below. A small bounded jitter keeps the stat bar feeling live between
// status updates without claiming precision the mock data doesn't have.
const ASSUMED_AVG_SPEED_KMH = 32;

function useJitteredSpeed(baseSpeed: number) {
  const [speed, setSpeed] = useState(baseSpeed);
  useEffect(() => {
    setSpeed(baseSpeed);
    const id = setInterval(() => {
      setSpeed(s => {
        const next = s + (Math.random() - 0.5) * 6;
        return Math.min(baseSpeed + 12, Math.max(Math.max(0, baseSpeed - 12), next));
      });
    }, 3500);
    return () => clearInterval(id);
  }, [baseSpeed]);
  return Math.round(speed);
}

function trafficLabel(speedKmh: number): { label: string; tone: 'positive' | 'warning' | 'critical' } {
  if (speedKmh >= 38) return { label: 'Light', tone: 'positive' };
  if (speedKmh >= 22) return { label: 'Moderate', tone: 'warning' };
  return { label: 'Heavy', tone: 'critical' };
}

function useElapsed(since: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!since) return '00:00';
  const totalSeconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

const STATUS_LABEL: Record<EmergencyStatus, string> = {
  ASSIGNED: 'Assigned',
  EN_ROUTE_TO_PATIENT: 'En Route to Patient',
  ARRIVED_AT_SCENE: 'Arrived at Scene',
  PATIENT_PICKED_UP: 'Patient Picked Up',
  EN_ROUTE_TO_HOSPITAL: 'En Route to Hospital',
  ARRIVED_AT_HOSPITAL: 'Arrived at Hospital',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// The full forward-moving lifecycle, used to render the timeline with
// upcoming (pending) steps grayed out alongside the ones already reached.
const STATUS_SEQUENCE: EmergencyStatus[] = [
  'ASSIGNED', 'EN_ROUTE_TO_PATIENT', 'ARRIVED_AT_SCENE', 'PATIENT_PICKED_UP',
  'EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL', 'COMPLETED',
];

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [recommendation, setRecommendation] = useState<{ hospitalName: string; etaMinutes: number; distanceKm: number; confidence: number; specialty: string; readiness: { specialtyReady: boolean; icuReady: boolean } } | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const emergencyRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);

  // Data Layer — single unified hook handles all portals + cross-tab
  const { ambulances, emergencies, hospitals } = useSharedDataSync();

  // 'AMB-017' doesn't exist in seed data (AMB-001..004 do) — that fallback
  // silently broke myAmbulance lookups for any user without an explicit id.
  const myAmbulanceId = user?.ambulanceId || 'AMB-001';
  const myAmbulance = ambulances.find(a => a.ambulanceId === myAmbulanceId);

  // Exact single source of truth for active emergency assigned to this ambulance
  const activeEmergency = emergencies.find(
    e => e.assignedAmbulanceId === myAmbulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
  );
  const recommendedHospital = activeEmergency?.recommendedHospitalId
    ? hospitals.find(h => h.hospitalId === activeEmergency.recommendedHospitalId)
    : null;

  // Before pickup the live leg runs to the scene; after pickup it runs to the hospital.
  const headedToHospital = activeEmergency
    ? ['PATIENT_PICKED_UP', 'EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'].includes(activeEmergency.status)
    : false;

  const navTargetCoords = headedToHospital && recommendedHospital
    ? recommendedHospital.location
    : activeEmergency
      ? { lat: activeEmergency.latitude, lng: activeEmergency.longitude }
      : null;

  const legDistanceKm = myAmbulance && navTargetCoords ? distanceKm(myAmbulance.currentLocation, navTargetCoords) : null;
  const legEtaMinutes = legDistanceKm !== null ? Math.max(1, Math.round((legDistanceKm / ASSUMED_AVG_SPEED_KMH) * 60)) : null;
  const liveSpeed = useJitteredSpeed(legDistanceKm !== null ? ASSUMED_AVG_SPEED_KMH : 0);
  const traffic = trafficLabel(liveSpeed);
  const elapsed = useElapsed(activeEmergency?.statusHistory?.[activeEmergency.statusHistory.length - 1]?.timestamp || activeEmergency?.createdAt);

  const crewFocus = myAmbulance && activeEmergency && navTargetCoords
    ? {
        ambulance: { lat: myAmbulance.currentLocation.lat, lng: myAmbulance.currentLocation.lng, title: myAmbulance.ambulanceId, subtitle: STATUS_LABEL[activeEmergency.status] },
        destination: headedToHospital && recommendedHospital
          ? { lat: recommendedHospital.location.lat, lng: recommendedHospital.location.lng, title: recommendedHospital.name, subtitle: legDistanceKm !== null ? `${legDistanceKm.toFixed(1)} km away` : undefined, kind: 'hospital' as const }
          : { lat: activeEmergency.latitude, lng: activeEmergency.longitude, title: 'Incident Location', subtitle: activeEmergency.pickupLocation, kind: 'incident' as const },
      }
    : undefined;

  useEffect(() => {
    if (location.pathname.endsWith('/emergency')) {
      emergencyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (location.pathname.endsWith('/navigation')) {
      navigationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/recommend-hospital', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emergencyType: 'Cardiac Arrest',
        severity: 'CRITICAL',
        origin: { lat: 40.7128, lng: -74.006 },
        hospitals: HOSPITAL_OPTIONS,
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Recommendation unavailable');
        return response.json();
      })
      .then(data => { if (!cancelled) setRecommendation(data); })
      .catch(() => { if (!cancelled) setRecommendation(null); })
      .finally(() => { if (!cancelled) setRecommendationLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleStatusChange = (newStatus: EmergencyStatus) => {
    if (activeEmergency) {
      emergencyService.updateEmergencyStatus(activeEmergency.emergencyId, newStatus, myAmbulanceId);

      // updateEmergencyStatus already releases the ambulance internally on
      // COMPLETED/CANCELLED (see emergencyService) — only handle the
      // transitions it doesn't own here. 'ACCEPTED' is an AmbulanceStatus/
      // hospitalResponse value, not a reachable EmergencyStatus from
      // getActionButtons below, so it's not handled here.
      if (newStatus === 'ARRIVED_AT_HOSPITAL') {
        ambulanceService.updateAmbulanceStatus(myAmbulanceId, 'AT HOSPITAL');
      } else if (newStatus !== 'COMPLETED' && newStatus !== 'CANCELLED') {
        ambulanceService.updateAmbulanceStatus(myAmbulanceId, 'EN ROUTE');
      }
    }
  };

  const getActionButtons = () => {
    if (!activeEmergency) return [];

    switch (activeEmergency.status) {
      case 'ASSIGNED':
        return [{ label: 'En Route to Patient', tone: 'operational' as const, action: () => handleStatusChange('EN_ROUTE_TO_PATIENT') }];
      case 'EN_ROUTE_TO_PATIENT':
        return [{ label: 'Arrived at Scene', tone: 'positive' as const, action: () => handleStatusChange('ARRIVED_AT_SCENE') }];
      case 'ARRIVED_AT_SCENE':
        return [{ label: 'Patient Picked Up', tone: 'positive' as const, action: () => handleStatusChange('PATIENT_PICKED_UP') }];
      case 'PATIENT_PICKED_UP':
        return [{ label: 'En Route to Hospital', tone: 'operational' as const, action: () => handleStatusChange('EN_ROUTE_TO_HOSPITAL') }];
      case 'EN_ROUTE_TO_HOSPITAL':
        return [{ label: 'Arrived at Hospital', tone: 'operational' as const, action: () => handleStatusChange('ARRIVED_AT_HOSPITAL') }];
      case 'ARRIVED_AT_HOSPITAL':
        return [{ label: 'Complete Mission', tone: 'positive' as const, action: () => handleStatusChange('COMPLETED') }];
      default:
        return [];
    }
  };

  const actionButtons = getActionButtons();
  const nextPendingStatus = activeEmergency
    ? STATUS_SEQUENCE[STATUS_SEQUENCE.indexOf(activeEmergency.status) + 1]
    : undefined;

  const TONE_CLASS: Record<'operational' | 'positive', string> = {
    operational: 'bg-operational hover:opacity-90 text-white',
    positive: 'bg-positive hover:opacity-90 text-white',
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* SECTION 1 — TOP STATUS BAR */}
      <div className="bg-surface-panel border border-hairline rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-1">Unit ID</p>
              <p className="text-primary font-mono text-sm font-bold">{myAmbulance?.ambulanceId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-1">Crew Lead</p>
              <p className="text-primary text-sm">{myAmbulance?.crew || user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-1">GPS Coordinates</p>
              <p className="text-primary font-mono text-sm">{myAmbulance?.currentLocation?.lat || '0'}° N, {myAmbulance?.currentLocation?.lng || '0'}° W</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-1">Last Update</p>
              <p className="text-primary font-mono text-sm">{myAmbulance ? new Date(myAmbulance.lastUpdatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-1">Connection</p>
              <p className="text-positive font-mono text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-positive animate-pulse" /> Online
              </p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setShowStatusMenu(s => !s)}
              className="flex items-center gap-2 bg-operational-bg border border-operational/40 rounded-full px-4 py-2 text-sm font-medium text-operational hover:bg-operational/20 transition-colors">
              {myAmbulance?.status || 'UNKNOWN'}
              <span>▾</span>
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-2 bg-surface-panel-raised border border-hairline-strong rounded-xl shadow-2xl z-10 py-1 w-64">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => {
                      ambulanceService.updateAmbulanceStatus(myAmbulanceId, s as any);
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:bg-surface-sunken hover:text-primary flex items-center justify-between">
                    {s}
                    {s === myAmbulance?.status && <span className="text-operational">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {statusError && <p className="text-critical text-xs mt-2">{statusError}</p>}
        </div>
      </div>

      {/* SECTION 2 — LIVE NAVIGATION + EMERGENCY DETAILS */}
      <div ref={navigationRef} className="grid grid-cols-1 xl:grid-cols-5 gap-6 scroll-mt-6">
        {/* Navigation / Map (3 of 5 columns) */}
        <div className="xl:col-span-3 bg-surface-panel border border-hairline rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-primary font-bold text-lg">
                Navigation {activeEmergency ? `— ${STATUS_LABEL[activeEmergency.status]}` : ''}
              </p>
              {activeEmergency && (
                <p className="text-tertiary text-sm">{activeEmergency.emergencyId} · {activeEmergency.type}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeEmergency && (
                <span className="bg-operational-bg text-operational text-xs font-semibold font-mono px-3 py-1.5 rounded-full">
                  {STATUS_LABEL[activeEmergency.status]}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-secondary text-xs font-mono bg-surface-sunken border border-hairline px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.75} /> {elapsed}
              </span>
            </div>
          </div>

          <TomTomMap height="380px" variant="crew" showStyleToggle crewFocus={crewFocus} />

          {activeEmergency && navTargetCoords ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-surface-sunken border border-hairline rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">
                  Distance to {headedToHospital ? 'Hospital' : 'Patient'}
                </p>
                <p className="text-primary font-mono font-bold text-lg">{legDistanceKm?.toFixed(1)} km</p>
              </div>
              <div className="bg-surface-sunken border border-hairline rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">
                  ETA to {headedToHospital ? 'Hospital' : 'Patient'}
                </p>
                <p className="text-primary font-mono font-bold text-lg">{legEtaMinutes} min</p>
              </div>
              <div className="bg-surface-sunken border border-hairline rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">Current Speed</p>
                <p className="text-primary font-mono font-bold text-lg">{liveSpeed} km/h</p>
              </div>
              <div className="bg-surface-sunken border border-hairline rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">Traffic Status</p>
                <p className={`font-mono font-bold text-lg ${traffic.tone === 'positive' ? 'text-positive' : traffic.tone === 'warning' ? 'text-warning' : 'text-critical'}`}>
                  {traffic.label}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center h-16">
              <p className="text-tertiary text-sm">No active navigation — assign an emergency to begin.</p>
            </div>
          )}
        </div>

        {/* Emergency Details (2 of 5 columns) */}
        <div ref={emergencyRef} className="xl:col-span-2 bg-surface-panel border border-hairline rounded-2xl p-6 flex flex-col scroll-mt-6">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs uppercase tracking-widest text-tertiary font-semibold">Emergency Details</p>
            {activeEmergency && <StatusBadge status={activeEmergency.emergencyId} variant="muted" />}
          </div>

          {activeEmergency ? (
            <>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-primary text-xl font-bold">{activeEmergency.type}</p>
                <StatusBadge status={activeEmergency.severity} />
              </div>
              <p className="text-secondary text-sm flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} /> {activeEmergency.pickupLocation}
              </p>
              <p className="text-tertiary text-xs font-mono mb-4">
                Reported: {new Date(activeEmergency.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-hairline">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">Severity</p>
                  <StatusBadge status={activeEmergency.severity} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">Type</p>
                  <p className="text-primary text-sm font-mono">{activeEmergency.type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">Status</p>
                  <StatusBadge status={activeEmergency.status} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1">Bed Reserved</p>
                  <StatusBadge status={activeEmergency.bedReserved ? 'YES' : 'PENDING'} />
                </div>
              </div>

              {/* Patient Information — the app doesn't collect patient identity until
                  hospital handoff, so unknown fields render as "Unknown" rather than
                  fabricated details. */}
              <div className="mb-5 pb-5 border-b border-hairline">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-2">Patient Information</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-primary font-semibold">Unknown Patient</p>
                    <p className="text-tertiary text-xs">Adult · Unknown Gender</p>
                  </div>
                  <div>
                    <p className="text-tertiary text-[10px] uppercase tracking-wide mb-0.5">Condition</p>
                    <p className="text-critical font-semibold">{activeEmergency.severity}</p>
                  </div>
                  <div>
                    <p className="text-tertiary text-[10px] uppercase tracking-wide mb-0.5">Age</p>
                    <p className="text-primary font-mono">Unknown</p>
                  </div>
                </div>
              </div>

              {/* Assigned Hospital */}
              <div className="mb-5 pb-5 border-b border-hairline">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-2">Assigned Hospital</p>
                {recommendedHospital ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-operational mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                      <div>
                        <p className="text-primary font-semibold text-sm">{recommendedHospital.name}</p>
                        <p className="text-tertiary text-xs">
                          {distanceKm(
                            myAmbulance?.currentLocation || { lat: activeEmergency.latitude, lng: activeEmergency.longitude },
                            recommendedHospital.location,
                          ).toFixed(1)} km away
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-mono font-bold whitespace-nowrap ${
                      activeEmergency.hospitalResponse === 'ACCEPTED' ? 'text-positive' :
                      activeEmergency.hospitalResponse === 'DECLINED' ? 'text-critical' : 'text-warning'
                    }`}>
                      {activeEmergency.hospitalResponse === 'ACCEPTED' ? 'Expecting Patient' :
                       activeEmergency.hospitalResponse === 'DECLINED' ? 'Declined' : 'Awaiting Confirmation'}
                    </span>
                  </div>
                ) : (
                  <p className="text-tertiary text-sm">No hospital assigned yet.</p>
                )}
              </div>

              {/* Crew & Vehicle Information */}
              <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-hairline">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1.5">Crew</p>
                  <p className="text-primary text-sm font-semibold">{myAmbulance?.crew || 'N/A'}</p>
                  <span className="inline-block mt-1 text-[10px] text-positive">● Online</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3 h-3" strokeWidth={1.75} /> Vehicle
                  </p>
                  <p className="text-primary text-sm font-mono font-semibold">{myAmbulance?.ambulanceId}</p>
                  <p className="text-tertiary text-xs">{myAmbulance?.station}</p>
                </div>
              </div>

              {/* Emergency Timeline */}
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-widest text-tertiary font-semibold mb-3">Emergency Timeline</p>
                <div className="space-y-0">
                  {(activeEmergency.statusHistory && activeEmergency.statusHistory.length > 0
                    ? activeEmergency.statusHistory
                    : [{ status: activeEmergency.status, timestamp: activeEmergency.createdAt, updatedBy: 'system' }]
                  ).map((entry, i, arr) => (
                    <div key={`${entry.status}-${entry.timestamp}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="w-2 h-2 rounded-full bg-operational flex-shrink-0 mt-1.5" />
                        {(i < arr.length - 1 || nextPendingStatus) && <span className="w-px flex-1 bg-hairline-strong" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-primary text-sm font-medium">{STATUS_LABEL[entry.status]}</p>
                        <p className="text-tertiary text-xs font-mono">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  {nextPendingStatus && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="w-2 h-2 rounded-full bg-surface-sunken border border-hairline-strong flex-shrink-0 mt-1.5" />
                      </div>
                      <div>
                        <p className="text-tertiary text-sm">{STATUS_LABEL[nextPendingStatus]}</p>
                        <p className="text-tertiary text-xs font-mono">Pending</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activeEmergency.notes && (
                <div className="bg-critical-bg border border-critical/20 rounded-xl p-3 mb-5">
                  <p className="text-xs font-medium text-critical">Notes: {activeEmergency.notes}</p>
                </div>
              )}

              {/* Emergency Actions */}
              <div className="mt-auto grid grid-cols-1 gap-2">
                {actionButtons.map(a => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    className={`${TONE_CLASS[a.tone]} rounded-xl py-3 text-sm font-semibold transition-colors text-center px-4`}
                  >
                    {a.label}
                  </button>
                ))}
                {actionButtons.length === 0 && (
                  <p className="text-tertiary text-center text-sm py-2">No actions available.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <p className="text-secondary font-medium mb-1">No active emergency assigned</p>
              <p className="text-tertiary text-sm">You'll see full emergency details here once dispatch assigns one.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3 — SECONDARY INFO ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Location */}
        <div className="bg-surface-panel border border-hairline rounded-2xl p-6 flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-4 self-start">Current Location</p>
          <div className="relative flex items-center justify-center w-16 h-16 my-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-operational/20 animate-ping" />
            <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-operational-bg ring-1 ring-operational/40">
              <MapPin className="w-6 h-6 text-operational" strokeWidth={1.75} />
            </span>
          </div>
          <p className="text-primary text-2xl font-mono font-bold mt-3">{myAmbulance?.currentLocation?.lat || '0'}° N</p>
          <p className="text-primary text-2xl font-mono font-bold">{myAmbulance?.currentLocation?.lng || '0'}° W</p>
          <p className="text-secondary text-sm mt-2">{myAmbulance?.station || 'On Duty'}</p>
        </div>

        {/* AI Hospital Recommendation */}
        <div className={`relative overflow-hidden ${activeEmergency && recommendedHospital ? 'bg-operational-bg' : 'bg-surface-panel'} border border-hairline rounded-2xl p-6`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-tertiary font-semibold">AI Hospital Recommendation</p>
            <span className="text-xs bg-operational-bg text-operational px-2.5 py-1 rounded-full font-mono font-semibold">AI</span>
          </div>
          {recommendationLoading ? (
            <p className="text-tertiary text-sm py-6">Calculating safest destination…</p>
          ) : recommendation ? (
            <>
              <p className="text-primary text-xl font-bold mb-1">{recommendation.hospitalName}</p>
              <p className="text-operational text-4xl font-mono font-bold mb-1">{recommendation.etaMinutes} min</p>
              <p className="text-secondary text-sm mb-4">{recommendation.distanceKm} km estimated travel distance</p>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Emergency Dept', ok: true },
                  { label: 'ICU', ok: recommendation.readiness.icuReady },
                  { label: 'Cardiac', ok: recommendation.readiness.specialtyReady },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="text-secondary flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-positive' : 'bg-warning'}`} />
                      {r.label}
                    </span>
                    <div className="flex-1 mx-3 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                      <div className={`h-full rounded-full ${r.ok ? 'bg-positive w-[90%]' : 'bg-warning w-[45%]'}`} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-positive font-bold text-sm border-t border-hairline pt-3">{recommendation.confidence}% recommendation confidence</p>
            </>
          ) : activeEmergency && recommendedHospital ? (() => {
            const hDetails = hospitalService.getHospitalCapacityDetails(recommendedHospital);
            return (
              <>
                <p className="text-primary text-xl font-bold mb-1">{recommendedHospital.name}</p>
                <p className="text-secondary text-sm mb-4">{hDetails.overallStatus === 'AVAILABLE' ? 'Emergency Dept Available' : hDetails.overallStatus === 'BUSY' ? 'Emergency Dept Busy' : 'Emergency Dept Full'}</p>
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Emergency Dept', ok: hDetails.emergencyDept.status !== 'FULL' },
                    { label: 'ICU', ok: hDetails.icu.available > 0 },
                    { label: 'General Beds', ok: hDetails.generalBeds.available > 0 },
                    { label: 'Trauma Unit', ok: hDetails.trauma.status !== 'FULL' },
                    { label: 'Cardiac Unit', ok: hDetails.cardiac.status !== 'FULL' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-secondary flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-positive' : 'bg-warning'}`} />
                        {r.label}
                      </span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                        <div className={`h-full rounded-full ${r.ok ? 'bg-positive w-[90%]' : 'bg-warning w-[30%]'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })() : (
             <div className="flex flex-col items-center justify-center h-40">
               <p className="text-warning text-sm">Hospital recommendation unavailable. Contact dispatch.</p>
             </div>
          )}
        </div>

        {/* Route Alerts */}
        <div className="bg-surface-panel border border-hairline rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-tertiary font-semibold mb-4">Route Alerts</p>
          <div className="space-y-3">
            {[
              { msg: 'System Online', type: 'active' as const }
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl p-4 border-l-4 ${
                a.type === 'active' ? 'border-l-operational bg-operational-bg text-operational' : ''
              }`}>
                <span className="flex-shrink-0">ℹ</span>
                <span className="text-sm">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
