import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  AMBULANCE_CREW: 'Ambulance Crew',
  DISPATCHER: 'Dispatcher',
  HOSPITAL_STAFF: 'Hospital Staff',
};

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saved, setSaved] = useState(false);

  const save = () => { setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">Profile</h1>

      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          ✓ Profile updated successfully.
        </div>
      )}

      <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
          <div className="w-16 h-16 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-2xl">
            {user?.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-bold text-white text-lg">{user?.name}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-purple-600/20 text-purple-300 px-2.5 py-0.5 rounded-full font-medium">
              {ROLE_LABELS[user?.role ?? '']}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {[
            { label: 'Full Name', val: name, editable: true, setter: setName },
            { label: 'Email Address', val: user?.email, editable: false },
            { label: 'Phone Number', val: phone, editable: true, setter: setPhone },
            { label: 'Role', val: ROLE_LABELS[user?.role ?? ''], editable: false },
            { label: 'Organization', val: user?.organization, editable: false },
            { label: 'Employee ID', val: user?.employeeId, editable: false, mono: true },
            ...(user?.ambulanceId ? [{ label: 'Ambulance ID', val: user.ambulanceId, editable: false, mono: true }] : []),
            ...(user?.department ? [{ label: 'Department', val: user.department, editable: false }] : []),
            ...(user?.dispatchCenter ? [{ label: 'Dispatch Center', val: user.dispatchCenter, editable: false }] : []),
            { label: 'Account Status', val: 'Active', editable: false },
          ].map((f: { label: string; val?: string; editable: boolean; setter?: (v: string) => void; mono?: boolean }) => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">{f.label}</label>
              {editing && f.editable && f.setter ? (
                <input value={f.val} onChange={e => f.setter!(e.target.value)}
                  className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400" />
              ) : (
                <p className={`text-white text-sm py-2 ${f.mono ? 'font-mono' : ''} ${!f.editable ? 'text-slate-400' : ''}`}>
                  {f.val ?? '—'}
                  {!f.editable && <span className="ml-2 text-xs text-slate-500">(read-only)</span>}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3 pt-5 border-t border-white/5">
          {editing ? (
            <>
              <button onClick={save} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">Save Changes</button>
              <button onClick={() => setEditing(false)} className="border border-white/10 text-slate-300 px-5 py-2 rounded-xl text-sm font-medium hover:bg-white/5">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="border border-white/10 text-slate-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <p className="font-bold text-white mb-4">Change Password</p>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">Current Password</label>
            <input type="password" className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">New Password</label>
            <input type="password" className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">Confirm New Password</label>
            <input type="password" className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400" placeholder="••••••••" />
          </div>
          <button className="border border-white/10 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
            Update Password
          </button>
        </div>
      </div>

      <div className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
        <p className="font-bold text-white mb-4">Notification Preferences</p>
        <div className="space-y-3">
          {[
            'Emergency assignments',
            'Route & traffic alerts',
            'Hospital capacity changes',
            'Dispatcher messages',
            'System alerts',
          ].map(n => (
            <label key={n} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-200">{n}</span>
              <input type="checkbox" defaultChecked className="accent-purple-500 w-4 h-4" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
