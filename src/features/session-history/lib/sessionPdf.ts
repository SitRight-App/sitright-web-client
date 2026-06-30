// src/features/session-history/lib/sessionPdf.ts
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'
import { recommendationsFor } from './postureGuidance'
import { METRIC_LABELS, POSTURE_LEGEND, dominantPlain } from './sessionCopy'

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

const DIST_LABELS: Record<string, string> = {
  adequate: 'Correcta',
  forward_slouch: 'Encorvado',
  excessive_recline: 'Reclinado',
}

export function buildDistribution(countsByClass: Record<string, number>): { label: string; pct: number }[] {
  const order = ['adequate', 'forward_slouch', 'excessive_recline']
  const total = order.reduce((a, k) => a + (countsByClass[k] ?? 0), 0)
  if (total === 0) return []
  return order
    .filter((k) => (countsByClass[k] ?? 0) > 0)
    .map((k) => ({ label: DIST_LABELS[k], pct: ((countsByClass[k] ?? 0) / total) * 100 }))
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
      tintOk: [235, 240, 236], tintDev: [250, 240, 235], white: [255, 255, 255],
    } as const
    const col = (c: readonly number[]) => pdf.setTextColor(c[0], c[1], c[2])
    const fill = (c: readonly number[]) => pdf.setFillColor(c[0], c[1], c[2])
    const draw = (c: readonly number[]) => pdf.setDrawColor(c[0], c[1], c[2])
    const lvl = scoreLevel(data.adequatePct)
    const levelColor = lvl === 'good' ? C.moss : lvl === 'mid' ? C.amber : C.terra

    function drawSpine(fx: number, fy: number, fw: number, fh: number, mode: 'ideal' | 'session') {
      const baseX = fx + fw * 0.42
      const segLen = (fh - 12) / 3
      const yHip = fy + fh
      const yLumbar = yHip - segLen
      const yDorsal = yLumbar - segLen
      const yCervical = yDorsal - segLen
      const off = (z: SpineZone) =>
        mode === 'session' ? Math.min(data.zones[z].avg_angle_deg, 30) * 0.6 : 0
      const xLumbar = baseX + off('lumbar')
      const xDorsal = baseX + off('dorsal')
      const xCervical = baseX + off('cervical')
      draw(C.soft); pdf.setLineWidth(1.4)
      pdf.line(baseX, yHip, xLumbar, yLumbar)
      pdf.line(xLumbar, yLumbar, xDorsal, yDorsal)
      pdf.line(xDorsal, yDorsal, xCervical, yCervical)
      const headR = 4.5
      const headY = yCervical - headR - 2
      pdf.line(xCervical, yCervical, xCervical, headY + headR)
      draw(C.sand); fill(C.white); pdf.setLineWidth(1)
      pdf.circle(xCervical, headY, headR, 'FD')
      fill(C.sand); pdf.circle(baseX, yHip, 2, 'F')
      const node = (x: number, yy: number, z: SpineZone) => {
        const tone = mode === 'ideal' ? 'ok' : toneFor(data.zones[z].deviated_pct)
        fill(toneColor(tone)); pdf.circle(x, yy, 2.6, 'F')
      }
      node(xCervical, yCervical, 'cervical')
      node(xDorsal, yDorsal, 'dorsal')
      node(xLumbar, yLumbar, 'lumbar')
    }

    // Encabezado
    col(C.moss); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17)
    pdf.text('SitRight', M, y + 2)
    col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    pdf.text('Reporte de sesión postural', M, y + 8)
    col(C.ink); pdf.setFontSize(11)
    pdf.text(data.dateLabel, pageW - M, y + 8, { align: 'right' })
    y += 13
    draw(C.sand); pdf.setLineWidth(0.4); pdf.line(M, y, pageW - M, y); y += 10

    // Score + cifras
    col(levelColor); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(30)
    pdf.text(`${data.adequatePct}%`, M, y + 3)
    col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    pdf.text(METRIC_LABELS.adequatePct, M, y + 9)
    const figs: [string, string][] = [
      [METRIC_LABELS.totalMinutes, `${data.totalMinutes} min`],
      [METRIC_LABELS.dominant, dominantPlain(data.dominantDeviation)],
      [METRIC_LABELS.pauses, String(data.pauses)],
    ]
    figs.forEach(([label, val], i) => {
      const fx = M + 56 + i * 44
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(label, fx, y)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text(val, fx, y + 5)
    })
    y += 15

    // Barra de distribución
    const dist = buildDistribution(data.countsByClass)
    const distColor = (label: string) => (label === 'Correcta' ? C.moss : label === 'Encorvado' ? C.tSoft : C.terra)
    if (dist.length > 0) {
      const barW = pageW - 2 * M
      let bx = M
      for (const d of dist) {
        const w = (d.pct / 100) * barW
        fill(distColor(d.label)); pdf.rect(bx, y, w, 7, 'F')
        bx += w
      }
      y += 12
      let lx = M
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
      for (const d of dist) {
        const text = `${d.label} ${Math.round(d.pct)}%`
        fill(distColor(d.label)); pdf.circle(lx + 1.5, y - 1.5, 1.5, 'F')
        col(C.soft); pdf.text(text, lx + 5, y)
        lx += pdf.getTextWidth(text) + 14
      }
      y += 9
    } else {
      col(C.soft); pdf.setFontSize(9)
      pdf.text('Sin datos suficientes de distribución.', M, y); y += 9
    }

    // Cómo te sentaste hoy (perfiles de columna)
    if (data.calibrated) {
      ensure(92)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
      pdf.text('Cómo te sentaste hoy', M, y); y += 7
      const figY = y, figH = 60, figW = 38
      drawSpine(M, figY, figW, figH, 'ideal')
      drawSpine(M + 46, figY, figW, figH, 'session')
      col(C.soft); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
      pdf.text('Postura correcta', M, figY + figH + 6)
      pdf.text('Tu sesión', M + 46, figY + figH + 6)
      const lx2 = M + 98
      let ly = figY + 8
      for (const z of ['cervical', 'dorsal', 'lumbar'] as SpineZone[]) {
        const d = data.zones[z]
        const tone = toneFor(d.deviated_pct)
        fill(toneColor(tone)); pdf.circle(lx2 + 2, ly - 1.6, 2, 'F')
        col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
        pdf.text(`${ZONE_LABELS[z]}  ${Math.round(d.avg_angle_deg)}°`, lx2 + 7, ly)
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)
        pdf.text(tone === 'ok' ? 'En rango' : `${Math.round(d.deviated_pct)}% del tiempo`, lx2 + 7, ly + 5)
        ly += 17
      }
      y = figY + figH + 13
    } else {
      ensure(10)
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
      pdf.text('El chaleco no estaba calibrado: no hay detalle por zona en esta sesión.', M, y); y += 10
    }

    // Detalle por zona (tarjetas)
    if (data.calibrated) {
      ensure(10)
      col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
      pdf.text('Detalle por zona', M, y); y += 6
      const ordered = ZONE_ORDER.map((z) => ({ z, d: data.zones[z] })).sort(
        (a, b) => b.d.deviated_pct - a.d.deviated_pct,
      )
      for (const { z, d } of ordered) {
        const ok = toneFor(d.deviated_pct) === 'ok'
        const metrics = ok
          ? 'Se mantuvo dentro de lo recomendado.'
          : `${METRIC_LABELS.deviatedPct}: ${Math.round(d.deviated_pct)}%   ·   ${METRIC_LABELS.avgAngle}: ${Math.round(d.avg_angle_deg)}°   ·   ${METRIC_LABELS.longestStreak}: hasta ${Math.max(1, Math.round(d.longest_streak_min))} min`
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)
        const metricLines = pdf.splitTextToSize(metrics, pageW - 2 * M - 8)
        const cardH = Math.max(16, 9 + metricLines.length * 4.5)
        ensure(cardH + 3)
        fill(ok ? C.tintOk : C.tintDev); draw(C.sand); pdf.setLineWidth(0.3)
        pdf.roundedRect(M, y, pageW - 2 * M, cardH, 2, 2, 'FD')
        col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
        pdf.text(ZONE_LABELS[z], M + 4, y + 7)
        col(ok ? C.moss : C.terra); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
        pdf.text(ok ? 'En rango' : 'Atención', pageW - M - 4, y + 7, { align: 'right' })
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)
        pdf.text(metricLines, M + 4, y + 13)
        y += cardH + 3
      }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
      const legendLines = pdf.splitTextToSize(POSTURE_LEGEND, pageW - 2 * M)
      ensure(legendLines.length * 4 + 3)
      col(C.soft)
      pdf.text(legendLines, M, y)
      y += legendLines.length * 4 + 3
    }

    // Recomendaciones (sin fuentes)
    const guide = recommendationsFor(data.dominantDeviation)
    ensure(12)
    col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Recomendaciones', M, y); y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    for (const tip of guide.tips) {
      const wrapped = pdf.splitTextToSize(tip, pageW - 2 * M - 5)
      ensure(wrapped.length * 5 + 1)
      fill(C.moss); pdf.circle(M + 1.2, y - 1.4, 1.2, 'F')
      col(C.soft); pdf.text(wrapped, M + 5, y)
      y += wrapped.length * 5 + 1
    }

    // Pie en todas las páginas
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
