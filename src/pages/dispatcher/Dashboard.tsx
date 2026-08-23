// Dispatcher Dashboard - cleaned version with shared data sync
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Siren, Truck, Radio, Building2, Zap } from 'lucide-react';
import KPICard from '../../components/KPICard';
import StatusBadge from '../../components/StatusBadge';
import TomTomMap from '../../components/TomTomMap';
import { useSharedDataSync } from '../../hooks/useSharedDataSync';
import { emergencyService } from '../../services/emergencyService';
import { ambulanceService } from '../../services/ambulanceService';
import { hospitalService } from '../../services/hospitalService';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 font-bold',
  HIGH: 'text-amber-400 font-semibold',
  MEDIUM: 'text-blue-400',
  LOW: 'text-slate-400',
};

function tabForPath(pathname: string): 'overview' | 'fleet' | 'map' {
  if (pathname.endsWith('/fleet')) return 'fleet';
  if (pathname.endsWith('/map')) return 'map';
  return 'overview';
}

export default function DispatcherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'fleet' | 'map'>(tabForPath(location.pathname));
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // unified data layer
  const { emergencies, ambulances, hospitals } = useSharedDataSync();

  // Form state for creating emergency (uses shared service)
  const [formType, setFormType] = useState('Cardiac Arrest');
  const [formSeverity, setFormSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');
  const [formLocation, setFormLocation] = useState('');
  const [formAmbulanceId, setFormAmbulanceId] = useState('');
  const [formHospitalId, setFormHospitalId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const hospitalsRef = useRef<HTMLDivElement>(null);

  const activeEmergenciesCount = emergencies.filter(e => e.status !== 'COMPLETED' && e.status !== 'CANCELLED').length;
  const availableAmbulancesCount = ambulances.filter(a => ambulanceService.isAmbulanceAvailable(a.ambulanceId, emergencies)).length;
  const activeAmbulancesCount = ambulances.filter(a => !ambulanceService.isAmbulanceAvailable(a.ambulanceId, emergencies)).length;
  const hospitalsAvailableCount = hospitals.filter(h => hospitalService.getHospitalCapacityDetails(h).overallStatus === 'AVAILABLE').length;
  const criticalEmergenciesCount = emergencies.filter(e => e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && e.severity === 'CRITICAL').length;

  useEffect(() => {
    setTab(tabForPath(location.pathname));
    if (location.pathname.endsWith('/hospitals')) {
      hospitalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  const filteredEM = emergencies.filter(e => {
    // By default hide completed/cancelled (history)
    if (!showHistory && (e.status === 'COMPLETED' || e.status === 'CANCELLED')) return false;
    if (filterSeverity !== 'ALL' && e.severity !== filterSeverity) return false;
    if (search && !e.emergencyId.toLowerCase().includes(search.toLowerCase()) &&
        !e.type.toLowerCase().includes(search.toLowerCase()) &&
        !e.pickupLocation.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDispatch = async () => {
    if (!formLocation) return alert('Please specify a pickup location.');
    if (formAmbulanceId) {
      const active = emergencies.find(
        e => e.assignedAmbulanceId === formAmbulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
      );
      if (active) {
        setCreateError(`${formAmbulanceId} is currently busy with ${active.emergencyId}.`);
        return;
      }
    }
    try {
      setCreateLoading(true);
      setCreateError('');
      // If the dispatcher left "Assign Hospital" on its default, fall back
      // to an auto-recommendation rather than always leaving it null.
      const recommendedHospitalId =
        formHospitalId || emergencyService.getRecommendedHospital({ severity: formSeverity } as any, hospitals);
      const emergency = emergencyService.createEmergency({
        type: formType,
        severity: formSeverity,
        pickupLocation: formLocation,
        assignedAmbulanceId: formAmbulanceId || null,
        recommendedHospitalId,
        notes: formNotes,
      });
      if (formAmbulanceId) {
        ambulanceService.assignAmbulance(formAmbulanceId, emergency.emergencyId);
      }
      setShowCreate(false);
      // reset form
      setFormType('Cardiac Arrest');
      setFormSeverity('CRITICAL');
      setFormLocation('');
      setFormAmbulanceId('');
      setFormHospitalId('');
      setFormNotes('');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create emergency.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dispatcher Dashboard</h1>
          <p className="text-slate-400 text-sm">Central Dispatch Authority · Shift 14:00–22:00</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">+ New Emergency</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <KPICard label="Active Emergencies" value={activeEmergenciesCount.toString()} accent="critical" icon={Siren} />
        <KPICard label="Available Ambulances" value={availableAmbulancesCount.toString()} accent="positive" icon={Truck} />
        <KPICard label="Active Ambulances" value={activeAmbulancesCount.toString()} accent="operational" icon={Radio} />
        <KPICard label="Hospitals Available" value={hospitalsAvailableCount.toString()} accent="positive" icon={Building2} />
        <KPICard label="Critical Emergencies" value={criticalEmergenciesCount.toString()} accent="critical" icon={Zap} />
      </div>

      {/* Tab bar */}
      <div className="bg-[#0d1530] rounded-2xl p-1 inline-flex gap-1">
        {(['overview', 'fleet', 'map'] as const).map(t => (
          <button key={t} onClick={() => navigate(t === 'overview' ? '/dispatcher/emergencies' : `/dispatcher/${t}`)} className={`px-5 py-2 text-sm font-medium capitalize transition-colors rounded-xl ${tab === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t === 'overview' ? 'Emergencies' : t === 'fleet' ? 'Fleet' : 'Live Map'}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} className="bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 w-56" placeholder="Search ID, type, location…" />
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <button
              onClick={() => setShowHistory(h => !h)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${showHistory ? 'bg-purple-600 text-white border-purple-500' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {showHistory ? '🕐 Hiding History' : '🕐 Show History'}
            </button>
            <span className="text-xs text-slate-500 font-mono">{filteredEM.length} shown</span>
          </div>
          <div className="bg-[#12183d] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1530] border-b border-white/5">
                  {['Emergency ID','Type','Severity','Location','Ambulance','Status','ETA','Hospital','Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEM.map(e => {
                  const hospObj = e.recommendedHospitalId ? hospitals.find(h => h.hospitalId === e.recommendedHospitalId) : null;
                  const recHospital = hospObj ? hospObj.name : '—';
                  const time = new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={e.emergencyId} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-200 font-medium">{e.emergencyId}</td>
                      <td className="px-4 py-3 text-white">{e.type}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-mono uppercase ${SEVERITY_COLOR[e.severity] || ''}`}>{e.severity}</span></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{e.pickupLocation}</td>
                      <td className="px-4 py-3 font-mono text-xs text-purple-300">{e.assignedAmbulanceId || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200">{e.eta}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-slate-300">{recHospital}</span>
                        {e.hospitalResponse && (
                          <span className={`block font-mono text-[10px] ${
                            e.hospitalResponse === 'ACCEPTED' ? 'text-green-400' :
                            e.hospitalResponse === 'DECLINED' ? 'text-red-400' :
                            'text-amber-400'
                          }`}>
                            {e.hospitalResponse === 'ACCEPTED' ? '• READY/ACCEPTED' : `• ${e.hospitalResponse}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{time}</td>
                    </tr>
                  );
                })}
                {filteredEM.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No emergencies found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'fleet' && (
        <div className="bg-[#12183d] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1530] border-b border-white/5">
                {['Unit ID','Status','Location','Emergency','Crew','ETA','Updated','Signal'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ambulances.map(u => {
                const updatedTime = new Date(u.lastUpdatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={u.ambulanceId} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-white">{u.ambulanceId}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.station || 'City Area'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-purple-300">{u.assignedEmergencyId || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{u.crew}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200">—</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{updatedTime}</td>
                    <td className="px-4 py-3"><span className={`w-2 h-2 rounded-full inline-block ${u.status !== 'OFF DUTY' ? 'bg-green-400' : 'bg-slate-600'}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'map' && (
        <div className="bg-[#0d1530] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-bold text-lg">Live City Map</p>
            <p className="text-xs text-slate-400 font-mono">Auto-refresh every 5s</p>
          </div>
          <div className="rounded-2xl overflow-hidden"><TomTomMap height="480px" showFilters variant="dispatcher" /></div>
        </div>
      )}

      {/* Hospital status strip */}
      <div ref={hospitalsRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
        <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Hospital Network Status</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hospitals.map(h => {
            const details = hospitalService.getHospitalCapacityDetails(h);
            const incomingText = hospitalService.getHospitalIncomingText(h.hospitalId, emergencies);
            return (
              <div key={h.hospitalId} className="bg-[#12183d] rounded-2xl p-6 border border-white/5">
                <p className="text-white font-bold text-sm mb-3">{h.name}</p>
                <div className="space-y-1.5 text-xs">
                  {[
                    { k: 'Emergency Dept', v: details.emergencyDept.status },
                    { k: 'ICU', v: details.icu.text },
                    { k: 'General Beds', v: details.generalBeds.text },
                    { k: 'Trauma', v: details.trauma.status },
                    { k: 'Cardiac', v: details.cardiac.status },
                  ].map(r => (
                    <div key={r.k} className="flex justify-between">
                      <span className="text-slate-400">{r.k}</span>
                      <span className={`font-mono font-medium ${
                        r.v === 'AVAILABLE' ? 'text-green-400' :
                        (r.v === 'BUSY' || r.v === 'LIMITED') ? 'text-amber-400' :
                        r.v === 'FULL' ? 'text-red-400' :
                        'text-slate-200'
                      }`}>{r.v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Incoming</span>
                    <span className="font-mono font-medium text-purple-300">{incomingText}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Emergency Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-[#12183d] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">New Emergency</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Emergency Type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                    <option>Cardiac Arrest</option>
                    <option>Traffic Accident</option>
                    <option>Respiratory Distress</option>
                    <option>Trauma</option>
                    <option>Vehicle Accident</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
                  <select value={formSeverity} onChange={e => setFormSeverity(e.target.value as any)} className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                    <option>CRITICAL</option>
                    <option>HIGH</option>
                    <option>MEDIUM</option>
                    <option>LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pickup Location</label>
                  <input value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" placeholder="Street address, zone…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assign Ambulance</label>
                  <select value={formAmbulanceId} onChange={e => {
                    setFormAmbulanceId(e.target.value);
                    setCreateError('');
                  }} className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                    <option value="">-- None (Assign Later) --</option>
                    {ambulances.map(a => {
                      const active = emergencies.find(
                        e => e.assignedAmbulanceId === a.ambulanceId && !['COMPLETED', 'CANCELLED'].includes(e.status)
                      );
                      const isBusy = !!active || a.status === 'OFF DUTY';
                      return (
                        <option key={a.ambulanceId} value={a.ambulanceId} disabled={isBusy}>
                          {a.ambulanceId} — {isBusy ? `BUSY • ${active?.emergencyId || a.status}` : 'AVAILABLE'} · {a.station}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assign Hospital</label>
                  <select value={formHospitalId} onChange={e => setFormHospitalId(e.target.value)} className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                    <option value="">-- None (Assign Later) --</option>
                    {hospitals.filter(h => hospitalService.getHospitalCapacityDetails(h).overallStatus !== 'FULL').map(h => {
                      const d = hospitalService.getHospitalCapacityDetails(h);
                      return (
                        <option key={h.hospitalId} value={h.hospitalId}>
                          {h.name} — {d.overallStatus} · ICU {d.icu.text}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 h-20 resize-none" placeholder="Additional information…" />
              </div>
              {createError && <p className="text-red-400 text-sm mt-4">{createError}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-white/10 text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-white/5">Cancel</button>
                <button onClick={handleDispatch} disabled={createLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  {createLoading ? 'Dispatching…' : 'Dispatch Emergency'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

