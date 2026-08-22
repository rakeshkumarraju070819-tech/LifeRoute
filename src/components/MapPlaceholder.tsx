import { useState } from 'react';

interface MapPlaceholderProps {
  height?: string;
  showFilters?: boolean;
  variant?: 'crew' | 'dispatcher';
}

const AMBULANCES = [
  { id: 'AMB-042', x: 38, y: 44, status: 'en-route', label: 'AMB-042' },
  { id: 'AMB-017', x: 62, y: 31, status: 'available', label: 'AMB-017' },
  { id: 'AMB-085', x: 74, y: 58, status: 'dispatched', label: 'AMB-085' },
  { id: 'AMB-031', x: 22, y: 67, status: 'available', label: 'AMB-031' },
];

const HOSPITALS = [
  { id: 'H1', x: 55, y: 48, label: 'City General' },
  { id: 'H2', x: 80, y: 35, label: 'St. Mary Medical' },
  { id: 'H3', x: 30, y: 25, label: 'Metro Health' },
];

const EMERGENCIES = [
  { id: 'E1', x: 42, y: 38, severity: 'critical' },
  { id: 'E2', x: 68, y: 52, severity: 'high' },
];

export default function MapPlaceholder({ height = 'h-80', showFilters = false, variant = 'dispatcher' }: MapPlaceholderProps) {
  const [filters, setFilters] = useState({ ambulances: true, emergencies: true, hospitals: true, traffic: true });

  const toggle = (k: keyof typeof filters) => setFilters(f => ({ ...f, [k]: !f[k] }));

  return (
    <div className="relative bg-[#1a2035] rounded-lg overflow-hidden border border-slate-700" style={{ height: height === 'h-80' ? '320px' : height }}>
      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a90d9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Roads */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="45%" x2="100%" y2="45%" stroke="#2d3f6a" strokeWidth="8"/>
        <line x1="0" y1="65%" x2="100%" y2="65%" stroke="#2d3f6a" strokeWidth="5"/>
        <line x1="35%" y1="0" x2="35%" y2="100%" stroke="#2d3f6a" strokeWidth="8"/>
        <line x1="65%" y1="0" x2="65%" y2="100%" stroke="#2d3f6a" strokeWidth="5"/>
        <line x1="15%" y1="0" x2="15%" y2="100%" stroke="#2d3f6a" strokeWidth="3"/>
        <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#2d3f6a" strokeWidth="3"/>
        <line x1="20%" y1="0" x2="70%" y2="100%" stroke="#243258" strokeWidth="4"/>
        {/* Route highlight */}
        {variant === 'crew' && (
          <polyline points="38%,44% 38%,48% 55%,48%" stroke="#3b82f6" strokeWidth="3" strokeDasharray="8,4" fill="none" opacity="0.9"/>
        )}
        {/* Traffic jam */}
        {filters.traffic && (
          <line x1="0" y1="45%" x2="30%" y2="45%" stroke="#f59e0b" strokeWidth="8" opacity="0.4"/>
        )}
      </svg>

      {/* Hospitals */}
      {filters.hospitals && HOSPITALS.map(h => (
        <div key={h.id} className="absolute" style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className="bg-red-500 rounded-sm w-4 h-4 flex items-center justify-center shadow-lg shadow-red-900/50">
            <span className="text-white text-[8px] font-bold">H</span>
          </div>
          <div className="text-[9px] text-white font-medium mt-0.5 whitespace-nowrap bg-navy-900/80 px-1 rounded">{h.label}</div>
        </div>
      ))}

      {/* Emergencies */}
      {filters.emergencies && EMERGENCIES.map(e => (
        <div key={e.id} className="absolute" style={{ left: `${e.x}%`, top: `${e.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className={`w-5 h-5 rounded-full border-2 ${e.severity === 'critical' ? 'border-red-400 bg-red-500/30 animate-ping' : 'border-amber-400 bg-amber-500/30'}`} />
          <div className={`absolute inset-0 w-5 h-5 rounded-full ${e.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'} opacity-80`} />
        </div>
      ))}

      {/* Ambulances */}
      {filters.ambulances && AMBULANCES.map(a => (
        <div key={a.id} className="absolute" style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%,-50%)' }}>
          <div className={`w-6 h-6 rounded flex items-center justify-center shadow-lg text-xs ${
            a.status === 'available' ? 'bg-green-500 shadow-green-900/50' :
            a.status === 'en-route' ? 'bg-blue-500 shadow-blue-900/50' :
            'bg-amber-500 shadow-amber-900/50'
          }`}>
            🚑
          </div>
          <div className="text-[9px] text-slate-300 font-mono mt-0.5 whitespace-nowrap text-center">{a.label}</div>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-slate-400">Available</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-slate-400">En Route</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-slate-400">Emergency</span></div>
      </div>

      {/* Scale */}
      <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-1">
          <div className="w-8 h-px bg-slate-500" />
          <span>0.5 km</span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {(Object.keys(filters) as Array<keyof typeof filters>).map(k => (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize transition-colors ${
                filters[k] ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
