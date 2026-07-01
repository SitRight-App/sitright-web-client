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

    function drawSeatedBody(fx: number, fy: number, fw: number, fh: number, mode: 'ideal' | 'session') {
      const xHip = fx + fw * 0.36
      const yHip = fy + fh * 0.62
      const yCerv = yHip - fh * 0.40
      const yDorsal = yHip - fh * 0.26
      const yLumbar = yHip - fh * 0.12
      // Zona peor (mayor % de tiempo desviada) — sobre ella va el arco.
      let worstZ: SpineZone | null = null
      let worstPct = -1
      for (const z of ZONE_ORDER) {
        const p = data.zones[z].deviated_pct
        if (toneFor(p) !== 'ok' && p > worstPct) { worstPct = p; worstZ = z }
      }
      // Inclinación única y ACOTADA del tronco (no se dobla cada vértebra por su
      // cuenta: eso se rompía con ángulos grandes). Adelante para encorvado,
      // atrás para reclinado; magnitud según la zona peor, con tope.
      const dir = data.dominantDeviation === 'excessive_recline' ? -1 : 1
      const leanMm =
        mode === 'session' && worstZ ? Math.min(data.zones[worstZ].avg_angle_deg, 30) * 0.3 * dir : 0
      const frac = (z: SpineZone) => (z === 'cervical' ? 1 : z === 'dorsal' ? 0.55 : 0.15)
      const xLumbar = xHip + leanMm * frac('lumbar')
      const xDorsal = xHip + leanMm * frac('dorsal')
      const xCerv = xHip + leanMm * frac('cervical')
      const body: readonly number[] = [223, 231, 224]
      const thighLen = fw * 0.5

      // Silla: asiento (superficie) + respaldo + patas
      const seatY = yHip + 3
      const seatX0 = xHip - fw * 0.20
      const seatX1 = xHip + thighLen + 2
      draw(C.sand); fill([244, 242, 237]); pdf.setLineWidth(0.5)
      pdf.rect(seatX0, seatY, seatX1 - seatX0, 2.5, 'FD')              // asiento
      pdf.line(seatX0, seatY, seatX0, yDorsal)                         // respaldo (hasta dorsal)
      pdf.line(seatX0 + 1.5, seatY + 2.5, seatX0 + 1.5, fy + fh)       // pata trasera
      pdf.line(seatX1 - 1.5, seatY + 2.5, seatX1 - 1.5, fy + fh)       // pata delantera

      // Pierna: muslo horizontal + pierna baja
      fill(body); draw(C.sand); pdf.setLineWidth(0.4)
      pdf.roundedRect(xHip - 2, yHip - 3, thighLen, 5, 2.5, 2.5, 'FD')
      pdf.roundedRect(xHip + thighLen - 5, yHip + 1, 5, fh * 0.26, 2.5, 2.5, 'FD')

      // Torso: silueta cerrada con el frente abultado (relleno visible + contorno)
      const shoulderW = fw * 0.30
      const bellyW = fw * 0.36
      const poly = [
        [xHip, yHip], [xLumbar, yLumbar], [xDorsal, yDorsal], [xCerv, yCerv], // espalda
        [xCerv + shoulderW, yCerv + 1.5],                                     // hombro
        [xHip + bellyW, yHip - (yHip - yCerv) * 0.42],                        // panza (abultado)
        [xHip + bellyW * 0.72, yHip],                                         // frente de cadera
      ]
      const rel: number[][] = []
      for (let i = 1; i < poly.length; i++) rel.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]])
      fill(body); draw(C.sand); pdf.setLineWidth(0.5)
      pdf.lines(rel, poly[0][0], poly[0][1], [1, 1], 'FD', true)

      // Brazo apoyado en el muslo (tenue, para no competir con la columna)
      draw(C.sand); pdf.setLineWidth(1.4)
      pdf.line(xCerv + shoulderW - 1, yCerv + 4, xHip + thighLen * 0.55, yHip - 2)

      // Columna (borde de la espalda) marcada
      draw(C.soft); pdf.setLineWidth(1.2)
      pdf.line(xHip, yHip, xLumbar, yLumbar)
      pdf.line(xLumbar, yLumbar, xDorsal, yDorsal)
      pdf.line(xDorsal, yDorsal, xCerv, yCerv)

      // Cabeza (chica, rellena) + cuello
      const headR = fw * 0.085
      const headCx = xCerv + headR * 0.5
      const headCy = yCerv - headR - 2.5
      draw(C.soft); pdf.setLineWidth(1.4)
      pdf.line(xCerv, yCerv, headCx, headCy + headR)
      draw(C.sand); fill(body); pdf.setLineWidth(0.5)
      pdf.circle(headCx, headCy, headR, 'FD')

      // Nodos por zona + arco de ángulo (session)
      const drawNode = (x: number, yy: number, z: SpineZone) => {
        const tone = mode === 'ideal' ? 'ok' : toneFor(data.zones[z].deviated_pct)
        fill(toneColor(tone)); pdf.circle(x, yy, 2.2, 'F')
        if (mode === 'session' && z === worstZ && tone !== 'ok') {
          const deg = Math.round(data.zones[z].avg_angle_deg)
          const L = 9
          draw(toneColor(tone)); pdf.setLineWidth(0.6)
          pdf.line(x, yy, x, yy - L)                                          // neutro
          pdf.setLineWidth(1)
          pdf.line(x, yy, x + L * Math.sin(rad(deg)), yy - L * Math.cos(rad(deg))) // real
          const r = 5
          let px = x, py = yy - r
          for (let s = 1; s <= 6; s++) {
            const a = (deg * s) / 6
            const nx = x + r * Math.sin(rad(a))
            const ny = yy - r * Math.cos(rad(a))
            pdf.setLineWidth(0.5); pdf.line(px, py, nx, ny)
            px = nx; py = ny
          }
          col(toneColor(tone)); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
          pdf.text(`${deg}°`, x + L * Math.sin(rad(deg)) + 1.5, yy - L * Math.cos(rad(deg)))
        }
      }
      drawNode(xCerv, yCerv, 'cervical')
      drawNode(xDorsal, yDorsal, 'dorsal')
      drawNode(xLumbar, yLumbar, 'lumbar')
    }

    // 1. Encabezado
    col(C.moss); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17)
    pdf.text('SitRight', M, y + 2)
    col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    pdf.text('Reporte de sesión postural', M, y + 8)
    col(C.ink); pdf.setFontSize(11)
    pdf.text(data.dateLabel, pageW - M, y + 8, { align: 'right' })
    y += 13
    draw(C.sand); pdf.setLineWidth(0.4); pdf.line(M, y, pageW - M, y); y += 9

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
      y += 9
    } else {
      col(C.soft); pdf.setFontSize(9); pdf.text('Sin datos suficientes de distribución.', M, y); y += 9
    }

    // 3. Cómo te sentaste hoy (cuerpos)
    if (data.calibrated) {
      ensure(96)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
      pdf.text('Cómo te sentaste hoy', M, y); y += 7
      const figY = y, figH = 64, figW = 70
      drawSeatedBody(M, figY, figW, figH, 'ideal')
      drawSeatedBody(M + 96, figY, figW, figH, 'session')
      col(C.soft); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
      pdf.text('Postura correcta', M, figY + figH + 4)
      pdf.text('Tu sesión', M + 96, figY + figH + 4)
      y = figY + figH + 11
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
      y += 9
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

    // 6. Pie en todas las páginas
    const pageCount = pdf.getNumberOfPages()
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(120, 126, 118)
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p)
      pdf.text('Prediagnóstico orientativo; no reemplaza la evaluación de un profesional de salud.', M, pageH - 14)
    }

    pdf.save(`sitright-sesion-${data.sessionId.slice(0, 8)}.pdf`)
  } catch {
    window.print()
  }
}
