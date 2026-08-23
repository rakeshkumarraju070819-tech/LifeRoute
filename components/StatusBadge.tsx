interface StatusBadgeProps {
  status: string;
  variant?: 'emergency' | 'active' | 'available' | 'warning' | 'muted' | 'auto';
  size?: 'sm' | 'md';
}

function resolveVariant(status: string): StatusBadgeProps['variant'] {
  const s = status.toUpperCase();
  if (['CRITICAL', 'FULL', 'UNAVAILABLE', 'CANCELLED', 'OFFLINE', 'CLOSED', 'EMERGENCY ONLY'].some(k => s.includes(k))) return 'emergency';
  if (['AVAILABLE', 'OPEN', 'COMPLETED', 'COMPLETE'].some(k => s.includes(k))) return 'available';
  if (['LIMITED', 'WARNING', 'DELAYED', 'HIGH'].some(k => s.includes(k))) return 'warning';
  if (['DISPATCHED', 'EN ROUTE', 'ASSIGNED', 'ACTIVE', 'NEW', 'ASSIGNING', 'PICKED UP'].some(k => s.includes(k))) return 'active';
  return 'muted';
}

const VARIANT_CLASSES: Record<string, string> = {
  emergency: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  active: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
  available: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/30',
  warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  muted: 'bg-white/5 text-slate-400 ring-1 ring-white/10',
};

export default function StatusBadge({ status, variant = 'auto', size = 'sm' }: StatusBadgeProps) {
  const v = variant === 'auto' ? resolveVariant(status) : variant;
  const cls = VARIANT_CLASSES[v ?? 'muted'];
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded font-mono font-medium uppercase tracking-wide ${sz} ${cls}`}>
      {status}
    </span>
  );
}
