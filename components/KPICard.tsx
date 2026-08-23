interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'emergency' | 'active' | 'available' | 'warning' | 'neutral';
  icon?: string;
}

const ACCENT: Record<string, { val: string; glow: string }> = {
  emergency: { val: 'text-red-400', glow: 'from-transparent to-red-500/5' },
  active: { val: 'text-blue-400', glow: 'from-transparent to-blue-500/5' },
  available: { val: 'text-green-400', glow: 'from-transparent to-green-500/5' },
  warning: { val: 'text-amber-400', glow: 'from-transparent to-amber-500/5' },
  neutral: { val: 'text-slate-200', glow: 'from-transparent to-white/5' },
};

export default function KPICard({ label, value, sub, accent = 'neutral', icon }: KPICardProps) {
  const a = ACCENT[accent];
  return (
    <div className="relative overflow-hidden bg-[#12183d] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} pointer-events-none`} />
      {icon && <span className="absolute top-6 right-6 text-[32px] leading-none opacity-60">{icon}</span>}
      <div className="relative">
        <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-4xl font-bold font-mono ${a.val}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
