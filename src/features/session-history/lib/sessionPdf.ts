// src/features/session-history/lib/sessionPdf.ts
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'

export function buildFindings(zones: Record<SpineZone, ZoneDeviation>): {
  good: string[]
  improve: string[]
} {
  const good: string[] = []
  const improve: string[] = []
  for (const z of ZONE_ORDER) {
    const d = zones[z]
    if (toneFor(d.deviated_pct) === 'ok') {
      good.push(`${ZONE_LABELS[z]}: se mantuvo en rango durante la sesión.`)
    } else {
      improve.push(
        `${ZONE_LABELS[z]}: desviada el ${Math.round(d.deviated_pct)}% del tiempo (≈${Math.round(d.avg_angle_deg)}°).`,
      )
    }
  }
  return { good, improve }
}

export function buildZoneTableRows(zones: Record<SpineZone, ZoneDeviation>): string[][] {
  return ZONE_ORDER.map((z) => {
    const d = zones[z]
    return [
      ZONE_LABELS[z],
      `${Math.round(d.deviated_pct)}%`,
      `${Math.round(d.avg_angle_deg)}°`,
      `${Math.round(d.peak_angle_deg)}°`,
      String(d.episodes),
    ]
  })
}

const RECS: Record<string, string[]> = {
  forward_slouch: [
    'Coloca la pantalla a la altura de los ojos para no inclinar el cuello.',
    'Apoya la zona lumbar en el respaldo y evita encorvarte hacia el escritorio.',
    'Haz pausas activas con estiramientos de cuello cada 45 minutos.',
  ],
  excessive_recline: [
    'Ajusta el respaldo para que el tronco quede casi vertical.',
    'Mantén los pies apoyados en el suelo y la cadera al fondo del asiento.',
    'Evita deslizarte hacia adelante en la silla.',
  ],
}

export function recommendationsFor(dominant: string | null): string[] {
  return (
    RECS[dominant ?? ''] ?? [
      'Mantén la pantalla a la altura de los ojos y la espalda apoyada en el respaldo.',
      'Haz pausas activas cada 45–60 minutos.',
    ]
  )
}

export interface SessionPdfData {
  sessionId: string
  dateLabel: string
  durationLabel: string
  adequatePct: number
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
  dominantDeviation: string | null
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
    const M = 16
    let y = M

    const inkColor = () => pdf.setTextColor(44, 49, 43)
    const softColor = () => pdf.setTextColor(74, 82, 73)

    // Encabezado
    pdf.setTextColor(45, 74, 54)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('SitRight', M, y + 2)
    softColor()
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.text('Reporte de sesión postural', M, y + 9)
    inkColor()
    pdf.setFontSize(12)
    pdf.text(`${data.dateLabel}  ·  ${data.durationLabel}`, M, y + 16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Postura correcta: ${data.adequatePct}% del tiempo`, M, y + 23)
    pdf.setFont('helvetica', 'normal')
    y += 32
    pdf.setDrawColor(214, 211, 203)
    pdf.line(M, y, pageW - M, y)
    y += 8

    // Comparación (figuras)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    inkColor()
    pdf.text('Cómo te sentaste hoy', M, y)
    y += 4
    const figW = 50
    const figH = 64
    const colGap = 24
    const x1 = M
    const x2 = M + figW + colGap
    if (idealPng) pdf.addImage(idealPng, 'PNG', x1, y, figW, figH)
    if (sessionPng) pdf.addImage(sessionPng, 'PNG', x2, y, figW, figH)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('Postura correcta', x1, y + figH + 6)
    pdf.text('Tu sesión', x2, y + figH + 6)
    y += figH + 14

    // Hallazgos
    const { good, improve } = buildFindings(data.zones)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Hallazgos', M, y)
    y += 6
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    softColor()
    if (data.calibrated) {
      for (const line of [...improve.map((s) => `• A corregir — ${s}`), ...good.map((s) => `• Bien — ${s}`)]) {
        const wrapped = pdf.splitTextToSize(line, pageW - M * 2)
        pdf.text(wrapped, M, y)
        y += wrapped.length * 5 + 1
      }
    } else {
      pdf.text('El chaleco no estaba calibrado: no hay detalle por zona en esta sesión.', M, y)
      y += 6
    }
    y += 4

    // Tabla por zona (solo con calibración)
    if (data.calibrated) {
      const headers = ['Zona', '% desviado', 'Áng. prom.', 'Pico', 'Episodios']
      const rows = buildZoneTableRows(data.zones)
      const colX = [M, M + 46, M + 80, M + 110, M + 135]
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      inkColor()
      headers.forEach((h, i) => pdf.text(h, colX[i], y))
      y += 2
      pdf.setDrawColor(214, 211, 203)
      pdf.line(M, y, pageW - M, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      softColor()
      for (const row of rows) {
        row.forEach((cell, i) => pdf.text(cell, colX[i], y))
        y += 6
      }
      y += 4
    }

    // Recomendaciones
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    inkColor()
    pdf.text('Recomendaciones', M, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    softColor()
    for (const rec of recommendationsFor(data.dominantDeviation)) {
      const wrapped = pdf.splitTextToSize(`• ${rec}`, pageW - M * 2)
      pdf.text(wrapped, M, y)
      y += wrapped.length * 5 + 1
    }

    // Pie
    const footY = pdf.internal.pageSize.getHeight() - 14
    pdf.setFontSize(8)
    pdf.setTextColor(120, 126, 118)
    pdf.text(
      'Prediagnóstico orientativo; no reemplaza la evaluación de un profesional de salud.',
      M,
      footY,
    )

    pdf.save(`sitright-sesion-${data.sessionId.slice(0, 8)}.pdf`)
  } catch {
    // Último recurso: diálogo de impresión del navegador.
    window.print()
  }
}
