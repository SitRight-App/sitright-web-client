// src/features/session-history/lib/sessionPdf.ts
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER } from './zoneTone'
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

export const ZONE_TABLE_HEADERS = [
  'Zona',
  '% del tiempo inclinada',
  'Cuánto se inclinó',
  'Lo más que se inclinó',
  'De corrido',
  'Veces',
]

export function buildZoneTableRows(zones: Record<SpineZone, ZoneDeviation>): string[][] {
  return ZONE_ORDER.map((z) => {
    const d = zones[z]
    return [
      ZONE_LABELS[z],
      `${Math.round(d.deviated_pct)}%`,
      `${Math.round(d.avg_angle_deg)}°`,
      `${Math.round(d.peak_angle_deg)}°`,
      `${Math.max(1, Math.round(d.longest_streak_min))} min`,
      String(d.episodes),
    ]
  })
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

/** Rasteriza un <svg> del DOM a PNG dataURL. Devuelve null si falla. */
async function svgToPng(svg: SVGSVGElement, scale = 3): Promise<string | null> {
  try {
    const rect = svg.getBoundingClientRect()
    const w = Math.max(rect.width, 120)
    const h = Math.max(rect.height, 150)
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(w))
    clone.setAttribute('height', String(h))
    const xml = new XMLSerializer().serializeToString(clone)
    const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function figurePng(which: 'ideal' | 'session'): Promise<string | null> {
  const svg = document.querySelector<SVGSVGElement>(`[data-pdf-figure="${which}"] svg`)
  return svg ? svgToPng(svg) : Promise.resolve(null)
}

export async function buildSessionPdf(data: SessionPdfData): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf')
    const [idealPng, sessionPng] = await Promise.all([figurePng('ideal'), figurePng('session')])

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const M = 16
    const BOTTOM = pageH - 18
    let y = M
    const ensure = (h: number) => {
      if (y + h > BOTTOM) { pdf.addPage(); y = M }
    }
    const ink = () => pdf.setTextColor(44, 49, 43)
    const soft = () => pdf.setTextColor(74, 82, 73)

    // Encabezado
    pdf.setTextColor(45, 74, 54); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18)
    pdf.text('SitRight', M, y + 2)
    soft(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
    pdf.text('Reporte de sesión postural', M, y + 9)
    ink(); pdf.setFontSize(12)
    pdf.text(`${data.dateLabel}  ·  ${METRIC_LABELS.totalMinutes}: ${data.totalMinutes} min`, M, y + 16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${METRIC_LABELS.adequatePct}: ${data.adequatePct}%`, M, y + 23)
    pdf.setFont('helvetica', 'normal')
    y += 31
    pdf.setDrawColor(214, 211, 203); pdf.line(M, y, pageW - M, y); y += 8

    // Resumen (izq) + Distribución (der)
    const colR = M + 92
    ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Resumen', M, y)
    pdf.text('Distribución', colR, y)
    y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); soft()
    const resumen = [
      `${METRIC_LABELS.totalMinutes}: ${data.totalMinutes} min`,
      `${METRIC_LABELS.adequatePct}: ${data.adequatePct}%`,
      `${METRIC_LABELS.dominant}: ${dominantPlain(data.dominantDeviation)}`,
      `${METRIC_LABELS.pauses}: ${data.pauses}`,
    ]
    const dist = buildDistribution(data.countsByClass)
    const rowsN = Math.max(resumen.length, dist.length || 1)
    for (let i = 0; i < rowsN; i++) {
      ensure(6)
      if (resumen[i]) pdf.text(`• ${resumen[i]}`, M, y)
      if (dist[i]) pdf.text(`• ${dist[i].label}: ${Math.round(dist[i].pct)}%`, colR, y)
      y += 6
    }
    if (dist.length === 0) { pdf.text('Sin datos suficientes de distribución.', colR, y - rowsN * 6) }
    y += 4

    // Cómo te sentaste hoy (figuras)
    const figW = 50, figH = 64
    ensure(4 + figH + 14)
    ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
    pdf.text('Cómo te sentaste hoy', M, y); y += 4
    const x1 = M, x2 = M + figW + 24
    if (idealPng) pdf.addImage(idealPng, 'PNG', x1, y, figW, figH)
    if (sessionPng) pdf.addImage(sessionPng, 'PNG', x2, y, figW, figH)
    pdf.setFontSize(11)
    pdf.text('Postura correcta', x1, y + figH + 6)
    pdf.text('Tu sesión', x2, y + figH + 6)
    y += figH + 14

    // Detalle por zona (tabla con glosario) — solo con calibración
    if (data.calibrated) {
      ensure(13)
      ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
      pdf.text('Detalle por zona', M, y); y += 6
      const colX = [M, M + 26, M + 78, M + 116, M + 150, M + 176]
      pdf.setFontSize(8)
      ZONE_TABLE_HEADERS.forEach((h, i) => pdf.text(h, colX[i], y))
      y += 2; pdf.setDrawColor(214, 211, 203); pdf.line(M, y, pageW - M, y); y += 5
      pdf.setFont('helvetica', 'normal'); soft(); pdf.setFontSize(8)
      for (const row of buildZoneTableRows(data.zones)) {
        ensure(6)
        row.forEach((cell, i) => pdf.text(cell, colX[i], y))
        y += 6
      }
      ensure(6)
      pdf.setFontSize(7)
      pdf.text(pdf.splitTextToSize(POSTURE_LEGEND, pageW - M * 2), M, y)
      y += 8
    }

    // Recomendaciones (evidencia) + Fuentes
    const guide = recommendationsFor(data.dominantDeviation)
    ensure(12)
    ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Recomendaciones', M, y); y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); soft()
    for (const tip of guide.tips) {
      const wrapped = pdf.splitTextToSize(`• ${tip}`, pageW - M * 2)
      ensure(wrapped.length * 5 + 1)
      pdf.text(wrapped, M, y); y += wrapped.length * 5 + 1
    }
    pdf.setFontSize(8)
    const fuentes = pdf.splitTextToSize(`Fuentes: ${guide.sources.join('; ')}.`, pageW - M * 2)
    ensure(fuentes.length * 4 + 2)
    pdf.text(fuentes, M, y + 1)

    // Pie en todas las páginas
    const pageCount = pdf.getNumberOfPages()
    pdf.setFontSize(8); pdf.setTextColor(120, 126, 118)
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p)
      pdf.text('Prediagnóstico orientativo; no reemplaza la evaluación de un profesional de salud.', M, pageH - 14)
    }

    pdf.save(`sitright-sesion-${data.sessionId.slice(0, 8)}.pdf`)
  } catch {
    window.print()
  }
}
