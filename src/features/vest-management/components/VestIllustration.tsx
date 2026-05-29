/**
 * Ilustración SVG del chaleco con los tres sensores (Cervical, Dorsal, Lumbar)
 * anotados con líneas de referencia hacia las anotaciones laterales.
 */

interface Props {
  /** Sensor que actualmente reporta desviación; se resalta en terracotta. */
  warningSensor?: 'cervical' | 'dorsal' | 'lumbar' | null
}

export function VestIllustration({ warningSensor = null }: Props) {
  const isLumbarWarn = warningSensor === 'lumbar'
  const isDorsalWarn = warningSensor === 'dorsal'
  const isCervicalWarn = warningSensor === 'cervical'

  return (
    <svg viewBox="0 0 280 460" width="280" height="460" className="mx-auto">
      <defs>
        <linearGradient id="vest-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--color-moss))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(var(--color-moss))" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      <path
        d="M 30 60 L 60 30 L 100 30 L 110 60 L 170 60 L 180 30 L 220 30 L 250 60 L 250 410 Q 250 440 220 440 L 60 440 Q 30 440 30 410 Z"
        fill="url(#vest-grad)"
        stroke="rgb(var(--color-ink-soft))"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <line
        x1="140"
        y1="60"
        x2="140"
        y2="440"
        stroke="rgb(var(--color-ink-faint))"
        strokeWidth="0.8"
        strokeDasharray="2 4"
      />

      <path
        d="M 110 60 Q 140 80 170 60"
        fill="none"
        stroke="rgb(var(--color-ink-soft))"
        strokeWidth="1"
      />
      <line
        x1="55"
        y1="140"
        x2="80"
        y2="140"
        stroke="rgb(var(--color-ink-faint))"
        strokeWidth="0.6"
      />
      <line
        x1="200"
        y1="140"
        x2="225"
        y2="140"
        stroke="rgb(var(--color-ink-faint))"
        strokeWidth="0.6"
      />

      <SensorMark cx={140} cy={100} label="C" warn={isCervicalWarn} />
      <SensorMark cx={140} cy={240} label="D" warn={isDorsalWarn} />
      <SensorMark cx={140} cy={380} label="L" warn={isLumbarWarn} />

      <text
        x="140"
        y="430"
        textAnchor="middle"
        fontFamily="JetBrains Mono"
        fontSize="8"
        letterSpacing="2"
        fill="rgb(var(--color-ink-soft))"
        opacity="0.7"
      >
        SITRIGHT
      </text>
    </svg>
  )
}

interface SensorMarkProps {
  cx: number
  cy: number
  label: string
  warn: boolean
}

function SensorMark({ cx, cy, label, warn }: SensorMarkProps) {
  const outerColor = warn ? 'rgb(var(--color-terracotta))' : 'rgb(var(--color-moss))'
  const innerColor = warn ? 'rgb(var(--color-terracotta))' : 'rgb(var(--color-moss))'
  const outerOpacity = warn ? '0.18' : '0.15'
  const innerStroke = warn ? 'rgb(var(--color-terracotta-soft))' : 'rgb(var(--color-moss-soft))'
  const outerRadius = warn ? 24 : 22
  const innerRadius = warn ? 16 : 14

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={outerRadius}
        fill={outerColor}
        fillOpacity={outerOpacity}
        stroke={outerColor}
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />
      <circle
        cx={cx}
        cy={cy}
        r={innerRadius}
        fill={innerColor}
        stroke={innerStroke}
        strokeWidth="0.9"
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill="rgb(var(--color-cream))"
        fontFamily="JetBrains Mono"
        fontSize="11"
        fontWeight="500"
      >
        {label}
      </text>
      <line
        x1={cx - 22}
        y1={cy}
        x2="40"
        y2={cy}
        stroke={outerColor}
        strokeWidth="0.6"
        strokeDasharray="1 3"
      />
      <circle cx="40" cy={cy} r="3" fill={outerColor} />
    </g>
  )
}
