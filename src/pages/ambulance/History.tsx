import StatusBadge from '../../components/StatusBadge';
import { useSharedDataSync } from '../../hooks/useSharedDataSync';

export default function AmbulanceHistory() {
  const { emergencies, hospitals } = useSharedDataSync();

  // For crew history, typically show completed emergencies, or all emergencies assigned to them.
  // We'll show all COMPLETED emergencies for now, or just limit to a few.
  const history = emergencies.filter(e => e.status === 'COMPLETED');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">Emergency History</h1>
      <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0d1530] border-b border-white/5">
              {['Emergency ID','Type','Severity','Pickup','Hospital','Status','Duration','Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.map(r => {
              const recHospital = r.recommendedHospitalId ? hospitals.find(h => h.hospitalId === r.recommendedHospitalId)?.name : '—';
              const date = new Date(r.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              
              return (
                <tr key={r.emergencyId} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-200">{r.emergencyId}</td>
                  <td className="px-4 py-3 text-white">{r.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.severity} /></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.pickupLocation}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{recHospital}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">—</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{date}</td>
                </tr>
              );
            })}
            
            {history.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
