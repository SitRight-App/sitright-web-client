# PDF de reporte visual (vector) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el PDF del reporte de sesión para que sea 100% vector con jsPDF (score a color, barra de distribución, perfiles de columna con los grados nítidos, tarjetas por zona), sin rasterizar SVG y sin citar fuentes.

**Architecture:** Se agregan dos helpers puros (`scoreLevel`, `toneColor`) y se reescribe `buildSessionPdf` dibujando todo con primitivas de jsPDF (líneas/círculos/rectángulos/texto a color). Se eliminan la rasterización SVG (`svgToPng`/`figurePng`), la tabla de texto (`ZONE_TABLE_HEADERS`/`buildZoneTableRows`) y la línea "Fuentes:".

**Tech Stack:** TypeScript (strict) + Vite, vitest, jsPDF (import dinámico).

## Global Constraints

- TS strict; `noUnusedLocals`/`noUnusedParameters` = true → sin imports/variables sin uso.
- No `any` sin justificación.
- Lenguaje del glosario (`sessionCopy.METRIC_LABELS`) de cara al usuario; PROHIBIDO "tramo máximo", "pico", "episodios", "% desviado", "ángulo promedio".
- `POSTURE_LEGEND` se conserva (leyenda del detalle por zona).
- Recomendaciones desde `recommendationsFor(dominant).tips`; los `sources` NO se muestran (sin "Fuentes:").
- Ángulos ilustrativos (magnitud, no a escala): offset horizontal mm = `min(avg_angle_deg, 30) * 0.6`.
- Solo cambia el PDF; la sección en pantalla NO se toca. `SessionPdfData` y el cableado de la página NO cambian.
- Paleta RGB: moss `45,74,54`; terracotta-soft `232,166,133`; terracotta `200,98,60`; amber `196,128,20`; ink `44,49,43`; ink-soft `74,82,73`; sand `214,211,203`; tinte ok `235,240,236`; tinte desviado `250,240,235`.
- `scoreLevel`: `>=70 good`, `>=50 mid`, else `low`. Color del score: good=moss, mid=amber, low=terracotta.
- Commits: `git commit` NORMAL (identidad del repo ya es Christopher `79271081+ChrisByBits@users.noreply.github.com`). Sin override, sin atribución a Claude.
- Verificar antes de cada commit: `npm run test -- --run` y `npm run build`.

---

### Task 1: Helpers puros `scoreLevel` y `toneColor`

**Files:**
- Modify: `src/features/session-history/lib/sessionPdf.ts`
- Modify: `src/features/session-history/lib/sessionPdf.test.ts`

**Interfaces:**
- Produces:
  - `scoreLevel(pct: number): 'good' | 'mid' | 'low'`
  - `toneColor(tone: 'ok' | 'leve' | 'marcada'): [number, number, number]`

- [ ] **Step 1: Añadir los tests (sin tocar los existentes)**

Agregar este bloque al final de `src/features/session-history/lib/sessionPdf.test.ts` (y añadir `scoreLevel, toneColor` al import desde `'./sessionPdf'`):
```ts
describe('scoreLevel / toneColor', () => {
  it('scoreLevel mapea las bandas', () => {
    expect(scoreLevel(70)).toBe('good')
    expect(scoreLevel(69)).toBe('mid')
    expect(scoreLevel(50)).toBe('mid')
    expect(scoreLevel(49)).toBe('low')
    expect(scoreLevel(0)).toBe('low')
  })
  it('toneColor mapea a RGB', () => {
    expect(toneColor('ok')).toEqual([45, 74, 54])
    expect(toneColor('leve')).toEqual([232, 166, 133])
    expect(toneColor('marcada')).toEqual([200, 98, 60])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: FAIL (`scoreLevel`/`toneColor` no exportados).

- [ ] **Step 3: Implementar los helpers**

Agregar en `src/features/session-history/lib/sessionPdf.ts` (después de los imports, antes de `buildZoneTableRows`):
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: PASS (todos, incluidos los nuevos).

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/features/session-history/lib/sessionPdf.ts src/features/session-history/lib/sessionPdf.test.ts
git commit -m "feat(session-report): helpers de color del PDF (scoreLevel, toneColor)"
```

---

### Task 2: Reescribir `buildSessionPdf` en vector (un solo commit)

**Files:**
- Modify: `src/features/session-history/lib/sessionPdf.ts`
- Modify: `src/features/session-history/lib/sessionPdf.test.ts`

**Interfaces:**
- Consumes: `scoreLevel`, `toneColor` (Task 1); `buildDistribution`, `dominantPlain`, `METRIC_LABELS`, `POSTURE_LEGEND`, `recommendationsFor`, `ZONE_LABELS`, `ZONE_ORDER`, `toneFor` (existentes/agregado).
- `SessionPdfData` NO cambia.

