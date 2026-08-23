import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  LayoutGrid, Siren, Map as MapIcon, ClipboardList, Bell, User as UserIcon,
  Truck, Building2, Zap, LogOut, Sun, Moon, Radio,
} from 'lucide-react';
import { useAuth, type Role } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSharedDataSync } from '../hooks/useSharedDataSync';
import { notificationService } from '../services/notificationService';

const NAV: Record<Role, { label: string; icon: typeof LayoutGrid; path: string }[]> = {
  AMBULANCE_CREW: [
    { label: 'Dashboard', icon: LayoutGrid, path: '/crew' },
    { label: 'Active Emergency', icon: Siren, path: '/crew/emergency' },
    { label: 'Navigation', icon: MapIcon, path: '/crew/navigation' },
    { label: 'History', icon: ClipboardList, path: '/crew/history' },
    { label: 'Notifications', icon: Bell, path: '/crew/notifications' },
    { label: 'Profile', icon: UserIcon, path: '/crew/profile' },
  ],
  DISPATCHER: [
    { label: 'Dashboard', icon: LayoutGrid, path: '/dispatcher' },
    { label: 'Emergencies', icon: Siren, path: '/dispatcher/emergencies' },
    { label: 'Ambulance Fleet', icon: Truck, path: '/dispatcher/fleet' },
    { label: 'Live Map', icon: MapIcon, path: '/dispatcher/map' },
    { label: 'Hospitals', icon: Building2, path: '/dispatcher/hospitals' },
    { label: 'History', icon: ClipboardList, path: '/dispatcher/history' },
    { label: 'Notifications', icon: Bell, path: '/dispatcher/notifications' },
    { label: 'Profile', icon: UserIcon, path: '/dispatcher/profile' },
  ],
  HOSPITAL_STAFF: [
    { label: 'Dashboard', icon: LayoutGrid, path: '/hospital' },
    { label: 'Hospital Capacity', icon: Building2, path: '/hospital/capacity' },
    { label: 'Incoming Ambulances', icon: Truck, path: '/hospital/incoming' },
    { label: 'Emergency Readiness', icon: Zap, path: '/hospital/readiness' },
    { label: 'History', icon: ClipboardList, path: '/hospital/history' },
    { label: 'Notifications', icon: Bell, path: '/hospital/notifications' },
    { label: 'Profile', icon: UserIcon, path: '/hospital/profile' },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  AMBULANCE_CREW: 'Ambulance Crew',
  DISPATCHER: 'Dispatcher',
  HOSPITAL_STAFF: 'Hospital Staff',
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div className="flex h-screen bg-surface-base overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-panel border-r border-hairline flex flex-col">
        <div className="px-6 py-6 border-b border-hairline flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-operational-bg border border-operational flex items-center justify-center flex-shrink-0">
            <Siren className="w-4 h-4 text-operational" strokeWidth={2} />
          </div>
          <div>
            <p className="text-primary font-bold text-sm leading-tight">Emergency</p>
            <p className="text-tertiary text-[11px] font-mono tracking-wide">INTELLIGENCE SYSTEM</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-2 ${
                  isActive
                    ? 'bg-operational-bg text-primary font-medium border-l-operational'
                    : 'text-secondary hover:text-primary hover:bg-surface-sunken border-l-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-hairline space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-operational-bg border border-operational flex items-center justify-center text-operational font-semibold text-xs flex-shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <p className="text-primary text-sm font-medium truncate">{user.name}</p>
              <p className="text-tertiary text-xs font-mono truncate">{user.email}</p>
            </div>
          </div>
          <span className="inline-block text-[11px] px-2.5 py-1 rounded-full font-semibold font-mono uppercase tracking-wide bg-operational-bg text-operational">
            {ROLE_LABELS[user.role]}
          </span>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-secondary hover:text-primary hover:bg-surface-sunken border border-hairline rounded-lg text-xs transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.75} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-secondary hover:text-critical hover:bg-critical-bg border border-hairline rounded-lg text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface-base border-b border-hairline px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1.5 bg-positive-bg text-positive border border-positive rounded-full px-3 py-1 text-xs font-mono">
                <Radio className="w-3 h-3 animate-pulse" strokeWidth={2} />
                Live system connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-critical-bg text-critical border border-critical rounded-full px-3 py-1 text-xs font-mono">
                <Radio className="w-3 h-3" strokeWidth={2} />
                Connection lost
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-secondary hover:text-primary transition-colors"
              >
                <Bell className="w-5 h-5" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-critical text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-panel-raised border border-hairline-strong rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="bg-surface-sunken border-b border-hairline px-4 py-3 flex justify-between items-center">
                    <p className="text-primary font-bold text-sm">Notifications</p>
                    <button onClick={() => {
                      myNotifications.forEach(n => handleMarkRead(n.id));
                    }} className="text-xs text-operational hover:opacity-80">Mark all read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <p className="text-center text-tertiary text-sm py-8">No notifications</p>
                    ) : (
                      <div className="divide-y divide-[var(--color-border-hairline)]">
                        {myNotifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkRead(n.id)}
                            className={`p-4 cursor-pointer hover:bg-surface-sunken transition-colors ${!n.read ? 'bg-operational-bg' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className={`text-sm font-medium ${!n.read ? 'text-primary' : 'text-secondary'}`}>{n.title || n.type.toUpperCase()}</p>
                              <span className="text-[10px] text-tertiary font-mono">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-secondary line-clamp-2">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-operational-bg border border-operational flex items-center justify-center text-operational font-semibold text-xs">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden md:block">
                <p className="text-primary font-medium leading-tight">{user.name}</p>
                <p className="text-tertiary text-xs font-mono">{user.employeeId}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
