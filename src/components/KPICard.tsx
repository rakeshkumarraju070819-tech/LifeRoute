import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'critical' | 'operational' | 'positive' | 'warning' | 'neutral';
  icon?: LucideIcon;
}

const ACCENT_VAR: Record<string, string> = {
  critical: 'var(--color-critical)',
  operational: 'var(--color-operational)',
  positive: 'var(--color-positive)',
  warning: 'var(--color-warning)',
  neutral: 'var(--color-text-primary)',
};

export default function KPICard({ label, value, sub, accent = 'neutral', icon: Icon }: KPICardProps) {
  const color = ACCENT_VAR[accent];
  return (
    <div className="relative overflow-hidden bg-surface-panel border border-hairline rounded-xl p-5">
      {Icon && (
        <Icon className="absolute top-5 right-5 w-6 h-6" style={{ color, opacity: 0.5 }} strokeWidth={1.75} />
      )}
      <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
    </div>
  );
}
