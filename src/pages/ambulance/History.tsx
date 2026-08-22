import StatusBadge from '../../components/StatusBadge';

const HISTORY = [
  { id: 'EM-2024-0831', type: 'Cardiac Arrest', severity: 'CRITICAL', pickup: '88 Elm St', hospital: 'City General', status: 'COMPLETED', duration: '18 min', date: 'Aug 22, 14:05' },
  { id: 'EM-2024-0819', type: 'Fall Injury', severity: 'MEDIUM', pickup: '14 Park Blvd', hospital: 'Metro Health', status: 'COMPLETED', duration: '24 min', date: 'Aug 22, 12:45' },
  { id: 'EM-2024-0804', type: 'Traffic Accident', severity: 'HIGH', pickup: 'I-95 Exit 7', hospital: 'St. Mary Medical', status: 'COMPLETED', duration: '31 min', date: 'Aug 22, 10:12' },
  { id: 'EM-2024-0798', type: 'Respiratory', severity: 'HIGH', pickup: '210 Cedar Ave', hospital: 'City General', status: 'COMPLETED', duration: '22 min', date: 'Aug 21, 20:08' },
];

export default function AmbulanceHistory() {
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
            {HISTORY.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-slate-200">{r.id}</td>
                <td className="px-4 py-3 text-white">{r.type}</td>
                <td className="px-4 py-3"><StatusBadge status={r.severity} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.pickup}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{r.hospital}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 font-mono text-xs text-slate-200">{r.duration}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
