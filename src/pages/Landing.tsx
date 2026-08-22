import { useNavigate } from 'react-router';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#03071e] flex flex-col overflow-hidden relative">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lg" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4a90d9" strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lg)" />
        </svg>
      </div>

      {/* Glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">EI</span>
          </div>
          <div>
            <p className="text-white font-semibold">Emergency Intelligence</p>
            <p className="text-blue-400 text-xs font-mono">v2.4.1 · Production</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="text-slate-300 hover:text-white text-sm px-4 py-2 transition-colors">
            Sign In
          </button>
          <button onClick={() => navigate('/signup')} className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors">
            Create Account
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          Live Emergency Response Network · 247 Units Active
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 max-w-4xl">
          Emergency
          <span className="text-blue-400"> Intelligence</span>
        </h1>

        <p className="text-xl text-slate-400 font-medium mb-3 max-w-2xl">
          Real-Time Emergency Routing & Hospital Coordination
        </p>
        <p className="text-slate-500 max-w-xl mb-12 leading-relaxed">
          Connect ambulances, emergency dispatchers and hospitals through one intelligent real-time response platform. Reduce response times. Save lives.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-lg font-semibold text-base transition-colors shadow-lg shadow-blue-900/30"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="border border-white/20 hover:border-white/40 text-white px-8 py-3.5 rounded-lg font-semibold text-base transition-colors"
          >
            Create Account
          </button>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-12 max-w-2xl">
          {[
            { val: '4.2 min', label: 'Avg Response Time' },
            { val: '99.8%', label: 'System Uptime' },
            { val: '312', label: 'Connected Units' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold font-mono text-white">{s.val}</p>
              <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Map visualization strip */}
      <div className="relative z-10 border-t border-white/5 bg-[#080c1e] px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative h-32 bg-[#0f1a35] rounded-xl overflow-hidden border border-white/5">
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="mg" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#4a90d9" strokeWidth="0.5"/>
              </pattern></defs>
              <rect width="100%" height="100%" fill="url(#mg)" />
            </svg>
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e3a6a" strokeWidth="12"/>
              <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#1e3a6a" strokeWidth="6"/>
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1e3a6a" strokeWidth="10"/>
              <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#1e3a6a" strokeWidth="4"/>
              <circle cx="20%" cy="50%" r="6" fill="#3b82f6" opacity="0.8"/>
              <circle cx="38%" cy="40%" r="8" fill="#22c55e" opacity="0.8"/>
              <circle cx="52%" cy="55%" r="6" fill="#3b82f6" opacity="0.8"/>
              <circle cx="68%" cy="45%" r="6" fill="#f59e0b" opacity="0.8"/>
              <circle cx="80%" cy="35%" r="10" fill="#dc2626" opacity="0.6"/>
              <line x1="38%" y1="40%" x2="52%" y2="55%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" opacity="0.7"/>
            </svg>
            <div className="absolute top-3 left-4 text-slate-400 text-xs font-mono">Live City Network · Metro Area</div>
            <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full"/>Available</span>
              <span className="flex items-center gap-1 text-blue-400"><span className="w-2 h-2 bg-blue-400 rounded-full"/>En Route</span>
              <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 bg-red-400 rounded-full"/>Emergency</span>
            </div>
          </div>
          <p className="text-center text-slate-600 text-xs font-mono mt-3">
            Roles: Ambulance Crew · Dispatcher · Hospital Staff — each with dedicated secure access
          </p>
        </div>
      </div>
    </div>
  );
}
