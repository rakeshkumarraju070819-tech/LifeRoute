import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import TomTomMap from '../../components/TomTomMap';
import { apiRequest } from '../../services/api';

const STATUSES = ['AVAILABLE', 'DISPATCHED', 'EN ROUTE TO PATIENT', 'PATIENT PICKED UP', 'EN ROUTE TO HOSPITAL', 'ARRIVED'];

const HOSPITAL_OPTIONS = [
  { id: 'H1', name: 'City General Hospital', status: 'OPEN', location: { lat: 40.7135, lng: -74.002 }, emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 12, total: 20 }, cardiac: { status: 'AVAILABLE' }, trauma: { status: 'AVAILABLE' } },
  { id: 'H2', name: 'St. Mary Medical Center', status: 'LIMITED', location: { lat: 40.719, lng: -73.99 }, emergencyDepartment: { status: 'LIMITED' }, icu: { available: 2, total: 20 }, cardiac: { status: 'AVAILABLE' }, trauma: { status: 'LIMITED' } },
  { id: 'H3', name: 'Metro Health Hospital', status: 'OPEN', location: { lat: 40.722, lng: -74.012 }, emergencyDepartment: { status: 'AVAILABLE' }, icu: { available: 5, total: 16 }, cardiac: { status: 'LIMITED' }, trauma: { status: 'AVAILABLE' } },
];

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState('EN ROUTE TO PATIENT');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [recommendation, setRecommendation] = useState<{ hospitalName: string; etaMinutes: number; distanceKm: number; confidence: number; specialty: string; readiness: { specialtyReady: boolean; icuReady: boolean } } | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const emergencyRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);

  // '/crew', '/crew/emergency' and '/crew/navigation' all render this same
  // dashboard. Scroll to the relevant section when a sidebar link is used so
  // navigation is visibly doing something.
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

  const updateStatus = async (nextStatus: string) => {
    const previousStatus = status;
    setStatusError('');
    setStatus(nextStatus);
    setShowStatusMenu(false);
    try {
      await apiRequest('/api/emergencies/EM-2024-0847/status', { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
    } catch (error) {
      setStatus(previousStatus);
      setStatusError(error instanceof Error ? error.message : 'Unable to update status.');
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
              <p className="text-white font-mono text-sm font-bold">{user?.ambulanceId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">Crew Lead</p>
              <p className="text-white text-sm">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">GPS Coordinates</p>
              <p className="text-white font-mono text-sm">40.7128° N, 74.0060° W</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">Last Update</p>
              <p className="text-white font-mono text-sm">14:32:07 EST</p>
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
              {status}
              <span className="text-purple-300">▾</span>
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-2 bg-[#1a2252] border border-white/10 rounded-xl shadow-2xl z-10 py-1 w-64">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => updateStatus(s)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between">
                    {s}
                    {s === status && <span className="text-purple-400">✓</span>}
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
          <p className="text-white text-2xl font-mono font-bold mt-3">40.7128° N</p>
          <p className="text-white text-2xl font-mono font-bold">74.0060° W</p>
          <p className="text-purple-300 text-sm mt-2">Zone 3 · Metro District</p>
        </div>

        {/* Card B: Active Emergency */}
        <div ref={emergencyRef} className="relative bg-[#12183d] border border-[rgba(255,255,255,0.08)] border-l-4 border-l-red-500 rounded-2xl p-6 scroll-mt-6">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold">Active Emergency</p>
            <StatusBadge status="CRITICAL" />
          </div>
          <p className="text-pink-400 text-xl font-bold mb-1">Cardiac Arrest</p>
          <p className="text-slate-200 text-sm mb-4">412 Oak Street, Zone 3</p>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-red-400 text-5xl font-bold font-mono leading-none">4</span>
            <span className="text-slate-400 text-sm mb-1">min</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-xs font-medium text-red-300">Medical Info: Patient on blood thinners. Known allergy: penicillin.</p>
          </div>
        </div>

        {/* Card C: AI Hospital Recommendation */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 to-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
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
            </>
          ) : (
            <p className="text-amber-300 text-sm py-6">Hospital recommendation unavailable. Contact dispatch.</p>
          )}
          {recommendation && <>
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
          </>}
        </div>
      </div>

      {/* SECTION 3 — LIVE NAVIGATION MAP */}
      <div ref={navigationRef} className="bg-[#0d1530] rounded-2xl p-6 scroll-mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-white font-bold text-lg">Live Navigation</p>
            <p className="text-purple-300 text-sm">Recommended route via Oak St → Medical Blvd</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-medium">Primary Route</button>
            <button className="border border-white/20 text-slate-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/5">Alt Route</button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <TomTomMap height="380px" variant="crew" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-[#1a2252] rounded-xl px-4 py-3">
            <p className="text-purple-300 text-xs uppercase tracking-widest font-semibold mb-1">Route</p>
            <p className="text-white text-sm font-mono">Via Oak St → Medical Blvd</p>
          </div>
          <div className="bg-[#1a2252] rounded-xl px-4 py-3">
            <p className="text-purple-300 text-xs uppercase tracking-widest font-semibold mb-1">Distance</p>
            <p className="text-white text-sm font-mono">3.2 km</p>
          </div>
          <div className="bg-[#1a2252] rounded-xl px-4 py-3">
            <p className="text-purple-300 text-xs uppercase tracking-widest font-semibold mb-1">Estimated</p>
            <p className="text-white text-sm font-mono">8 min</p>
          </div>
        </div>
      </div>

      {/* SECTION 4 — TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Route Alerts</p>
          <div className="space-y-3">
            {[
              { msg: 'Heavy congestion on Main St — Route recalculated', type: 'warning' },
              { msg: 'Road closure: Bridge Ave northbound', type: 'emergency' },
              { msg: 'Hospital capacity changed — recommendation updated', type: 'active' },
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
            {[
              { label: 'Accept Emergency', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
              { label: 'Confirm Pickup', color: 'bg-green-500 hover:bg-green-600 text-white' },
              { label: 'Patient Picked Up', color: 'bg-green-600 hover:bg-green-700 text-white' },
              { label: 'Arrived at Hospital', color: 'bg-purple-700 hover:bg-purple-800 text-white' },
              { label: 'Report Obstruction', color: 'border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300' },
              { label: 'Contact Dispatcher', color: 'border border-white/20 bg-white/5 hover:bg-white/10 text-slate-200' },
            ].map(a => (
              <button key={a.label} className={`${a.color} rounded-xl py-4 text-sm font-semibold transition-colors text-left px-4`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
