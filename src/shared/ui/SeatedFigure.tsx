/**
 * Figura humana sentada de perfil, con las tres zonas de la columna (cervical,
 * dorsal, lumbar) resaltables. Lenguaje visual único compartido por el
 * dashboard (estado en vivo) y el reporte de sesión (carga agregada).
 *
 * El color de cada zona lo decide su `tone`; la cabeza se inclina hacia adelante
 * según `headTilt` (grados). Los callouts son opcionales (los usa el reporte
 * para mostrar % y grados; el dashboard no los pasa).
 */

export type FigureTone = 'neutral' | 'ok' | 'leve' | 'marcada'

export interface SeatedFigureZone {
  tone: FigureTone
  /** Hasta 2 líneas cortas a la izquierda del nodo (p. ej. ['32%', '22°']). */
  callout?: string[]
}

interface Props {
  cervical: SeatedFigureZone
  dorsal: SeatedFigureZone
  lumbar: SeatedFigureZone
  headTilt?: number
  className?: string
}

const TONE: Record<FigureTone, { core: string; halo: string; ring: string }> = {
  neutral: { core: '#5C645B', halo: 'rgba(92,100,91,0.10)', ring: '#8A9088' },
  ok: { core: '#2D4A36', halo: 'rgba(45,74,54,0.12)', ring: '#4D6B55' },
  leve: { core: '#C8623C', halo: 'rgba(200,98,60,0.16)', ring: '#E8A685' },
  marcada: { core: '#A24A28', halo: 'rgba(162,74,40,0.20)', ring: '#C8623C' },
}

const CALLOUT_TEXT: Record<FigureTone, string> = {
  neutral: '#5C645B',
  ok: '#2D4A36',
  leve: '#A24A28',
  marcada: '#A24A28',
}

const NODE = {
  cervical: { x: 98, y: 122, label: 'C' },
  dorsal: { x: 90, y: 162, label: 'D' },
  lumbar: { x: 94, y: 200, label: 'L' },
} as const

const BODY_FILL = 'rgba(45,74,54,0.07)'
const BODY_STROKE = 'rgba(45,74,54,0.22)'

function radiusFor(tone: FigureTone): number {
  if (tone === 'marcada') return 15
  if (tone === 'leve') return 13
  return 11
}

export function SeatedFigure({ cervical, dorsal, lumbar, headTilt = 0, className }: Props) {
  const zones = { cervical, dorsal, lumbar }

  return (
    <svg
      viewBox="0 0 270 300"
      width="100%"
      height="auto"
      className={className}
      role="img"
      aria-label="Figura corporal con zonas de la columna"
    >
      {/* Silla (referencia) */}
      <rect x="56" y="116" width="7" height="104" rx="3" fill="rgba(92,100,91,0.10)" />
      <rect x="56" y="214" width="124" height="7" rx="3" fill="rgba(92,100,91,0.10)" />
      <line x1="60" y1="221" x2="60" y2="276" stroke="rgba(92,100,91,0.18)" strokeWidth="2" />
      <line x1="174" y1="221" x2="174" y2="276" stroke="rgba(92,100,91,0.18)" strokeWidth="2" />

      {/* Pierna y muslo */}
      <rect x="94" y="194" width="86" height="24" rx="12" fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />
      <rect x="158" y="208" width="20" height="62" rx="10" fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />
      <path d="M158 268 q-2 8 12 8 l10 0 q4 0 4 -5 l0 -3 -26 0 Z" fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />

      {/* Brazo apoyado en el muslo */}
      <path d="M110 132 q22 6 30 40 q2 14 -8 22" fill="none" stroke={BODY_STROKE} strokeWidth="9" strokeLinecap="round" opacity="0.5" />

      {/* Torso (perfil, espalda a la izquierda) */}
      <path
        d="M90 120 C82 150 84 182 94 204 L120 204 C123 176 118 148 113 124 C109 114 95 113 90 120 Z"
        fill={BODY_FILL}
        stroke={BODY_STROKE}
        strokeWidth="1.4"
      />

      {/* Cabeza + cuello, inclinables hacia adelante */}
      <g transform={`rotate(${headTilt} 100 116)`}>
        <rect x="98" y="100" width="16" height="22" rx="7" fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />
        <circle cx="111" cy="84" r="21" fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.4" />
        <path d="M131 84 q6 2 0 6" fill="none" stroke={BODY_STROKE} strokeWidth="1.4" />
      </g>

      {/* Línea de la columna */}
      <path
        d={`M${NODE.cervical.x} ${NODE.cervical.y} Q ${NODE.dorsal.x - 4} ${(NODE.cervical.y + NODE.dorsal.y) / 2} ${NODE.dorsal.x} ${NODE.dorsal.y} Q ${NODE.lumbar.x - 6} ${(NODE.dorsal.y + NODE.lumbar.y) / 2} ${NODE.lumbar.x} ${NODE.lumbar.y}`}
        fill="none"
        stroke="rgba(92,100,91,0.5)"
        strokeWidth="1.4"
        strokeDasharray="3 4"
      />

      {/* Nodos por zona */}
      {(Object.keys(NODE) as Array<keyof typeof NODE>).map((zone) => {
        const { tone, callout } = zones[zone]
        const t = TONE[tone]
        const { x, y, label } = NODE[zone]
        const r = radiusFor(tone)
        const showHalo = tone === 'leve' || tone === 'marcada'
        return (
          <g key={zone}>
            {showHalo && <circle cx={x} cy={y} r={r + 8} fill={t.halo} />}
            <circle cx={x} cy={y} r={r} fill={t.core} stroke={t.ring} strokeWidth="1.4" />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              fontWeight="500"
            >
              {label}
            </text>
            {callout && callout.length > 0 && (
              <g>
                <line x1={x - r - 2} y1={y} x2="34" y2={y} stroke={t.ring} strokeWidth="0.8" />
                {callout.slice(0, 2).map((line, i) => (
                  <text
                    key={i}
                    x="32"
                    y={callout.length > 1 ? (i === 0 ? y - 3 : y + 9) : y + 3}
                    textAnchor="end"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize={i === 0 ? 10 : 9}
                    fill={CALLOUT_TEXT[tone]}
                    opacity={i === 0 ? 1 : 0.8}
                  >
                    {line}
                  </text>
                ))}
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
