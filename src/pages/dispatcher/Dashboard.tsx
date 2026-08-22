import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import KPICard from '../../components/KPICard';
import StatusBadge from '../../components/StatusBadge';
import TomTomMap from '../../components/TomTomMap';

function tabForPath(pathname: string): 'overview' | 'fleet' | 'map' {
  if (pathname.endsWith('/fleet')) return 'fleet';
  if (pathname.endsWith('/map')) return 'map';
  return 'overview';
}

const EMERGENCIES = [
  { id: 'EM-2024-0847', type: 'Cardiac Arrest', severity: 'CRITICAL', location: '412 Oak St, Zone 3', ambulance: 'AMB-042', status: 'EN ROUTE TO PATIENT', eta: '4 min', hospital: 'City General', created: '14:28' },
  { id: 'EM-2024-0848', type: 'Traffic Accident', severity: 'HIGH', location: '78 River Rd, Zone 1', ambulance: 'AMB-085', status: 'PATIENT PICKED UP', eta: '9 min', hospital: 'St. Mary Medical', created: '14:21' },
  { id: 'EM-2024-0849', type: 'Respiratory Distress', severity: 'MEDIUM', location: '230 Pine Ave, Zone 5', ambulance: 'AMB-031', status: 'ASSIGNING', eta: '—', hospital: '—', created: '14:35' },
  { id: 'EM-2024-0844', type: 'Fall Injury', severity: 'LOW', location: '55 Maple Dr, Zone 2', ambulance: 'AMB-017', status: 'COMPLETED', eta: '—', hospital: 'Metro Health', created: '13:55' },
];

const FLEET = [
  { id: 'AMB-042', status: 'EN ROUTE TO PATIENT', location: '412 Oak St', emergency: 'EM-2024-0847', crew: 'M. Reid / J. Torres', eta: '4 min', updated: '14:32', online: true },
  { id: 'AMB-017', status: 'AVAILABLE', location: 'Station 7', emergency: '—', crew: 'K. Osei / L. Park', eta: '—', updated: '14:30', online: true },
  { id: 'AMB-085', status: 'EN ROUTE TO HOSPITAL', location: 'River Rd', emergency: 'EM-2024-0848', crew: 'A. Gomez / N. Smith', eta: '9 min', updated: '14:33', online: true },
  { id: 'AMB-031', status: 'DISPATCHED', location: 'Station 3', emergency: 'EM-2024-0849', crew: 'B. Lee / C. Wang', eta: '12 min', updated: '14:35', online: true },
  { id: 'AMB-009', status: 'AVAILABLE', location: 'Station 1', emergency: '—', crew: 'P. Davis / M. Kim', eta: '—', updated: '14:29', online: true },
  { id: 'AMB-063', status: 'OFFLINE', location: 'Maintenance', emergency: '—', crew: '—', eta: '—', updated: '11:00', online: false },
];

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 font-bold',
  HIGH: 'text-amber-400 font-semibold',
  MEDIUM: 'text-blue-400',
  LOW: 'text-slate-400',
};

