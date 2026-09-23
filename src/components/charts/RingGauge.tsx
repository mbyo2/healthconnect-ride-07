interface RingGaugeProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Big center text, e.g. "98%" */
  centerValue?: string;
  /** Small center caption, e.g. "O₂ Level" */
  centerLabel?: string;
  label?: string;
  sublabel?: string;
}

/**
 * Compact SVG progress ring (O₂-style gauge). Pure SVG so it stays crisp
 * in both themes — pass theme-safe colors from the caller.
 */
export const RingGauge = ({
  value,
  size = 120,
  strokeWidth = 12,
  color = '#397dff',
  trackColor = 'hsl(var(--canvas-mist))',
  centerValue,
  centerLabel,
  label,
  sublabel,
}: RingGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="vf-card p-5 flex flex-col items-center text-center"
      role="img"
      aria-label={label ? `${label}: ${centerValue ?? `${Math.round(clamped)} percent`}` : undefined}
    >
      {(label || sublabel) && (
        <div className="mb-3 w-full text-left">
          {label && <h3 className="font-display text-sm font-medium text-midnight">{label}</h3>}
          {sublabel && <p className="text-xs text-graphite-500">{sublabel}</p>}
        </div>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            style={{ stroke: trackColor }}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <p className="font-display text-2xl font-medium text-midnight leading-none">{centerValue}</p>
            )}
            {centerLabel && <p className="text-[11px] text-graphite-500 mt-1">{centerLabel}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
