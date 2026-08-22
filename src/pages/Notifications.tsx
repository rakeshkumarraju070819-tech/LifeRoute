import { useState } from 'react';
import { useAuth, type Role } from '../context/AuthContext';

const NOTIFS: Record<Role, { title: string; msg: string; time: string; type: 'emergency' | 'warning' | 'info' }[]> = {
  AMBULANCE_CREW: [
    { title: 'New Emergency Assignment', msg: 'EM-2024-0847 · Cardiac Arrest at 412 Oak St. Severity: CRITICAL.', time: '14:28', type: 'emergency' },
    { title: 'Route Recalculated', msg: 'Heavy congestion on Main St detected. New route via Oak Ave recommended.', time: '14:30', type: 'warning' },
    { title: 'Hospital Recommendation Updated', msg: 'City General now preferred. ICU and Cardiac Unit available.', time: '14:31', type: 'info' },
    { title: 'Dispatcher Message', msg: 'Proceed with caution — road works near Bridge Ave northbound.', time: '14:33', type: 'info' },
  ],
  DISPATCHER: [
    { title: 'New Emergency Reported', msg: 'EM-2024-0849 · Respiratory Distress at 230 Pine Ave. Awaiting assignment.', time: '14:35', type: 'emergency' },
    { title: 'Critical Emergency Alert', msg: 'EM-2024-0847 · Cardiac Arrest. AMB-042 en route — ETA 4 min.', time: '14:28', type: 'emergency' },
    { title: 'Hospital Capacity Changed', msg: 'St. Mary Medical ICU now LIMITED (18/20). Consider City General.', time: '14:25', type: 'warning' },
    { title: 'Ambulance Delayed', msg: 'AMB-031 delayed by road closure on Bridge Ave. ETA extended by 3 min.', time: '14:22', type: 'warning' },
    { title: 'Ambulance Back Online', msg: 'AMB-017 available at Station 7 after maintenance.', time: '13:58', type: 'info' },
  ],
  HOSPITAL_STAFF: [
    { title: 'Incoming Ambulance Alert', msg: 'AMB-042 inbound with Cardiac Arrest patient. Severity: CRITICAL. ETA: 4 min.', time: '14:32', type: 'emergency' },
    { title: 'Emergency Severity Alert', msg: 'AMB-085 inbound with HIGH severity Traffic Accident. ETA: 9 min.', time: '14:33', type: 'warning' },
    { title: 'ICU Capacity Warning', msg: 'ICU occupancy at 85%. Consider updating availability status.', time: '14:20', type: 'warning' },
    { title: 'Hospital Status Alert', msg: 'Trauma Unit approaching capacity limit. Readiness status: LIMITED.', time: '14:10', type: 'info' },
  ],
};

const TYPE_STYLES = {
  emergency: { border: 'border-l-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500', label: 'text-red-400' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500', label: 'text-amber-400' },
  info: { border: 'border-l-blue-400', bg: 'bg-[#12183d]', dot: 'bg-blue-400', label: 'text-blue-400' },
};

export default function Notifications() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'emergency' | 'warning' | 'info'>('all');
  const notifs = NOTIFS[user?.role ?? 'DISPATCHER'];
  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <span className="text-xs font-mono text-slate-400">{notifs.length} total</span>
      </div>

      <div className="flex gap-2">
        {(['all', 'emergency', 'warning', 'info'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-[#12183d] border border-white/10 text-slate-300 hover:bg-white/5'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((n, i) => {
          const s = TYPE_STYLES[n.type];
          return (
            <div key={i} className={`border-l-4 ${s.border} ${s.bg} rounded-2xl border border-white/5 p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold ${s.label}`}>{n.title}</p>
                    <p className="text-slate-300 text-sm mt-0.5">{n.msg}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 flex-shrink-0">{n.time}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-[#12183d] rounded-2xl border border-[rgba(255,255,255,0.08)] p-12 text-center text-slate-400 text-sm">
            No notifications in this category.
          </div>
        )}
      </div>
    </div>
  );
}
