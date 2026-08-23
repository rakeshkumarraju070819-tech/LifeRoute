import { Outlet } from "react-router";
import { useEffect, useState } from "react";

export default function EmergencyBackgroundLayout() {
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

      {/* ── Ambulance hero image — spans full width, revealed only on right via gradients ── */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          transition-opacity duration-1000 delay-200 ease-out
          ${loaded ? "opacity-100" : "opacity-0"}
        `}
      >
        <img
          src="/images/ambulance-hero.jpg"
          alt="Emergency ambulance with flashing lights at night"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "75% center" }}
        />

        {/* Subtle radial blue glow behind the ambulance area */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 70% at 70% 45%, rgba(30,80,180,0.08) 0%, transparent 100%)",
          }}
        />

        {/* Primary left-to-right fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #03071e 0%, #03071e 30%, rgba(3,7,30,0.98) 38%, rgba(3,7,30,0.92) 44%, rgba(3,7,30,0.8) 50%, rgba(3,7,30,0.55) 58%, rgba(3,7,30,0.3) 66%, rgba(3,7,30,0.12) 75%, transparent 90%)",
          }}
        />

        {/* Bottom fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #03071e 0%, rgba(3,7,30,0.85) 10%, rgba(3,7,30,0.4) 25%, rgba(3,7,30,0.1) 40%, transparent 60%)",
          }}
        />

        {/* Top fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #03071e 0%, rgba(3,7,30,0.6) 5%, rgba(3,7,30,0.15) 15%, transparent 30%)",
          }}
        />

        {/* Right edge fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to left, rgba(3,7,30,0.4) 0%, transparent 8%)",
          }}
        />
      </div>

      {/* FOREGROUND CONTENT */}
      <div className="relative z-20 flex-1 flex flex-col w-full h-full">
        <Outlet />
      </div>
    </div>
  );
}
