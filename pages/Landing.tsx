import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

const ZONES = [
  { name: "Central City", units: 18, color: "#3b82f6" },
  { name: "North Zone", units: 24, color: "#22c55e" },
  { name: "East District", units: 14, color: "#3b82f6" },
  { name: "West Sector", units: 22, color: "#f59e0b" },
  { name: "South Zone", units: 19, color: "#3b82f6" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#03071e] flex flex-col overflow-hidden relative">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="lg"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="#4a90d9"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lg)" />
        </svg>
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[400px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Header ── */}
      <nav className="relative z-30 flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-sm">EI</span>
          </div>
          <div>
            <p className="text-white font-semibold text-[15px] leading-tight">
              Emergency Intelligence
            </p>
            <p className="text-blue-400 text-[11px] font-mono">
              v2.4.1 · Production
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-slate-300 hover:text-white text-sm px-4 py-2 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer shadow-lg shadow-blue-500/20"
          >
            Create Account
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 flex-1 min-h-[480px] lg:min-h-[520px]">
        {/* ── Ambulance hero image — spans full width, revealed only on right via gradients ── */}
        <div
          className={`
            absolute inset-0
            transition-opacity duration-1000 delay-200 ease-out
            ${loaded ? "opacity-100" : "opacity-0"}
          `}
        >
          {/* The image — fills the entire hero area */}
          <img
            src="/images/ambulance-hero.jpg"
            alt="Emergency ambulance with flashing lights at night"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "75% center" }}
          />

          {/* Subtle radial blue glow behind the ambulance area */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 70% at 70% 45%, rgba(30,80,180,0.08) 0%, transparent 100%)",
            }}
          />

          {/* Primary left-to-right fade — hides image on left, gradually reveals on right */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #03071e 0%, #03071e 30%, rgba(3,7,30,0.98) 38%, rgba(3,7,30,0.92) 44%, rgba(3,7,30,0.8) 50%, rgba(3,7,30,0.55) 58%, rgba(3,7,30,0.3) 66%, rgba(3,7,30,0.12) 75%, transparent 90%)",
            }}
          />

          {/* Bottom fade — blends image base into background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #03071e 0%, rgba(3,7,30,0.85) 10%, rgba(3,7,30,0.4) 25%, rgba(3,7,30,0.1) 40%, transparent 60%)",
            }}
          />

          {/* Top fade — blends into header seamlessly */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, #03071e 0%, rgba(3,7,30,0.6) 5%, rgba(3,7,30,0.15) 15%, transparent 30%)",
            }}
          />

          {/* Right edge fade — prevents hard cutoff at right edge */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to left, rgba(3,7,30,0.4) 0%, transparent 8%)",
            }}
          />
        </div>

        {/* ── LEFT: Text content ── */}
        <div className="relative z-20 h-full flex items-center">
          <div
            className={`
              w-full max-w-[1400px] mx-auto px-8 py-12 lg:py-16
              transition-all duration-1000 ease-out
              ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
            `}
          >
            <div className="max-w-xl lg:max-w-lg">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono px-4 py-2 rounded-full mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Live Emergency Response Network · 247 Units Active
              </div>

              {/* Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold leading-[1.05] mb-6 tracking-tight">
                <span className="text-white">Emergency</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  Intelligence
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-slate-300 font-medium mb-3">
                Real-Time Emergency Routing & Hospital Coordination
              </p>
              <p className="text-slate-500 max-w-md mb-10 leading-relaxed text-[15px]">
                Connect ambulances, emergency dispatchers and hospitals through
                one intelligent real-time response platform. Reduce response
                times. Save lives.
              </p>

              {/* CTA buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/login")}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold text-[15px] transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/8 text-white px-8 py-3.5 rounded-xl font-semibold text-[15px] transition-all backdrop-blur-sm cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: ambulance image shown below text (stacked layout) */}
        <div className="relative lg:hidden w-full h-64 sm:h-80 -mt-8">
          <img
            src="/images/ambulance-hero.jpg"
            alt="Emergency ambulance with flashing lights at night"
            className="w-full h-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, #03071e 0%, transparent 20%, transparent 80%, #03071e 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #03071e 0%, transparent 15%, transparent 85%, #03071e 100%)",
            }}
          />
        </div>
      </section>

      {/* ── Stats Row ── */}
      <div
        className={`relative z-10 px-8 py-6 transition-all duration-1000 delay-500 ease-out ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Avg Response Time */}
            <div className="flex items-center gap-4 bg-[#0c1230]/80 backdrop-blur-sm border border-white/5 rounded-2xl px-6 py-5">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono tracking-tight">
                  4.2 min
                </p>
                <p className="text-slate-500 text-[11px] uppercase tracking-[0.15em] font-medium">
                  Avg Response Time
                </p>
              </div>
            </div>

            {/* System Uptime */}
            <div className="flex items-center gap-4 bg-[#0c1230]/80 backdrop-blur-sm border border-white/5 rounded-2xl px-6 py-5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono tracking-tight">
                  99.8%
                </p>
                <p className="text-slate-500 text-[11px] uppercase tracking-[0.15em] font-medium">
                  System Uptime
                </p>
              </div>
            </div>

            {/* Connected Units */}
            <div className="flex items-center gap-4 bg-[#0c1230]/80 backdrop-blur-sm border border-white/5 rounded-2xl px-6 py-5">
              <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono tracking-tight">
                  312
                </p>
                <p className="text-slate-500 text-[11px] uppercase tracking-[0.15em] font-medium">
                  Connected Units
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live City Network Strip ── */}
      <div
        className={`relative z-10 border-t border-white/5 bg-[#060a1e] px-8 py-5 transition-all duration-1000 delay-700 ease-out ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#0c1230]/60 backdrop-blur-sm border border-white/5 rounded-2xl px-6 py-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-slate-400 text-xs font-mono">
                Live City Network · Metro Area
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  Available
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  En Route
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-2 h-2 bg-red-400 rounded-full" />
                  Emergency
                </span>
              </div>
            </div>

            {/* Network line with zones */}
            <div className="relative">
              {/* Background line */}
              <div className="absolute top-3 left-0 right-0 h-[3px] bg-[#1a2550] rounded-full" />

              {/* Zones */}
              <div className="relative grid grid-cols-5 gap-4">
                {ZONES.map((zone) => (
                  <div key={zone.name} className="flex flex-col items-start">
                    <div className="relative mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: zone.color,
                          boxShadow: `0 0 12px ${zone.color}40`,
                        }}
                      />
                    </div>
                    <p className="text-white text-sm font-medium leading-tight">
                      {zone.name}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {zone.units} Units
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
