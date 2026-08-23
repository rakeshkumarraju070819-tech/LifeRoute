// Signature component: a 4-segment vertical bar used everywhere severity is
// shown — emergency cards, tables, nav badges — so triage level reads at a
// glance the same way across every screen, the way a signal-strength icon
// does, rather than relying on color-coded text alone.

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

const LEVEL_INDEX: Record<SeverityLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const LEVEL_COLOR: Record<SeverityLevel, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-warning)',
  medium: 'var(--color-operational)',
  low: 'var(--color-text-tertiary)',
};

function normalize(input: SeverityLevel | string): SeverityLevel {
  const s = input.toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium')) return 'medium';
  return 'low';
}

interface SeverityLadderProps {
  level: SeverityLevel | string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function SeverityLadder({ level, size = 'sm', showLabel = true }: SeverityLadderProps) {
  const normalized = normalize(level);
  const filled = LEVEL_INDEX[normalized];
  const color = LEVEL_COLOR[normalized];
  const barH = size === 'sm' ? [4, 6, 8, 10] : [6, 9, 12, 15];
  const barW = size === 'sm' ? 3 : 4;
  const gap = size === 'sm' ? 2 : 3;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-end" style={{ gap }}>
        {barH.map((h, i) => (
          <span
            key={i}
            style={{
              width: barW,
              height: h,
              borderRadius: 1,
              backgroundColor: i < filled ? color : 'var(--color-border-hairline-strong)',
              transition: 'background-color 0.15s ease',
            }}
          />
        ))}
      </span>
      {showLabel && (
        <span
          className="font-mono uppercase tracking-wide font-semibold"
          style={{ color, fontSize: size === 'sm' ? 11 : 12 }}
        >
          {normalized}
        </span>
      )}
    </span>
  );
}
