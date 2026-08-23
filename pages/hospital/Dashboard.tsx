import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import type { Hospital } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import KPICard from '../../components/KPICard';
import { useSharedDataSync } from '../../hooks/useSharedDataSync';
import { hospitalService } from '../../services/hospitalService';
import { emergencyService } from '../../services/emergencyService';

type CapacityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const capacityRef = useRef<HTMLDivElement>(null);
  const incomingRef = useRef<HTMLDivElement>(null);
  const readinessRef = useRef<HTMLDivElement>(null);

  const { hospitals, emergencies } = useSharedDataSync();

  // Assuming logged-in user belongs to City General Hospital for demo
  const myHospitalId = 'HOSP-001'; 
  const myHospital = hospitals.find(h => h.hospitalId === myHospitalId);

  const [hospitalStatus, setHospitalStatus] = useState<string>('AVAILABLE');

  // Keep local status in sync when shared data updates (e.g. after reset)
  useEffect(() => {
    if (myHospital) setHospitalStatus(myHospital.emergencyDepartmentStatus);
  }, [myHospital?.emergencyDepartmentStatus]);

  const incomingEmergencies = emergencies.filter(e => 
    e.recommendedHospitalId === myHospitalId && 
    e.status === 'EN ROUTE TO HOSPITAL'
  );

  const updateAvail = (dept: string, delta: number) => {
    if (!myHospital) return;

    if (dept === 'General Beds') {
      const next = Math.max(0, Math.min(myHospital.totalBeds, myHospital.availableBeds + delta));
      hospitalService.updateHospitalCapacity(myHospitalId, { availableBeds: next });
    } else if (dept === 'ICU Beds') {
      const next = Math.max(0, Math.min(myHospital.icuTotal, myHospital.icuAvailable + delta));
      hospitalService.updateHospitalCapacity(myHospitalId, { icuAvailable: next });
    } else if (dept === 'Emergency Dept') {
      const next = Math.max(0, Math.min(30, myHospital.emergencyBedsAvailable + delta)); // Mock total to 30
      hospitalService.updateHospitalCapacity(myHospitalId, { emergencyBedsAvailable: next });
    }
  };

  const handleHospitalStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Hospital['emergencyDepartmentStatus'];
    setHospitalStatus(val);
    hospitalService.updateHospitalCapacity(myHospitalId, { emergencyDepartmentStatus: val });
  };

  const STATUS_OPTS: Hospital['emergencyDepartmentStatus'][] = ['AVAILABLE', 'BUSY', 'FULL'];

  useEffect(() => {
    if (location.pathname.endsWith('/capacity')) {
      capacityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (location.pathname.endsWith('/incoming')) {
      incomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (location.pathname.endsWith('/readiness')) {
      readinessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  if (!myHospital) return <div className="p-6 text-white text-center">Loading hospital data...</div>;

  const generalPct = myHospital.availableBeds / myHospital.totalBeds;
  const icuPct = myHospital.icuAvailable / myHospital.icuTotal;
  const emergencyPct = myHospital.emergencyBedsAvailable / (myHospital.emergencyBeds || 30);

  const getStatus = (pct: number): CapacityStatus => pct === 0 ? 'FULL' : pct < 0.3 ? 'LIMITED' : 'AVAILABLE';

  const capacity = {
    'General Beds': { avail: myHospital.availableBeds, total: myHospital.totalBeds, status: getStatus(generalPct), pct: generalPct },
    'ICU Beds': { avail: myHospital.icuAvailable, total: myHospital.icuTotal, status: getStatus(icuPct), pct: icuPct },
    'Emergency Dept': { avail: myHospital.emergencyBedsAvailable, total: myHospital.emergencyBeds || 30, status: getStatus(emergencyPct), pct: emergencyPct },
    'Trauma Unit': { avail: myHospital.emergencyBedsAvailable > 0 ? 2 : 0, total: 4, status: getStatus(myHospital.emergencyBedsAvailable > 0 ? 0.5 : 0), pct: myHospital.emergencyBedsAvailable > 0 ? 0.5 : 0 },
    'Cardiac Unit': { avail: myHospital.icuAvailable > 0 ? 3 : 0, total: 6, status: getStatus(myHospital.icuAvailable > 0 ? 0.5 : 0), pct: myHospital.icuAvailable > 0 ? 0.5 : 0 },
  };

  const handleAccept = (em: any) => {
    hospitalService.acceptIncomingEmergency(myHospitalId, em.emergencyId);
  };

  const handleReject = (em: any) => {
    hospitalService.rejectIncomingEmergency(myHospitalId, em.emergencyId);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{myHospital.name}</h1>
          <p className="text-slate-400 text-sm">{user?.department || 'Emergency Administration'} · {user?.name || 'Staff'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Hospital Status:</span>
          <select value={hospitalStatus} onChange={handleHospitalStatusChange}
            className="bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-purple-400">
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <StatusBadge status={hospitalStatus} size="md" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <KPICard label="General Beds Available" value={`${capacity['General Beds'].avail}/${capacity['General Beds'].total}`} accent="available" icon="🛏" />
        <KPICard label="ICU Beds Available" value={`${capacity['ICU Beds'].avail}/${capacity['ICU Beds'].total}`} accent="available" icon="🏥" />
        <KPICard label="Incoming Ambulances" value={incomingEmergencies.length.toString()} accent="warning" icon="🚑" />
        <KPICard label="Critical Incoming" value={incomingEmergencies.filter(i => i.severity === 'CRITICAL').length.toString()} accent="emergency" icon="⚡" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Management */}
        <div ref={capacityRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
          <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Capacity Management</p>
          <div className="space-y-4">
            {Object.entries(capacity).map(([dept, d]) => (
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
                    <div className={`h-2 rounded-full transition-all ${d.pct > 0.5 ? 'bg-green-500' : d.pct > 0.2 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${d.pct * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateAvail(dept, -1)}
                      className="w-8 h-8 rounded-lg bg-[#1a2252] border border-white/10 text-white hover:bg-purple-700/30 text-xs flex items-center justify-center">−</button>
                    <button onClick={() => updateAvail(dept, 1)}
                      className="w-8 h-8 rounded-lg bg-[#1a2252] border border-white/10 text-white hover:bg-purple-700/30 text-xs flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Ambulances */}
        <div className="space-y-6">
          <div ref={incomingRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
            <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Incoming Ambulances</p>
            {incomingEmergencies.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No incoming ambulances</p>
            ) : (
              <div className="space-y-3">
                {incomingEmergencies.map(inc => (
                  <div key={inc.emergencyId} className={`rounded-xl p-4 border ${inc.severity === 'CRITICAL' ? 'bg-red-900/20 border-red-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono font-bold text-sm text-white">{inc.assignedAmbulanceId || 'Unknown Unit'}</span>
                        <span className="text-slate-400 text-xs ml-2 font-mono">{inc.emergencyId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inc.severity} />
                        <span className="font-bold text-white font-mono text-2xl">{inc.eta || 'Unknown'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-3">{inc.type} · from {inc.pickupLocation}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(inc)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-xl font-semibold transition-colors">
                        Accept Incoming
                      </button>
                      <button onClick={() => handleReject(inc)} className="flex-1 border border-red-400 text-red-400 hover:bg-red-900/20 text-xs px-3 py-2 rounded-xl font-semibold transition-colors">
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
                { name: 'Emergency Department', status: myHospital.emergencyDepartmentStatus as CapacityStatus },
                { name: 'ICU', status: capacity['ICU Beds'].status },
                { name: 'Trauma Unit', status: capacity['Trauma Unit'].status },
                { name: 'Cardiac Unit', status: capacity['Cardiac Unit'].status },
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
            {incomingEmergencies.map(inc => (
              <tr key={inc.emergencyId} className="hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-xs font-bold text-white">{inc.assignedAmbulanceId || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{inc.emergencyId}</td>
                <td className="px-4 py-3 text-white">{inc.type}</td>
                <td className="px-4 py-3"><StatusBadge status={inc.severity} /></td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-white">{inc.eta || 'Unknown'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{inc.pickupLocation}</td>
                <td className="px-4 py-3"><StatusBadge status="ON ROUTE" /></td>
                <td className="px-4 py-3"><StatusBadge status="EXPECTED" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
