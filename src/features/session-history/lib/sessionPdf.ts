// src/features/session-history/lib/sessionPdf.ts
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'
import { recommendationKey, recommendationsFor } from './postureGuidance'
import { METRIC_LABELS, POSTURE_LEGEND, streakLabel, verdictSentence } from './sessionCopy'

export function scoreLevel(pct: number): 'good' | 'mid' | 'low' {
  if (pct >= 70) return 'good'
  if (pct >= 50) return 'mid'
  return 'low'
}

export function toneColor(tone: 'ok' | 'leve' | 'marcada'): [number, number, number] {
  if (tone === 'ok') return [45, 74, 54]
  if (tone === 'leve') return [232, 166, 133]
  return [200, 98, 60]
}

/**
 * Distribución para la barra: "Correcta" usa el MISMO % que el score
 * (`adequatePct`) para que el reporte sea coherente, y el resto (100 - score) se
 * reparte entre Encorvado/Reclinado según su proporción en `countsByClass`. Si
 * no hay clases de desviación, el resto va a un único segmento "Desviada".
 */
export function buildDistribution(
  countsByClass: Record<string, number>,
  adequatePct: number,
): { label: string; pct: number }[] {
  const correcta = Math.max(0, Math.min(100, Math.round(adequatePct)))
  const remaining = 100 - correcta
  const out: { label: string; pct: number }[] = []
  if (correcta > 0) out.push({ label: 'Correcta', pct: correcta })
  if (remaining > 0) {
    const fs = countsByClass['forward_slouch'] ?? 0
    const er = countsByClass['excessive_recline'] ?? 0
    const devTotal = fs + er
    if (devTotal > 0) {
      const enc = Math.round((fs / devTotal) * remaining)
      const rec = remaining - enc
      if (enc > 0) out.push({ label: 'Encorvado', pct: enc })
      if (rec > 0) out.push({ label: 'Reclinado', pct: rec })
    } else {
      out.push({ label: 'Desviada', pct: remaining })
    }
  }
  return out
}

export interface SessionPdfData {
  sessionId: string
  patientName: string
  dateLabel: string
  totalMinutes: number
  adequatePct: number
  dominantDeviation: string | null
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
  countsByClass: Record<string, number>
  pauses: number
  trend: { bars: { label: string; pct: number; current: boolean }[]; delta: number | null }
}

