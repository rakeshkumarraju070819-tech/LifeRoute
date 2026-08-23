import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import TomTomMap from '../../components/TomTomMap';
import { useSharedDataSync } from '../../hooks/useSharedDataSync';
import { ambulanceService } from '../../services/ambulanceService';
import { emergencyService } from '../../services/emergencyService';
import { hospitalService } from '../../services/hospitalService';
import { EmergencyStatus } from '../../types';

const STATUSES = ['AVAILABLE', 'DISPATCHED', 'EN ROUTE TO PATIENT', 'PATIENT PICKED UP', 'EN ROUTE TO HOSPITAL', 'ARRIVED'];

const HOSPITAL_OPTIONS = [
  { id: 'H1', name: 'City General Hospital', status: 'OPEN', location: { lat: 40.7135, lng: -74.002 }, emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 12, total: 20 }, cardiac: { status: 'AVAILABLE' }, trauma: { status: 'AVAILABLE' } },
  { id: 'H2', name: 'St. Mary Medical Center', status: 'LIMITED', location: { lat: 40.719, lng: -73.99 }, emergencyDepartment: { status: 'LIMITED' }, icu: { available: 2, total: 20 }, cardiac: { status: 'AVAILABLE' }, trauma: { status: 'LIMITED' } },
  { id: 'H3', name: 'Metro Health Hospital', status: 'OPEN', location: { lat: 40.722, lng: -74.012 }, emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 5, total: 16 }, cardiac: { status: 'LIMITED' }, trauma: { status: 'AVAILABLE' } },
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

  // Use the ambulanceId from the logged-in user; fall back to AMB-001 for demo
  const myAmbulanceId = user?.ambulanceId || 'AMB-001';
  const myAmbulance = ambulances.find(a => a.ambulanceId === myAmbulanceId);

  // Exact single source of truth for active emergency assigned to this ambulance
  const activeEmergency = emergencies.find(
    e => e.assignedAmbulanceId === myAmbulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
  );
  const recommendedHospital = activeEmergency?.recommendedHospitalId
    ? hospitals.find(h => h.hospitalId === activeEmergency.recommendedHospitalId)
    : null;

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

      // Sync ambulance status with emergency status
      if (newStatus === 'COMPLETED') {
        ambulanceService.updateAmbulanceStatus(myAmbulanceId, 'AVAILABLE');
        ambulanceService.updateAmbulance(myAmbulanceId, { assignedEmergencyId: null });
      } else if (newStatus === 'ARRIVED_AT_HOSPITAL') {
        ambulanceService.updateAmbulanceStatus(myAmbulanceId, 'AT HOSPITAL');
      } else {
        ambulanceService.updateAmbulanceStatus(myAmbulanceId, 'EN ROUTE');
      }
    }
  };

  const getActionButtons = () => {
    if (!activeEmergency) return [];

    switch (activeEmergency.status) {
      case 'ASSIGNED':
        return [{ label: 'En Route to Patient', color: 'bg-blue-500 hover:bg-blue-600 text-white', action: () => handleStatusChange('EN_ROUTE_TO_PATIENT') }];
      case 'EN_ROUTE_TO_PATIENT':
        return [{ label: 'Arrived at Scene', color: 'bg-green-500 hover:bg-green-600 text-white', action: () => handleStatusChange('ARRIVED_AT_SCENE') }];
      case 'ARRIVED_AT_SCENE':
        return [{ label: 'Patient Picked Up', color: 'bg-green-600 hover:bg-green-700 text-white', action: () => handleStatusChange('PATIENT_PICKED_UP') }];
      case 'PATIENT_PICKED_UP':
        return [{ label: 'En Route to Hospital', color: 'bg-purple-600 hover:bg-purple-700 text-white', action: () => handleStatusChange('EN_ROUTE_TO_HOSPITAL') }];
      case 'EN_ROUTE_TO_HOSPITAL':
        return [{ label: 'Arrived at Hospital', color: 'bg-purple-700 hover:bg-purple-800 text-white', action: () => handleStatusChange('ARRIVED_AT_HOSPITAL') }];
      case 'ARRIVED_AT_HOSPITAL':
        return [{ label: 'Complete Mission', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', action: () => handleStatusChange('COMPLETED') }];
      default:
        return [];
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* SECTION 1 — TOP STATUS BAR */}
      <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">Unit ID</p>
              <p className="text-white font-mono text-sm font-bold">{myAmbulance?.ambulanceId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">Crew Lead</p>
              <p className="text-white text-sm">{myAmbulance?.crew || user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">GPS Coordinates</p>
              <p className="text-white font-mono text-sm">{myAmbulance?.currentLocation?.lat || '0'}° N, {myAmbulance?.currentLocation?.lng || '0'}° W</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">Last Update</p>
              <p className="text-white font-mono text-sm">{myAmbulance ? new Date(myAmbulance.lastUpdatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">Connection</p>
              <p className="text-green-400 font-mono text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
              </p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setShowStatusMenu(s => !s)}
              className="flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-full px-4 py-2 text-sm font-medium text-white hover:bg-purple-600/30 transition-colors">
              {myAmbulance?.status || 'UNKNOWN'}
              <span className="text-purple-300">▾</span>
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-2 bg-[#1a2252] border border-white/10 rounded-xl shadow-2xl z-10 py-1 w-64">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => {
                      ambulanceService.updateAmbulanceStatus(myAmbulanceId, s as any);
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between">
                    {s}
                    {s === myAmbulance?.status && <span className="text-purple-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {statusError && <p className="text-red-400 text-xs mt-2">{statusError}</p>}
        </div>
      </div>

      {/* SECTION 2 — THREE EQUAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card A: Current Location */}
        <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4 self-start">Current Location</p>
          <div className="relative flex items-center justify-center w-16 h-16 my-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/30 animate-ping" />
            <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 ring-1 ring-blue-400/40">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#60a5fa"/>
                <circle cx="12" cy="9" r="2.5" fill="#0a0f2e"/>
              </svg>
            </span>
          </div>
          <p className="text-white text-2xl font-mono font-bold mt-3">{myAmbulance?.currentLocation?.lat || '0'}° N</p>
          <p className="text-white text-2xl font-mono font-bold">{myAmbulance?.currentLocation?.lng || '0'}° W</p>
          <p className="text-purple-300 text-sm mt-2">{myAmbulance?.station || 'On Duty'}</p>
        </div>

        {/* Card B: Active Emergency */}
        <div ref={emergencyRef} className={`relative bg-[#12183d] border border-[rgba(255,255,255,0.08)] ${activeEmergency ? 'border-l-4 border-l-red-500' : ''} rounded-2xl p-6 scroll-mt-6`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold">Active Emergency</p>
            {activeEmergency && <StatusBadge status={activeEmergency.severity} />}
          </div>
          {activeEmergency ? (
            <>
              <p className="text-pink-400 text-xl font-bold mb-1">{activeEmergency.type}</p>
              <p className="text-white font-mono text-xs font-medium mb-1">{activeEmergency.emergencyId}</p>
              <p className="text-slate-200 text-sm mb-4">{activeEmergency.pickupLocation}</p>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-slate-400 text-sm mb-1">Status:</span>
                <span className="text-purple-300 font-bold font-mono">{activeEmergency.status.replace(/_/g, ' ')}</span>
              </div>
              {recommendedHospital && (
                <div className="mb-3 space-y-1 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Destination:</span>
                    <span className="text-green-400 font-semibold">{recommendedHospital.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Hospital Status:</span>
                    <span className={`font-mono font-bold ${
                      activeEmergency.hospitalResponse === 'ACCEPTED' ? 'text-green-400' :
                      activeEmergency.hospitalResponse === 'DECLINED' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>
                      {activeEmergency.hospitalResponse === 'ACCEPTED' ? 'READY TO RECEIVE' :
                       activeEmergency.hospitalResponse === 'DECLINED' ? 'DECLINED / RE-ASSIGNING' :
                       'WAITING FOR CONFIRMATION'}
                    </span>
                  </div>
                </div>
              )}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs font-medium text-red-300">Notes: {activeEmergency.notes || 'None'}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
               <p className="text-slate-400">No active emergency assigned.</p>
            </div>
          )}
        </div>

        {/* Card C: Hospital Destination */}
        <div className={`relative overflow-hidden ${activeEmergency && recommendedHospital ? 'bg-gradient-to-br from-purple-900/30 to-[#12183d]' : 'bg-[#12183d]'} border border-[rgba(255,255,255,0.08)] rounded-2xl p-6`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold">AI Hospital Recommendation</p>
            <span className="text-xs bg-purple-600/30 text-purple-200 px-2.5 py-1 rounded-full font-mono font-semibold">AI</span>
          </div>
          {recommendationLoading ? (
            <p className="text-slate-400 text-sm py-6">Calculating safest destination…</p>
          ) : recommendation ? (
            <>
              <p className="text-white text-xl font-bold mb-1">{recommendation.hospitalName}</p>
              <p className="text-purple-300 text-4xl font-mono font-bold mb-1">{recommendation.etaMinutes} min</p>
              <p className="text-slate-400 text-sm mb-4">{recommendation.distanceKm} km estimated travel distance</p>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Emergency Dept', ok: true },
                  { label: 'ICU', ok: recommendation.readiness.icuReady },
                  { label: 'Cardiac', ok: recommendation.readiness.specialtyReady },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-green-400' : 'bg-amber-400'}`} />
                      {r.label}
                    </span>
                    <div className="flex-1 mx-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${r.ok ? 'bg-green-400 w-[90%]' : 'bg-amber-400 w-[45%]'}`} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-green-400 font-bold text-sm border-t border-white/10 pt-3">{recommendation.confidence}% recommendation confidence</p>
            </>
          ) : activeEmergency && recommendedHospital ? (() => {
            const hDetails = hospitalService.getHospitalCapacityDetails(recommendedHospital);
            return (
              <>
                <p className="text-white text-xl font-bold mb-1">{recommendedHospital.name}</p>
                <p className="text-slate-400 text-sm mb-4">{hDetails.overallStatus === 'AVAILABLE' ? 'Emergency Dept Available' : hDetails.overallStatus === 'BUSY' ? 'Emergency Dept Busy' : 'Emergency Dept Full'}</p>
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Emergency Dept', ok: hDetails.emergencyDept.status !== 'FULL' },
                    { label: 'ICU', ok: hDetails.icu.available > 0 },
                    { label: 'General Beds', ok: hDetails.generalBeds.available > 0 },
                    { label: 'Trauma Unit', ok: hDetails.trauma.status !== 'FULL' },
                    { label: 'Cardiac Unit', ok: hDetails.cardiac.status !== 'FULL' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-green-400' : 'bg-amber-400'}`} />
                        {r.label}
                      </span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full ${r.ok ? 'bg-green-400 w-[90%]' : 'bg-amber-400 w-[30%]'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })() : (
             <div className="flex flex-col items-center justify-center h-40">
               <p className="text-amber-300 text-sm">Hospital recommendation unavailable. Contact dispatch.</p>
             </div>
          )}
        </div>
      </div>

      {/* SECTION 3 — LIVE NAVIGATION MAP */}
      <div ref={navigationRef} className="bg-[#0d1530] rounded-2xl p-6 scroll-mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-white font-bold text-lg">Live Navigation</p>
            {activeEmergency && (
              <p className="text-purple-300 text-sm">Destination: {recommendedHospital?.name || activeEmergency.pickupLocation}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-medium">Primary Route</button>
            <button className="border border-white/20 text-slate-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/5">Alt Route</button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <TomTomMap height="380px" variant="crew" />
        </div>
      </div>

      {/* SECTION 4 — TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Route Alerts</p>
          <div className="space-y-3">
            {[
              { msg: 'System Online', type: 'active' }
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl p-4 border-l-4 ${
                a.type === 'warning' ? 'border-l-amber-500 bg-amber-500/10 text-amber-300' :
                a.type === 'emergency' ? 'border-l-red-500 bg-red-500/10 text-red-300' :
                'border-l-blue-500 bg-blue-500/10 text-blue-300'
              }`}>
                <span className="flex-shrink-0">{a.type === 'warning' ? '⚠' : a.type === 'emergency' ? '🔴' : 'ℹ'}</span>
                <span className="text-sm">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Emergency Actions</p>
          <div className="grid grid-cols-2 gap-4">
            {getActionButtons().map(a => (
              <button
                key={a.label}
                onClick={a.action}
                className={`${a.color} rounded-xl py-4 text-sm font-semibold transition-colors text-center px-4`}
              >
                {a.label}
              </button>
            ))}

            {getActionButtons().length === 0 && (
               <p className="text-slate-400 col-span-2 text-center text-sm py-8">No actions available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