export default function DispatcherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'fleet' | 'map'>(() => tabForPath(location.pathname));
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const hospitalsRef = useRef<HTMLDivElement>(null);

  // Sidebar links (Emergencies / Fleet / Live Map / Hospitals) each point at a
  // distinct URL but share this one component. Re-derive the active tab (and
  // scroll target) whenever the route changes so navigation actually does
  // something instead of leaving the previously-rendered tab in place.
  useEffect(() => {
    setTab(tabForPath(location.pathname));
    if (location.pathname.endsWith('/hospitals')) {
      hospitalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  const filteredEM = EMERGENCIES.filter(e => {
    if (filterSeverity !== 'ALL' && e.severity !== filterSeverity) return false;
    if (search && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dispatcher Dashboard</h1>
          <p className="text-slate-400 text-sm">Central Dispatch Authority · Shift 14:00–22:00</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
          + New Emergency
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <KPICard label="Active Emergencies" value="3" accent="emergency" icon="🚨" />
        <KPICard label="Available Ambulances" value="2" accent="available" icon="🚑" />
        <KPICard label="Active Ambulances" value="3" accent="active" icon="📡" />
        <KPICard label="Hospitals Available" value="5" accent="available" icon="🏥" />
        <KPICard label="Critical Emergencies" value="1" accent="emergency" icon="⚡" />
      </div>

      {/* Tab bar */}
      <div className="bg-[#0d1530] rounded-2xl p-1 inline-flex gap-1">
        {(['overview', 'fleet', 'map'] as const).map(t => (
          <button key={t} onClick={() => navigate(t === 'overview' ? '/dispatcher/emergencies' : `/dispatcher/${t}`)}
            className={`px-5 py-2 text-sm font-medium capitalize transition-colors rounded-xl ${
              tab === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t === 'overview' ? 'Emergencies' : t === 'fleet' ? 'Fleet' : 'Live Map'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 w-48"
              placeholder="Search ID…" />
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
              className="bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="bg-[#12183d] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1530] border-b border-white/5">
                  {['Emergency ID','Type','Severity','Location','Ambulance','Status','ETA','Hospital','Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEM.map(e => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-200 font-medium">{e.id}</td>
                    <td className="px-4 py-3 text-white">{e.type}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-mono uppercase ${SEVERITY_COLOR[e.severity]}`}>{e.severity}</span></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{e.location}</td>
                    <td className="px-4 py-3 font-mono text-xs text-purple-300">{e.ambulance}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200">{e.eta}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{e.hospital}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'fleet' && (
        <div className="bg-[#12183d] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1530] border-b border-white/5">
                {['Unit ID','Status','Location','Emergency','Crew','ETA','Updated','Signal'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {FLEET.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-white">{u.id}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{u.location}</td>
                  <td className="px-4 py-3 font-mono text-xs text-purple-300">{u.emergency}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{u.crew}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200">{u.eta}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.updated}</td>
                  <td className="px-4 py-3">
                    <span className={`w-2 h-2 rounded-full inline-block ${u.online ? 'bg-green-400' : 'bg-slate-600'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'map' && (
        <div className="bg-[#0d1530] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-bold text-lg">Live City Map</p>
            <p className="text-xs text-slate-400 font-mono">Auto-refresh every 5s</p>
          </div>
          <div className="rounded-2xl overflow-hidden">
            <TomTomMap height="480px" showFilters variant="dispatcher" />
          </div>
        </div>
      )}

      {/* Hospital status strip */}
      <div ref={hospitalsRef} className="bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 scroll-mt-6">
        <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-4">Hospital Network Status</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'City General Hospital', ed: 'AVAILABLE', icu: '12/20', beds: '45/80', trauma: 'AVAILABLE', cardiac: 'AVAILABLE', incoming: 'AMB-042 · 4 min' },
            { name: 'St. Mary Medical Center', ed: 'LIMITED', icu: '18/20', beds: '61/80', trauma: 'LIMITED', cardiac: 'AVAILABLE', incoming: 'AMB-085 · 9 min' },
            { name: 'Metro Health Hospital', ed: 'AVAILABLE', icu: '5/16', beds: '28/60', trauma: 'AVAILABLE', cardiac: 'AVAILABLE', incoming: 'None' },
          ].map(h => (
            <div key={h.name} className="bg-[#12183d] rounded-2xl p-6 border border-white/5">
              <p className="text-white font-bold text-sm mb-3">{h.name}</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { k: 'Emergency Dept', v: h.ed },
                  { k: 'ICU', v: h.icu },
                  { k: 'General Beds', v: h.beds },
                  { k: 'Trauma', v: h.trauma },
                  { k: 'Cardiac', v: h.cardiac },
                ].map(r => (
                  <div key={r.k} className="flex justify-between">
                    <span className="text-slate-400">{r.k}</span>
                    <span className={`font-mono font-medium ${r.v === 'AVAILABLE' ? 'text-green-400' : r.v === 'LIMITED' ? 'text-amber-400' : 'text-slate-200'}`}>{r.v}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400">Incoming</span>
                  <span className="font-mono font-medium text-purple-300">{h.incoming}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Emergency Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-[#12183d] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">New Emergency</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Emergency Type</label>
                  <select className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                    <option>Cardiac Arrest</option><option>Traffic Accident</option><option>Respiratory</option><option>Trauma</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
                  <select className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                    <option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Pickup Location</label>
                <input className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" placeholder="Street address, zone…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assign Ambulance</label>
                <select className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400">
                  <option>AMB-017 — Available · Station 7</option>
                  <option>AMB-009 — Available · Station 1</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea className="w-full bg-[#0d1530] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 h-20 resize-none" placeholder="Additional information…" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-white/10 text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-white/5">
                Cancel
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                Dispatch Emergency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
