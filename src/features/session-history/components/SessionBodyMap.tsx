import type { SpineZone, ZoneDeviation } from '../types/session'

interface Props {
  zones: Record<SpineZone, ZoneDeviation>
  thresholdDeg: number
}

/**
 * Mapa corporal lateral (persona sentada de perfil) que resalta las zonas con
 * desviación postural durante la sesión. La intensidad del color crece con el %
 * de tiempo desviado; la cabeza se inclina hacia adelante proporcional a la
 * desviación cervical promedio, para una lectura más humana (ADR-006).
 */

type Severity = 'ok' | 'leve' | 'marcada'

// Bandas de color por % de tiempo desviado (presentación, no cutoff clínico).
function severity(pct: number): Severity {
  if (pct < 5) return 'ok'
  if (pct < 25) return 'leve'
  return 'marcada'
}

const TONE: Record<Severity, { core: string; halo: string; ring: string; text: string }> = {
  ok: { core: '#2D4A36', halo: 'rgba(45,74,54,0.12)', ring: '#4D6B55', text: '#2D4A36' },
  leve: { core: '#C8623C', halo: 'rgba(200,98,60,0.16)', ring: '#E8A685', text: '#A24A28' },
  marcada: { core: '#A24A28', halo: 'rgba(162,74,40,0.20)', ring: '#C8623C', text: '#A24A28' },
}

// Posición de cada nodo sobre la espalda (cervical arriba → lumbar abajo).
const NODE: Record<SpineZone, { x: number; y: number; label: string }> = {
  cervical: { x: 98, y: 122, label: 'C' },
  dorsal: { x: 90, y: 162, label: 'D' },
  lumbar: { x: 94, y: 200, label: 'L' },
}

const BODY_FILL = 'rgba(45,74,54,0.07)'
const BODY_STROKE = 'rgba(45,74,54,0.22)'

export function SessionBodyMap({ zones }: Props) {
  // Inclinación de la cabeza hacia adelante según la desviación cervical (cap 32°).
  const headTilt = Math.min(zones.cervical.avg_angle_deg, 32)

  return (
    <svg viewBox="0 0 270 300" width="100%" height="auto" className="mx-auto max-w-[300px]" role="img" aria-label="Mapa corporal de la sesión">
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
        {/* nariz mirando a la derecha */}
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

      {/* Nodos por zona + callout para las desviadas */}
      {(Object.keys(NODE) as SpineZone[]).map((zone) => {
        const d = zones[zone]
        const sev = severity(d.deviated_pct)
        const tone = TONE[sev]
        const { x, y, label } = NODE[zone]
        const r = sev === 'marcada' ? 15 : sev === 'leve' ? 13 : 11
        return (
          <g key={zone}>
            {sev !== 'ok' && (
              <circle cx={x} cy={y} r={r + 8} fill={tone.halo} />
            )}
            <circle cx={x} cy={y} r={r} fill={tone.core} stroke={tone.ring} strokeWidth="1.4" />
            <text x={x} y={y + 4} textAnchor="middle" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="500">
              {label}
            </text>
            {/* Callout solo si la zona estuvo desviada */}
            {sev !== 'ok' && (
              <g>
                <line x1={x - r - 2} y1={y} x2="34" y2={y} stroke={tone.ring} strokeWidth="0.8" />
                <text x="32" y={y - 3} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={tone.text}>
                  {Math.round(d.deviated_pct)}%
                </text>
                <text x="32" y={y + 9} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={tone.text} opacity="0.8">
                  {Math.round(d.avg_angle_deg)}°
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