- [ ] **Step 1: Actualizar el test (quitar tabla, conservar distribución/helpers)**

En `src/features/session-history/lib/sessionPdf.test.ts`:
- Quitar el import de `ZONE_TABLE_HEADERS` y `buildZoneTableRows` y los dos `it(...)` que los prueban.
- Conservar el test de `buildDistribution` y los de `scoreLevel`/`toneColor`.
El archivo debe quedar importando solo `{ buildDistribution, scoreLevel, toneColor }` de `'./sessionPdf'` (más los tipos para el fixture `z`).

- [ ] **Step 2: Run test to verify it fails (compilación)**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: el test compila si ya quitaste los imports muertos; si aún referencian símbolos por borrar, FALLA. (Este paso encuadra el resto: NO commitear hasta el Step 5.)

- [ ] **Step 3: Reescribir `sessionPdf.ts`**

3a. Ajustar el import de `zoneTone` para incluir `toneFor`:
```ts
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'
```

3b. ELIMINAR de `sessionPdf.ts`: `ZONE_TABLE_HEADERS`, `buildZoneTableRows`, `svgToPng`, `figurePng`. (Conservar `buildDistribution`, `DIST_LABELS`, `scoreLevel`, `toneColor`, `SessionPdfData`.)

3c. Reemplazar TODO el cuerpo de `buildSessionPdf` por esta versión vector:
```ts
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
        const cardH = 19
        ensure(cardH + 3)
        fill(ok ? C.tintOk : C.tintDev); draw(C.sand); pdf.setLineWidth(0.3)
        pdf.roundedRect(M, y, pageW - 2 * M, cardH, 2, 2, 'FD')
        col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
        pdf.text(ZONE_LABELS[z], M + 4, y + 7)
        col(ok ? C.moss : C.terra); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
        pdf.text(ok ? 'En rango' : 'Atención', pageW - M - 4, y + 7, { align: 'right' })
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)
        const metrics = ok
          ? 'Se mantuvo dentro de lo recomendado.'
          : `${METRIC_LABELS.deviatedPct}: ${Math.round(d.deviated_pct)}%   ·   ${METRIC_LABELS.avgAngle}: ${Math.round(d.avg_angle_deg)}°   ·   ${METRIC_LABELS.longestStreak}: hasta ${Math.max(1, Math.round(d.longest_streak_min))} min`
        pdf.text(metrics, M + 4, y + 14)
        y += cardH + 3
      }
      ensure(8)
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
      pdf.text(pdf.splitTextToSize(POSTURE_LEGEND, pageW - 2 * M), M, y); y += 8
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
```

3d. Tras los borrados, revisar imports sin uso: si `POSTURE_LEGEND` se sigue usando (sí), mantener; `recommendationsFor` se usa (tips). No debe quedar `XMLSerializer`/`btoa`/`Image` (estaban dentro de `svgToPng`). Verificar con `npm run build`.

- [ ] **Step 4: Run build + suite**

Run: `npm run build && npm run test -- --run`
Expected: `tsc -b` sin errores (incl. `noUnusedLocals`); toda la suite verde. (`buildSessionPdf` no tiene test unitario por depender de jsPDF/DOM; sus partes puras —`buildDistribution`, `scoreLevel`, `toneColor`— ya están cubiertas.)

- [ ] **Step 5: Verificación manual (humo) — no automatizable**

```bash
npm run dev
```
Abrir una sesión calibrada y "Descargar PDF". Confirmar: score a color; barra de distribución a color; dos perfiles de columna (recto vs inclinado) con los grados grandes y legibles por zona; tarjetas por zona tintadas (verde/terracota); recomendaciones SIN línea "Fuentes:". (Si no puedes correr `dev`, basta con build + suite verdes; este paso lo valida el humano.)

- [ ] **Step 6: Commit**

```bash
npm run build && npm run test -- --run
git add src/features/session-history/lib/sessionPdf.ts src/features/session-history/lib/sessionPdf.test.ts
git commit -m "feat(session-report): PDF vectorial (perfiles de columna, score y distribucion a color, sin fuentes)"
```

---

## Notas de verificación final (tras ambas tareas)

- `npm run build` y `npm run test -- --run` en verde.
- El PDF ya no rasteriza SVG (no quedan `svgToPng`/`figurePng`/`data-pdf-figure` referenciados desde el PDF).
- No aparece la línea "Fuentes:" ni términos prohibidos del glosario.
- Los ángulos se ven (perfiles de columna en vector con los grados grandes).
