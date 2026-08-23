import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth, type Role } from '../context/AuthContext';
import { useSharedDataSync } from '../hooks/useSharedDataSync';
import { notificationService } from '../services/notificationService';

const NAV: Record<Role, { label: string; icon: string; path: string }[]> = {
  AMBULANCE_CREW: [
    { label: 'Dashboard', icon: '◈', path: '/crew' },
    { label: 'Active Emergency', icon: '🚨', path: '/crew/emergency' },
    { label: 'Navigation', icon: '🗺', path: '/crew/navigation' },
    { label: 'History', icon: '📋', path: '/crew/history' },
    { label: 'Notifications', icon: '🔔', path: '/crew/notifications' },
    { label: 'Profile', icon: '👤', path: '/crew/profile' },
  ],
  DISPATCHER: [
    { label: 'Dashboard', icon: '◈', path: '/dispatcher' },
    { label: 'Emergencies', icon: '🚨', path: '/dispatcher/emergencies' },
    { label: 'Ambulance Fleet', icon: '🚑', path: '/dispatcher/fleet' },
    { label: 'Live Map', icon: '🗺', path: '/dispatcher/map' },
    { label: 'Hospitals', icon: '🏥', path: '/dispatcher/hospitals' },
    { label: 'History', icon: '📋', path: '/dispatcher/history' },
    { label: 'Notifications', icon: '🔔', path: '/dispatcher/notifications' },
    { label: 'Profile', icon: '👤', path: '/dispatcher/profile' },
  ],
  HOSPITAL_STAFF: [
    { label: 'Dashboard', icon: '◈', path: '/hospital' },
    { label: 'Hospital Capacity', icon: '🏥', path: '/hospital/capacity' },
    { label: 'Incoming Ambulances', icon: '🚑', path: '/hospital/incoming' },
    { label: 'Emergency Readiness', icon: '⚡', path: '/hospital/readiness' },
    { label: 'History', icon: '📋', path: '/hospital/history' },
    { label: 'Notifications', icon: '🔔', path: '/hospital/notifications' },
    { label: 'Profile', icon: '👤', path: '/hospital/profile' },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  AMBULANCE_CREW: 'Ambulance Crew',
  DISPATCHER: 'Dispatcher',
  HOSPITAL_STAFF: 'Hospital Staff',
};

const ROLE_COLORS: Record<Role, string> = {
  AMBULANCE_CREW: 'bg-blue-500/20 text-blue-300',
  DISPATCHER: 'bg-amber-500/20 text-amber-300',
  HOSPITAL_STAFF: 'bg-green-500/20 text-green-300',
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [connected] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications } = useSharedDataSync();

  if (!user) return null;
  const nav = NAV[user.role];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const mapRole = (r: Role) => {
    if (r === 'AMBULANCE_CREW') return 'CREW';
    if (r === 'HOSPITAL_STAFF') return 'HOSPITAL';
    return 'DISPATCHER';
  };

  const myNotifications = notifications.filter(n => !n.targetRole || n.targetRole === mapRole(user.role)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    notificationService.markAsRead(id);
    window.dispatchEvent(new Event('local-storage-update'));
  };

  return (
    <div className="flex h-screen bg-[#0a0f2e] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#080c1e] border-r border-[rgba(255,255,255,0.06)] flex flex-col">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[rgba(255,255,255,0.06)]">
          <p className="text-white font-bold text-base leading-tight">🚑 Emergency</p>
          <p className="text-purple-400 text-xs font-mono">Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-1">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-600/20 text-white font-medium border-l-2 border-purple-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-purple-300 text-xs font-mono truncate">{user.email}</p>
            </div>
          </div>
          <span className={`inline-block text-xs px-3 py-1 rounded-full font-semibold ${ROLE_COLORS[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
          >
            <span>→</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-[#0a0f2e] border-b border-white/5 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-3 py-1 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live System Connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-3 py-1 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Connection Lost
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-300 hover:text-white transition-colors"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#12183d] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="bg-[#0d1530] border-b border-white/5 px-4 py-3 flex justify-between items-center">
                    <p className="text-white font-bold text-sm">Notifications</p>
                    <button onClick={() => {
                      myNotifications.forEach(n => handleMarkRead(n.id));
                    }} className="text-xs text-purple-400 hover:text-purple-300">Mark all read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">No notifications</p>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {myNotifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleMarkRead(n.id)}
                            className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? 'bg-purple-900/10' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className={`text-sm font-medium ${!n.read ? 'text-white' : 'text-slate-300'}`}>{n.title || n.type.toUpperCase()}</p>
                              <span className="text-[10px] text-slate-500">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-semibold text-xs">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden md:block">
                <p className="text-white font-medium leading-tight">{user.name}</p>
                <p className="text-purple-300 text-xs font-mono">{user.employeeId}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
