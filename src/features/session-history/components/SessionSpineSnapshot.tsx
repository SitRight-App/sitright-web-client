interface Props {
  /** Sensor con la desviación dominante de la sesión, o null si fue adecuada todo el tiempo. */
  warningSensor: 'cervical' | 'dorsal' | 'lumbar' | null
  /** Porcentaje del tiempo en la desviación dominante, mostrado al lado del sensor. */
  deviationPercentage: number | null
}

/**
 * Snapshot visual de la columna durante la sesión, con tres sensores marcados.
 * El sensor con desviación dominante se resalta en terracotta con una línea de
 * referencia al porcentaje.
 */
export function SessionSpineSnapshot({ warningSensor, deviationPercentage }: Props) {
  return (
    <svg viewBox="0 0 220 320" width="180" height="280" className="mx-auto">
      <line
        x1="110"
        y1="40"
        x2="110"
        y2="290"
        stroke="rgb(var(--color-ink-faint))"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <Sensor cx={110} cy={60} label="C" warn={warningSensor === 'cervical'} />
      <Sensor cx={110} cy={170} label="D" warn={warningSensor === 'dorsal'} />
      <Sensor cx={110} cy={280} label="L" warn={warningSensor === 'lumbar'} />

      {warningSensor && deviationPercentage !== null && (
        <Pointer
          y={warningSensor === 'cervical' ? 60 : warningSensor === 'dorsal' ? 170 : 280}
          percentage={deviationPercentage}
        />
      )}
    </svg>
  )
}

interface SensorProps {
  cx: number
  cy: number
  label: string
  warn: boolean
}

function Sensor({ cx, cy, label, warn }: SensorProps) {
  const fill = warn ? 'rgb(var(--color-terracotta))' : 'rgb(var(--color-moss))'
  const stroke = warn ? 'rgb(var(--color-terracotta-soft))' : 'rgb(var(--color-moss-soft))'
  const r = warn ? 24 : 22
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="1" />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill="rgb(var(--color-cream))"
        fontFamily="JetBrains Mono"
        fontSize="13"
      >
        {label}
      </text>
    </g>
  )
}

interface PointerProps {
  y: number
  percentage: number
}

function Pointer({ y, percentage }: PointerProps) {
  return (
    <g>
      <line
        x1={138}
        y1={y}
        x2={180}
        y2={y}
        stroke="rgb(var(--color-terracotta))"
        strokeWidth="0.6"
      />
      <text
        x={184}
        y={y - 4}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="rgb(var(--color-terracotta-deep))"
      >
        {percentage}%
      </text>
      <text
        x={184}
        y={y + 8}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="rgb(var(--color-terracotta-deep))"
      >
        DESV.
      </text>
    </g>
  )
}
