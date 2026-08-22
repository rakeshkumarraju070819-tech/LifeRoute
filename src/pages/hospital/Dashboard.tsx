import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import KPICard from '../../components/KPICard';
import { apiRequest } from '../../services/api';

const INCOMING = [
  { ambulance: 'AMB-042', emergency: 'EM-2024-0847', type: 'Cardiac Arrest', severity: 'CRITICAL', eta: '4 min', location: 'Oak St', route: 'ON ROUTE', arrival: 'EXPECTED' },
  { ambulance: 'AMB-085', emergency: 'EM-2024-0848', type: 'Traffic Accident', severity: 'HIGH', eta: '9 min', location: 'River Rd', route: 'ON ROUTE', arrival: 'EXPECTED' },
];

type CapacityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL';

interface CapacityDept {
  avail: number;
  total: number;
  status: CapacityStatus;
}

export default function HospitalDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const capacityRef = useRef<HTMLDivElement>(null);
  const incomingRef = useRef<HTMLDivElement>(null);
  const readinessRef = useRef<HTMLDivElement>(null);
  const [hospitalStatus, setHospitalStatus] = useState<string>('OPEN');
  const [capacity, setCapacity] = useState<Record<string, CapacityDept>>({
    'General Beds': { avail: 45, total: 80, status: 'AVAILABLE' },
    'ICU Beds': { avail: 8, total: 20, status: 'AVAILABLE' },
    'Emergency Dept': { avail: 6, total: 12, status: 'AVAILABLE' },
    'Trauma Unit': { avail: 2, total: 4, status: 'LIMITED' },
    'Cardiac Unit': { avail: 3, total: 6, status: 'AVAILABLE' },
  });

  useEffect(() => {
    apiRequest<{ operationalStatus: string; departments: Record<string, CapacityDept> }>('/api/hospital/capacity')
      .then(data => { setHospitalStatus(data.operationalStatus); setCapacity(data.departments); })
      .catch(() => undefined);
  }, []);

  const updateAvail = (dept: string, delta: number) => {
    setCapacity(c => {
      const d = c[dept];
      const next = Math.max(0, Math.min(d.total, d.avail + delta));
      const pct = next / d.total;
      const status: CapacityStatus = pct === 0 ? 'FULL' : pct < 0.3 ? 'LIMITED' : 'AVAILABLE';
      const updated = { ...c, [dept]: { ...d, avail: next, status } };
      apiRequest('/api/hospital/capacity', { method: 'PATCH', body: JSON.stringify({ operationalStatus: hospitalStatus, departments: updated }) }).catch(() => undefined);
      return updated;
    });
  };

  const STATUS_OPTS = ['OPEN', 'LIMITED', 'FULL', 'EMERGENCY ONLY', 'CLOSED'];

  // '/hospital', '/hospital/capacity', '/hospital/incoming' and
  // '/hospital/readiness' all render this same dashboard. Scroll to the
  // relevant section when a sidebar link is used so navigation is visibly
  // doing something.
  useEffect(() => {
    if (location.pathname.endsWith('/capacity')) {
      capacityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (location.pathname.endsWith('/incoming')) {
      incomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (location.pathname.endsWith('/readiness')) {
      readinessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{user?.organization}</h1>
          <p className="text-slate-400 text-sm">{user?.department} · {user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Hospital Status:</span>
          <select value={hospitalStatus} onChange={e => {
            const nextStatus = e.target.value;
            setHospitalStatus(nextStatus);
            apiRequest('/api/hospital/capacity', { method: 'PATCH', body: JSON.stringify({ operationalStatus: nextStatus, departments: capacity }) }).catch(() => undefined);
          }}
            className="bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-purple-400">
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <StatusBadge status={hospitalStatus} size="md" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <KPICard label="General Beds Available" value={`${capacity['General Beds'].avail}/${capacity['General Beds'].total}`} accent="available" icon="🛏" />
        <KPICard label="ICU Beds Available" value={`${capacity['ICU Beds'].avail}/${capacity['ICU Beds'].total}`} accent="available" icon="🏥" />
        <KPICard label="Incoming Ambulances" value={INCOMING.length} accent="warning" icon="🚑" />
        <KPICard label="Critical Incoming" value={INCOMING.filter(i => i.severity === 'CRITICAL').length} accent="emergency" icon="⚡" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Management */}
        <div ref={capacityRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Capacity Management</p>
          <div className="space-y-4">
            {Object.entries(capacity).map(([dept, d]) => {
              const pct = d.avail / d.total;
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{dept}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-semibold ${d.status === 'AVAILABLE' ? 'text-green-400' : d.status === 'LIMITED' ? 'text-amber-400' : 'text-red-400'}`}>
                        {d.avail}/{d.total}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${d.status === 'AVAILABLE' ? 'bg-green-400' : d.status === 'LIMITED' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#0d1530] rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${pct > 0.5 ? 'bg-green-500' : pct > 0.2 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${pct * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateAvail(dept, -1)}
                        className="w-8 h-8 rounded-lg bg-[#1a2252] border border-white/10 text-white hover:bg-purple-700/30 text-xs flex items-center justify-center">−</button>
                      <button onClick={() => updateAvail(dept, 1)}
                        className="w-8 h-8 rounded-lg bg-[#1a2252] border border-white/10 text-white hover:bg-purple-700/30 text-xs flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incoming Ambulances */}
        <div className="space-y-6">
          <div ref={incomingRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
            <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Incoming Ambulances</p>
            {INCOMING.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No incoming ambulances</p>
            ) : (
              <div className="space-y-3">
                {INCOMING.map(inc => (
                  <div key={inc.ambulance} className={`rounded-xl p-4 border ${inc.severity === 'CRITICAL' ? 'bg-red-900/20 border-red-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono font-bold text-sm text-white">{inc.ambulance}</span>
                        <span className="text-slate-400 text-xs ml-2 font-mono">{inc.emergency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inc.severity} />
                        <span className="font-bold text-white font-mono text-2xl">{inc.eta}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-3">{inc.type} · from {inc.location}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-xl font-semibold transition-colors">
                        Accept Incoming
                      </button>
                      <button className="flex-1 border border-red-400 text-red-400 hover:bg-red-900/20 text-xs px-3 py-2 rounded-xl font-semibold transition-colors">
                        Mark Unavailable
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Readiness */}
          <div ref={readinessRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
            <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Emergency Readiness</p>
            <div className="space-y-2">
              {[
                { name: 'Emergency Department', status: 'AVAILABLE' as CapacityStatus },
                { name: 'ICU', status: 'AVAILABLE' as CapacityStatus },
                { name: 'Trauma Unit', status: 'LIMITED' as CapacityStatus },
                { name: 'Cardiac Unit', status: 'AVAILABLE' as CapacityStatus },
                { name: 'Ventilators', status: 'AVAILABLE' as CapacityStatus },
                { name: 'Defibrillators', status: 'AVAILABLE' as CapacityStatus },
              ].map(r => (
                <div key={r.name} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-sm text-slate-200">{r.name}</span>
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${
                    r.status === 'AVAILABLE' ? 'text-green-400' : r.status === 'LIMITED' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${r.status === 'AVAILABLE' ? 'bg-green-400' : r.status === 'LIMITED' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incoming ambulances table */}
      <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-x-auto">
        <div className="px-6 py-4 border-b border-white/5">
          <p className="font-bold text-white">Ambulance Arrival Log</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0d1530] border-b border-white/5">
              {['Ambulance','Emergency','Type','Severity','ETA','Location','Route','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {INCOMING.map(inc => (
              <tr key={inc.ambulance} className="hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-xs font-bold text-white">{inc.ambulance}</td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{inc.emergency}</td>
                <td className="px-4 py-3 text-white">{inc.type}</td>
                <td className="px-4 py-3"><StatusBadge status={inc.severity} /></td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-white">{inc.eta}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{inc.location}</td>
                <td className="px-4 py-3"><StatusBadge status={inc.route} /></td>
                <td className="px-4 py-3"><StatusBadge status={inc.arrival} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