export async function buildSessionPdf(data: SessionPdfData): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const M = 16
    const BOTTOM = pageH - 18
    let y = M
    const ensure = (h: number) => { if (y + h > BOTTOM) { pdf.addPage(); y = M } }

    const C = {
      moss: [45, 74, 54], tSoft: [232, 166, 133], terra: [200, 98, 60], amber: [196, 128, 20],
      ink: [44, 49, 43], soft: [74, 82, 73], sand: [214, 211, 203],
      tintOk: [235, 240, 236], white: [255, 255, 255],
    } as const
    const col = (c: readonly number[]) => pdf.setTextColor(c[0], c[1], c[2])
    const fill = (c: readonly number[]) => pdf.setFillColor(c[0], c[1], c[2])
    const draw = (c: readonly number[]) => pdf.setDrawColor(c[0], c[1], c[2])
    const lvl = scoreLevel(data.adequatePct)
    const levelColor = lvl === 'good' ? C.moss : lvl === 'mid' ? C.amber : C.terra
    const rad = (deg: number) => (deg * Math.PI) / 180

    // Esquema lateral de una persona sentada. La COLUMNA es el borde de la
    // espalda (línea marcada con nodos por zona); el torso es una banda de
    // grosor constante que la sigue (nunca una mancha). Sobre la zona peor se
    // dibuja el arco del ángulo respecto a la vertical, al estilo ficha clínica.
    function drawSeatedBody(fx: number, fy: number, fw: number, fh: number, mode: 'ideal' | 'session') {
      const bodyC: readonly number[] = [226, 232, 226]
      const chairC: readonly number[] = [196, 193, 185]
      const hipX = fx + fw * 0.36
      const hipY = fy + fh * 0.66
      const spineLen = fh * 0.42
      const yLum = hipY - spineLen * 0.32
      const yDor = hipY - spineLen * 0.66
      const yCer = hipY - spineLen * 1.0

      // Zona peor (mayor % de tiempo desviada) — sobre ella va el arco.
      let worstZ: SpineZone | null = null
      let worstPct = -1
      for (const z of ZONE_ORDER) {
        const p = data.zones[z].deviated_pct
        if (toneFor(p) !== 'ok' && p > worstPct) { worstPct = p; worstZ = z }
      }

      // Curvatura del tronco: crece hacia arriba. Adelante para encorvado,
      // atrás para reclinado; magnitud según el ángulo de la zona peor (con tope).
      const dir = data.dominantDeviation === 'excessive_recline' ? -1 : 1
      const deg = mode === 'session' && worstZ ? Math.min(data.zones[worstZ].avg_angle_deg, 40) : 0
      const k = spineLen * 0.012
      const dCer = dir * deg * k
      const xHip = hipX
      const xLum = hipX + dCer * 0.16
      const xDor = hipX + dCer * 0.5
      const xCer = hipX + dCer

      // Silla: asiento + respaldo + patas
      const seatY = hipY + fh * 0.05
      const backX = hipX - fw * 0.24
      const kneeX = hipX + fw * 0.5
      draw(chairC); pdf.setLineWidth(0.9)
      pdf.line(backX, seatY, kneeX + fw * 0.04, seatY)
      pdf.line(backX, seatY, backX, yDor)
      pdf.setLineWidth(0.6)
      pdf.line(backX + fw * 0.03, seatY, backX + fw * 0.03, fy + fh)
      pdf.line(kneeX - fw * 0.02, seatY, kneeX - fw * 0.02, fy + fh)

      // Pierna: muslo horizontal + pierna baja
      fill(bodyC); draw(C.soft); pdf.setLineWidth(0.5)
      pdf.roundedRect(hipX - fw * 0.04, seatY - fh * 0.055, kneeX - (hipX - fw * 0.04), fh * 0.055, fh * 0.02, fh * 0.02, 'FD')
      pdf.roundedRect(kneeX - fh * 0.05, seatY, fh * 0.05, fh * 0.27, fh * 0.02, fh * 0.02, 'FD')

      // Torso: banda de grosor constante que sigue la columna (espalda + frente)
      const tw = fw * 0.2
      const poly = [
        [xHip, hipY], [xLum, yLum], [xDor, yDor], [xCer, yCer],             // espalda (columna)
        [xCer + tw, yCer + fh * 0.006], [xDor + tw, yDor],                  // frente (paralelo)
        [xLum + tw, yLum], [xHip + tw, hipY],
      ]
      const rel: number[][] = []
      for (let i = 1; i < poly.length; i++) rel.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]])
      fill(bodyC); draw(C.soft); pdf.setLineWidth(0.5)
      pdf.lines(rel, poly[0][0], poly[0][1], [1, 1], 'FD', true)

      // Brazo apoyado en el muslo (tenue, para no competir con la columna)
      draw(chairC); pdf.setLineWidth(1.6)
      pdf.line(xCer + tw * 0.7, yCer + fh * 0.04, kneeX - fw * 0.16, seatY - fh * 0.02)

      // Columna (borde de la espalda) marcada
      draw(C.soft); pdf.setLineWidth(1.4)
      pdf.line(xHip, hipY, xLum, yLum)
      pdf.line(xLum, yLum, xDor, yDor)
      pdf.line(xDor, yDor, xCer, yCer)

      // Cuello + cabeza
      const headR = fw * 0.09
      const neckTopX = xCer + dir * deg * k * 0.35
      const neckTopY = yCer - fh * 0.055
      const headCx = neckTopX + dir * headR * 0.4
      const headCy = neckTopY - headR * 0.85
      draw(C.soft); pdf.setLineWidth(1.7)
      pdf.line(xCer, yCer, neckTopX, neckTopY)
      draw(C.soft); fill(bodyC); pdf.setLineWidth(0.6)
      pdf.circle(headCx, headCy, headR, 'FD')

      // Nodos por zona + arco de ángulo (session) respecto a la vertical
      const drawNode = (x: number, yy: number, z: SpineZone) => {
        const tone = mode === 'ideal' ? 'ok' : toneFor(data.zones[z].deviated_pct)
        fill(toneColor(tone)); draw(C.white); pdf.setLineWidth(0.5)
        pdf.circle(x, yy, 2.1, 'FD')
        if (mode === 'session' && z === worstZ && tone !== 'ok') {
          const d = Math.round(data.zones[z].avg_angle_deg)
          const L = fh * (z === 'cervical' ? 0.12 : 0.17)
          draw([150, 154, 148]); pdf.setLineWidth(0.5)
          pdf.line(x, yy, x, yy - L)                                          // vertical neutra
          draw(toneColor(tone)); pdf.setLineWidth(1.2)
          const ax = x + dir * L * Math.sin(rad(d))
          const ay = yy - L * Math.cos(rad(d))
          pdf.line(x, yy, ax, ay)                                             // dirección real
          const r = L * 0.5
          let px = x, py = yy - r
          for (let s = 1; s <= 8; s++) {
            const a = (d * s) / 8
            const nx = x + dir * r * Math.sin(rad(a))
            const ny = yy - r * Math.cos(rad(a))
            pdf.setLineWidth(0.6); pdf.line(px, py, nx, ny)
            px = nx; py = ny
          }
          col(toneColor(tone)); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
          pdf.text(`${d}°`, ax + dir * 1.5, ay, { align: dir > 0 ? 'left' : 'right' })
        }
      }
      drawNode(xCer, yCer, 'cervical')
      drawNode(xDor, yDor, 'dorsal')
      drawNode(xLum, yLum, 'lumbar')
    }

    // 1. Encabezado
    col(C.moss); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17)
    pdf.text('SitRight', M, y + 2)
    col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    pdf.text('Reporte de sesión postural', M, y + 8)
    col(C.ink); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    pdf.text(data.dateLabel, pageW - M, y + 2, { align: 'right' })
    y += 12
    draw(C.sand); pdf.setLineWidth(0.4); pdf.line(M, y, pageW - M, y); y += 7
    col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text(`Paciente: ${data.patientName}`, M, y); y += 8

    // 2. Cómo te fue (veredicto + score + barra + chips)
    const verdict = verdictSentence({ adequatePct: data.adequatePct, zones: data.zones, calibrated: data.calibrated })
    col(C.ink); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
    const vLines = pdf.splitTextToSize(verdict, pageW - 2 * M)
    ensure(vLines.length * 5 + 2)
    pdf.text(vLines, M, y); y += vLines.length * 5 + 4

    col(levelColor); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(26)
    pdf.text(`${data.adequatePct}%`, M, y + 7)
    col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)
    pdf.text(METRIC_LABELS.adequatePct, M, y + 12)
    const chip = (label: string, val: string, cx: number) => {
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(label, cx, y + 2)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text(val, cx, y + 7)
    }
    chip(METRIC_LABELS.totalMinutes, `${Math.round(data.totalMinutes)} min`, M + 64)
    chip(METRIC_LABELS.pauses, String(data.pauses), M + 110)
    y += 16

    const dist = buildDistribution(data.countsByClass, data.adequatePct)
    const distColor = (label: string) => (label === 'Correcta' ? C.moss : label === 'Encorvado' ? C.tSoft : C.terra)
    if (dist.length > 0) {
      const barW = pageW - 2 * M
      let bx = M
      for (const d of dist) { const w = (d.pct / 100) * barW; fill(distColor(d.label)); pdf.rect(bx, y, w, 6, 'F'); bx += w }
      y += 11
      let lx = M; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
      for (const d of dist) {
        const t = `${d.label} ${Math.round(d.pct)}%`
        fill(distColor(d.label)); pdf.circle(lx + 1.5, y - 1.5, 1.5, 'F')
        col(C.soft); pdf.text(t, lx + 5, y); lx += pdf.getTextWidth(t) + 14
      }
      y += 6
    } else {
      col(C.soft); pdf.setFontSize(9); pdf.text('Sin datos suficientes de distribución.', M, y); y += 9
    }

    // 3. Cómo te sentaste hoy (cuerpos)
    if (data.calibrated) {
      ensure(74)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
      pdf.text('Cómo te sentaste hoy', M, y); y += 8
      const figY = y, figH = 44, figW = 70
      drawSeatedBody(M, figY, figW, figH, 'ideal')
      drawSeatedBody(M + 96, figY, figW, figH, 'session')
      col(C.soft); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
      pdf.text('Postura correcta', M, figY + figH + 4)
      pdf.text('Tu sesión', M + 96, figY + figH + 4)
      y = figY + figH + 9
    } else {
      ensure(10)
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
      pdf.text('El chaleco no estaba calibrado: no hay detalle por zona en esta sesión.', M, y); y += 10
    }

    // 4. Qué pasó en cada zona (líneas)
    if (data.calibrated) {
      ensure(10)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
      pdf.text('Qué pasó en cada zona', M, y); y += 6
      const ordered = ZONE_ORDER.map((z) => ({ z, d: data.zones[z] })).sort((a, b) => b.d.deviated_pct - a.d.deviated_pct)
      for (const { z, d } of ordered) {
        const ok = toneFor(d.deviated_pct) === 'ok'
        const line = ok
          ? `${ZONE_LABELS[z]} - en rango`
          : `${ZONE_LABELS[z]} - se inclinó ${Math.round(d.avg_angle_deg)}° el ${Math.round(d.deviated_pct)}% del tiempo, ${streakLabel(d.longest_streak_min)}`
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
        const wrapped = pdf.splitTextToSize(line, pageW - 2 * M - 6)
        ensure(wrapped.length * 5 + 1)
        fill(ok ? C.moss : C.terra); pdf.circle(M + 1.5, y - 1.4, 1.6, 'F')
        col(C.ink); pdf.text(wrapped, M + 6, y)
        y += wrapped.length * 5 + 1
      }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
      const legendLines = pdf.splitTextToSize(POSTURE_LEGEND, pageW - 2 * M)
      ensure(legendLines.length * 4 + 4)
      col(C.soft); pdf.text(legendLines, M, y)
      y += legendLines.length * 4 + 4
    }

    // Comparación con otros días
    ensure(12)
    col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Comparación con otros días', M, y); y += 6
    if (data.trend.bars.length < 2) {
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
      pdf.text('Primera sesión registrada - aún no hay con qué comparar.', M, y); y += 8
    } else {
      const bars = data.trend.bars
      const chartH = 20
      const gap = 3
      const barW = Math.min(16, (pageW - 2 * M - gap * (bars.length - 1)) / bars.length)
      ensure(chartH + 16)
      const baseY = y + chartH
      bars.forEach((b, i) => {
        const bx = M + i * (barW + gap)
        const h = Math.max(1.5, (b.pct / 100) * chartH)
        const lvl = scoreLevel(b.pct)
        const c = lvl === 'good' ? C.moss : lvl === 'mid' ? C.amber : C.terra
        fill(c); pdf.rect(bx, baseY - h, barW, h, 'F')
        if (b.current) {
          draw(C.ink); pdf.setLineWidth(0.5); pdf.rect(bx, baseY - h, barW, h, 'S')
          col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
          pdf.text(`${b.pct}%`, bx, baseY - h - 1.5)
        }
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
        pdf.text(b.label, bx, baseY + 4)
      })
      y = baseY + 9
      const d = data.trend.delta
      if (d === null) {
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
        pdf.text('Sin sesión previa.', M, y)
      } else {
        const dc = d > 0 ? C.moss : d < 0 ? C.terra : C.soft
        col(dc); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
        pdf.text(`Frente a la sesión anterior: ${d > 0 ? '+' : ''}${d} pts`, M, y)
      }
      y += 7
    }

    // 5. Qué hacer (recomendaciones, sin fuentes)
    const guide = recommendationsFor(recommendationKey(data.dominantDeviation, data.zones))
    ensure(12)
    col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Qué hacer', M, y); y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    for (const tip of guide.tips) {
      const wrapped = pdf.splitTextToSize(tip, pageW - 2 * M - 6)
      ensure(wrapped.length * 5 + 1)
      fill(C.moss); pdf.circle(M + 1.5, y - 1.4, 1.2, 'F')
      col(C.soft); pdf.text(wrapped, M + 6, y)
      y += wrapped.length * 5 + 1
    }

    // 6. Aviso en recuadro gris punteado (no es un prediagnóstico)
    const disclaimer =
      'Considera este reporte como una evaluación orientativa de tu postura. No reemplaza la valoración de un profesional de la salud.'
    const dPad = 4
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    const dLines = pdf.splitTextToSize(disclaimer, pageW - 2 * M - 2 * dPad)
    const dH = dLines.length * 4.6 + 2 * dPad
    ensure(dH + 3)
    y += 3
    fill([245, 245, 243]); draw([150, 154, 148]); pdf.setLineWidth(0.4)
    pdf.setLineDashPattern([0.7, 0.7], 0)
    pdf.rect(M, y, pageW - 2 * M, dH, 'FD')
    pdf.setLineDashPattern([], 0)
    col(C.soft); pdf.text(dLines, M + dPad, y + dPad + 3.2)

    pdf.save(`sitright-sesion-${data.sessionId.slice(0, 8)}.pdf`)
  } catch {
    window.print()
  }
}
