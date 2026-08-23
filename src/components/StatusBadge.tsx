interface StatusBadgeProps {
  status: string;
  variant?: 'critical' | 'operational' | 'positive' | 'warning' | 'muted' | 'auto';
  size?: 'sm' | 'md';
}

function resolveVariant(status: string): NonNullable<StatusBadgeProps['variant']> {
  const s = status.toUpperCase();
  if (['CRITICAL', 'FULL', 'UNAVAILABLE', 'CANCELLED', 'OFFLINE', 'CLOSED', 'EMERGENCY ONLY'].some(k => s.includes(k))) return 'critical';
  if (['AVAILABLE', 'OPEN', 'COMPLETED', 'COMPLETE'].some(k => s.includes(k))) return 'positive';
  if (['LIMITED', 'WARNING', 'DELAYED', 'HIGH'].some(k => s.includes(k))) return 'warning';
  if (['DISPATCHED', 'EN ROUTE', 'ASSIGNED', 'ACCEPTED', 'ACTIVE', 'NEW', 'ASSIGNING', 'PICKED UP'].some(k => s.includes(k))) return 'operational';
  return 'muted';
}

const VARIANT_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: 'var(--color-critical)', bg: 'var(--color-critical-bg)' },
  operational: { color: 'var(--color-operational)', bg: 'var(--color-operational-bg)' },
  positive: { color: 'var(--color-positive)', bg: 'var(--color-positive-bg)' },
  warning: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  muted: { color: 'var(--color-text-secondary)', bg: 'var(--color-surface-sunken)' },
};

export default function StatusBadge({ status, variant = 'auto', size = 'sm' }: StatusBadgeProps) {
  const v = variant === 'auto' ? resolveVariant(status) : variant;
  const style = VARIANT_STYLE[v];
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center rounded font-mono font-medium uppercase tracking-wide ${sz}`}
      style={{ color: style.color, backgroundColor: style.bg, boxShadow: `inset 0 0 0 1px ${style.color}33` }}
    >
      {status}
    </span>
  );
}
