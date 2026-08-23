import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSharedDataSync } from '../hooks/useSharedDataSync';
import { notificationService } from '../services/notificationService';

const TYPE_STYLES = {
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500', label: 'text-amber-400' },
  info: { border: 'border-l-blue-400', bg: 'bg-[#12183d]', dot: 'bg-blue-400', label: 'text-blue-400' },
  success: { border: 'border-l-green-500', bg: 'bg-green-500/10', dot: 'bg-green-500', label: 'text-green-400' },
  error: { border: 'border-l-red-600', bg: 'bg-red-600/10', dot: 'bg-red-600', label: 'text-red-500' }
};

export default function Notifications() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'warning' | 'info' | 'success' | 'error'>('all');

  const { notifications: allNotifications } = useSharedDataSync();

  const mapRole = (role: string) => {
    if (role === 'AMBULANCE_CREW') return 'CREW';
    if (role === 'HOSPITAL_STAFF') return 'HOSPITAL';
    return 'DISPATCHER';
  };

  // Filter based on user role (targetRole) and selected type filter
  const notifs = allNotifications.filter(n => {
    if (n.targetRole && user?.role && n.targetRole !== mapRole(user.role)) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter);

  const handleMarkRead = (id: string) => {
    notificationService.markAsRead(id);
    window.dispatchEvent(new Event('local-storage-update'));
  };

  const handleMarkAllRead = () => {
    notifs.forEach(n => notificationService.markAsRead(n.id));
    window.dispatchEvent(new Event('local-storage-update'));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">{notifs.filter(n => !n.read).length} unread</span>
          <button
            onClick={handleMarkAllRead}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-[#12183d] border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'error', 'warning', 'info', 'success'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-[#12183d] border border-white/10 text-slate-300 hover:bg-white/5'
            }`}>
            {f === 'error' ? 'Alert' : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((n) => {
          const s = TYPE_STYLES[n.type] || TYPE_STYLES.info;
          const time = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={`cursor-pointer border-l-4 ${s.border} ${s.bg} rounded-2xl border border-white/5 p-4 transition-opacity ${n.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                  <div>
                    {n.title && <p className="text-white text-xs font-bold mb-0.5">{n.title}</p>}
                    <p className={`text-sm ${s.label}`}>{n.message}</p>
                    {n.emergencyId && (
                      <p className="text-xs text-slate-500 mt-1 font-mono">Ref: {n.emergencyId}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-mono text-slate-500">{time}</span>
                  {!n.read && (
                    <span className="block w-2 h-2 rounded-full bg-purple-400 ml-auto mt-1" />
                  )}
                </div>
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
