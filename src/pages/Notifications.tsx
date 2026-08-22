import { useState } from 'react';
import { useAuth, type Role } from '../context/AuthContext';
import { useSharedDataSync } from '../hooks/useSharedDataSync';

const TYPE_STYLES = {
  emergency: { border: 'border-l-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500', label: 'text-red-400' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500', label: 'text-amber-400' },
  info: { border: 'border-l-blue-400', bg: 'bg-[#12183d]', dot: 'bg-blue-400', label: 'text-blue-400' },
  success: { border: 'border-l-green-500', bg: 'bg-green-500/10', dot: 'bg-green-500', label: 'text-green-400' },
  error: { border: 'border-l-red-600', bg: 'bg-red-600/10', dot: 'bg-red-600', label: 'text-red-500' }
};

export default function Notifications() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'emergency' | 'warning' | 'info' | 'success'>('all');
  
  const { notifications: allNotifications } = useSharedDataSync();

  // Filter based on user role (targetPortal) and selected type filter
  let notifs = allNotifications.filter(n => {
    if (!n.targetPortal) return true;
    if (user?.role === 'AMBULANCE_CREW' && n.targetPortal !== 'crew') return false;
    if (user?.role === 'DISPATCHER' && n.targetPortal !== 'dispatcher') return false;
    if (user?.role === 'HOSPITAL_STAFF' && n.targetPortal !== 'hospital') return false;
    return true;
  });

  const filtered = filter === 'all' ? notifs : notifs.filter(n => {
    // Map service types to UI types
    let uiType = n.type;
    if (uiType === 'error') uiType = 'emergency';
    return uiType === filter || (filter === 'emergency' && uiType === 'error');
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <span className="text-xs font-mono text-slate-400">{notifs.length} total</span>
      </div>

      <div className="flex gap-2">
        {(['all', 'emergency', 'warning', 'info', 'success'] as const).map(f => (
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
          let uiType = n.type as string;
          if (uiType === 'error') uiType = 'emergency'; // Map error to emergency style
          const s = TYPE_STYLES[uiType as keyof typeof TYPE_STYLES] || TYPE_STYLES.info;
          
          const time = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div key={n.id} className={`border-l-4 ${s.border} ${s.bg} rounded-2xl border border-white/5 p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold ${s.label}`}>{n.message}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 flex-shrink-0">{time}</span>
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
