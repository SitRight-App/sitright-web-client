# PDF narrativo con cuerpo humano en vector — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar el PDF del reporte en un flujo narrativo (veredicto → cuerpo humano correcto vs tuyo → qué pasó por zona → qué hacer), con la figura humana sentada dibujada en vector y el veredicto compartido con la pantalla.

**Architecture:** Se extrae `verdictSentence` a `sessionCopy.ts` (lo usan pantalla y PDF) y se reescribe `buildSessionPdf` reemplazando `drawSpine` por `drawSeatedBody` (persona sentada de perfil en vector con el arco de ángulo sobre la zona), quitando la columna de ángulos y las tarjetas densas.

**Tech Stack:** TypeScript (strict) + Vite, vitest, jsPDF (import dinámico).

## Global Constraints

- TS strict; `noUnusedLocals`/`noUnusedParameters` = true → sin imports/variables sin uso. No `any`.
- Glosario (`sessionCopy.METRIC_LABELS`/`streakLabel`); PROHIBIDO mostrar "tramo máximo", "pico", "episodios", "% desviado", "ángulo promedio".
- `streakLabel(min)` ya existe: "menos de 1 min" / "hasta 1 min seguido" / "hasta N min seguidos".
- jsPDF usa fuentes WinAnsi: NO usar glifos fuera de WinAnsi (✓, ⚠, ≈, →, —usar guion ASCII "-" o "·"). El estado por zona va con un PUNTO DE COLOR dibujado, no un checkmark. `°` y `·` sí son WinAnsi.
- `verdictSentence` debe producir EXACTAMENTE el texto que hoy genera `PostureComparison` (para que su test siga verde).
- Recomendaciones desde `recommendationsFor(dominant).tips`; sin "Fuentes:".
- Ángulos ilustrativos: offset = `min(avg_angle_deg, 30) * 0.6` (tope ~18 mm).
- Paleta RGB: moss `45,74,54`; terracotta-soft `232,166,133`; terracotta `200,98,60`; amber `196,128,20`; ink `44,49,43`; ink-soft `74,82,73`; sand `214,211,203`; tinte ok `235,240,236`; tinte desviado `250,240,235`; blanco `255,255,255`.
- Commits: `git commit` NORMAL (identidad del repo Christopher `79271081+ChrisByBits@users.noreply.github.com`). Sin override, sin atribución a Claude.
- Verificar antes de cada commit: `npm run test -- --run` y `npm run build`.

---

### Task 1: `verdictSentence` compartido + refactor de `PostureComparison`

**Files:**
- Modify: `src/features/session-history/lib/sessionCopy.ts`
- Modify: `src/features/session-history/lib/sessionCopy.test.ts`
- Modify: `src/features/session-history/components/PostureComparison.tsx`

**Interfaces:**
- Produces: `verdictSentence(opts: { adequatePct: number; zones: Record<SpineZone, ZoneDeviation>; calibrated: boolean }): string`

- [ ] **Step 1: Write the failing test**

En `src/features/session-history/lib/sessionCopy.test.ts`, añadir `verdictSentence` al import desde `'./sessionCopy'`, añadir un import de tipo y este bloque:
```ts
import type { ZoneDeviation } from '../types/session'

const zd = (deviated_pct: number, avg = 18): ZoneDeviation => ({
  deviated_pct, minutes_in_deviation: 5, avg_angle_deg: avg,
  peak_angle_deg: avg + 8, longest_streak_min: 2, episodes: 3,
})

describe('verdictSentence', () => {
  it('sin calibración da la frase corta', () => {
    const s = verdictSentence({ adequatePct: 80, zones: { cervical: zd(0), dorsal: zd(0), lumbar: zd(0) }, calibrated: false })
    expect(s).toBe('Mantuviste una postura correcta el 80% del tiempo.')
  })
  it('calibrado con desviación menciona la peor zona', () => {
    const s = verdictSentence({ adequatePct: 70, zones: { cervical: zd(41, 22), dorsal: zd(12), lumbar: zd(2) }, calibrated: true })
    expect(s).toMatch(/^Mantuviste una postura correcta el 70% del tiempo\./)
    expect(s).toMatch(/tu mayor desafío fue cuello, con desviación el 41% del tiempo\.$/i)
  })
  it('calibrado todo en rango da la frase positiva', () => {
    const s = verdictSentence({ adequatePct: 96, zones: { cervical: zd(1), dorsal: zd(0), lumbar: zd(0) }, calibrated: true })
    expect(s).toBe('Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/sessionCopy.test.ts`
Expected: FAIL (`verdictSentence` no exportado).

- [ ] **Step 3: Implementar `verdictSentence`**

En `src/features/session-history/lib/sessionCopy.ts`, añadir al inicio los imports y al final la función:
```ts
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'
import type { SpineZone, ZoneDeviation } from '../types/session'
```
```ts
export function verdictSentence(opts: {
  adequatePct: number
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
}): string {
  const { adequatePct, zones, calibrated } = opts
  if (!calibrated) return `Mantuviste una postura correcta el ${adequatePct}% del tiempo.`
  const ordered = ZONE_ORDER.map((z) => ({ z, d: zones[z] })).sort(
    (a, b) => b.d.deviated_pct - a.d.deviated_pct,
  )
  const anyDeviated = ordered.some(({ d }) => toneFor(d.deviated_pct) !== 'ok')
  if (!anyDeviated) {
    return 'Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.'
  }
  const worst = ordered[0]
  return `Mantuviste una postura correcta el ${adequatePct}% del tiempo. Tu mayor desafío fue ${ZONE_LABELS[worst.z].toLowerCase()}, con desviación el ${Math.round(worst.d.deviated_pct)}% del tiempo.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/sessionCopy.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Refactor `PostureComparison` para usar el helper**

En `src/features/session-history/components/PostureComparison.tsx`:
- Añadir `verdictSentence` al import desde `'../lib/sessionCopy'` (junto a `POSTURE_LEGEND`).
- Reemplazar el bloque que calcula `const verdict = !calibrated ? ... : anyDeviated ? ... : ...` por:
```tsx
  const verdict = verdictSentence({ adequatePct, zones, calibrated })
```
(Mantener `ordered`, `worst`, `anyDeviated`, `sectionTone` y los marcadores tal cual — siguen usándose.)

- [ ] **Step 6: Run the component test + build**

Run: `npm run test -- --run src/features/session-history/components/PostureComparison.test.tsx && npm run build`
Expected: PASS (la aserción `/Mantuviste una postura correcta el 70%/` sigue verde porque el texto es idéntico); build limpio.

- [ ] **Step 7: Commit**

```bash
git add src/features/session-history/lib/sessionCopy.ts src/features/session-history/lib/sessionCopy.test.ts src/features/session-history/components/PostureComparison.tsx
git commit -m "refactor(session-report): veredicto compartido (verdictSentence) entre pantalla y PDF"
```

---

### Task 2: Reescribir `buildSessionPdf` (narrativa + cuerpo en vector)

**Files:**
- Modify: `src/features/session-history/lib/sessionPdf.ts`

**Interfaces:**
- Consumes: `verdictSentence`, `streakLabel`, `METRIC_LABELS`, `dominantPlain` (sessionCopy); `buildDistribution`, `scoreLevel`, `toneColor` (sessionPdf); `recommendationsFor` (postureGuidance); `ZONE_LABELS`, `ZONE_ORDER`, `toneFor` (zoneTone). `SessionPdfData` NO cambia.

- [ ] **Step 1: Ajustar imports de `sessionPdf.ts`**

- Quitar de la import de `sessionCopy` lo que ya no se use y añadir lo nuevo. La import final desde `'./sessionCopy'` debe ser EXACTAMENTE:
```ts
import { METRIC_LABELS, streakLabel, verdictSentence } from './sessionCopy'
```
(Se eliminan `POSTURE_LEGEND` y `dominantPlain` del PDF: el veredicto reemplaza la "desviación más frecuente" y las líneas por zona ya no usan la leyenda. Confirmar que ninguno quede referenciado.)

- [ ] **Step 2: Reemplazar `drawSpine` por `drawSeatedBody` y reescribir `buildSessionPdf`**

Borrar la función interna `drawSpine` y TODO el cuerpo actual de `buildSessionPdf` (desde `const dist = buildDistribution...` y la sección de figuras/tarjetas) y dejar `buildSessionPdf` así:
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
    const rad = (deg: number) => (deg * Math.PI) / 180

    function drawSeatedBody(fx: number, fy: number, fw: number, fh: number, mode: 'ideal' | 'session') {
      const xHip = fx + fw * 0.40
      const yHip = fy + fh * 0.60
      const chestW = fw * 0.24
      const yCerv = yHip - fh * 0.42
      const yDorsal = yHip - fh * 0.27
      const yLumbar = yHip - fh * 0.12
      const off = (z: SpineZone) => (mode === 'session' ? Math.min(data.zones[z].avg_angle_deg, 30) * 0.6 : 0)
      const xLumbar = xHip + off('lumbar')
      const xDorsal = xHip + off('dorsal')
      const xCerv = xHip + off('cervical')

      // Silla (sand tenue)
      draw(C.sand); pdf.setLineWidth(0.5)
      pdf.line(fx + 1, yHip + 2, fx + 1 + fw * 0.7, yHip + 2)       // asiento
      pdf.line(fx + 1, yHip + 2, fx + 1, yCerv - 2)                  // respaldo
      pdf.line(fx + 2, yHip + 2, fx + 2, fy + fh)                    // pata trasera
      pdf.line(fx + fw * 0.68, yHip + 2, fx + fw * 0.68, fy + fh)    // pata delantera

      // Pierna
      fill(C.tintOk); draw(C.sand); pdf.setLineWidth(0.4)
      pdf.roundedRect(xHip - 1, yHip - 2, fw * 0.5, 4, 2, 2, 'FD')   // muslo
      pdf.roundedRect(xHip + fw * 0.46, yHip - 2, 4, fh * 0.3, 2, 2, 'FD') // pierna baja

      // Torso (polígono cerrado: borde de espalda + frente)
      const back = [
        [xHip, yHip], [xLumbar, yLumbar], [xDorsal, yDorsal], [xCerv, yCerv],
      ]
      const front = [
        [xCerv + chestW, yCerv + 1], [xHip + chestW, yHip],
      ]
      const poly = [...back, ...front]
      const rel: number[][] = []
      for (let i = 1; i < poly.length; i++) rel.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]])
      fill(C.tintOk); draw(C.sand); pdf.setLineWidth(0.4)
      pdf.lines(rel, poly[0][0], poly[0][1], [1, 1], 'F', true)

      // Brazo
      draw(C.sand); pdf.setLineWidth(1.2)
      pdf.line(xCerv + chestW, yCerv + 3, xHip + fw * 0.42, yHip - 3)

      // Borde de espalda (más marcado) + cuello
      draw(C.soft); pdf.setLineWidth(1.3)
      pdf.line(xHip, yHip, xLumbar, yLumbar)
      pdf.line(xLumbar, yLumbar, xDorsal, yDorsal)
      pdf.line(xDorsal, yDorsal, xCerv, yCerv)
      const headR = fw * 0.13
      const headY = yCerv - headR - 2
      pdf.line(xCerv, yCerv, xCerv, headY + headR)
      draw(C.sand); fill(C.white); pdf.setLineWidth(1)
      pdf.circle(xCerv, headY, headR, 'FD')

      // Nodos por zona + arco de ángulo (session)
      const drawNode = (x: number, yy: number, z: SpineZone) => {
        const tone = mode === 'ideal' ? 'ok' : toneFor(data.zones[z].deviated_pct)
        fill(toneColor(tone)); pdf.circle(x, yy, 2.2, 'F')
        if (mode === 'session' && tone !== 'ok') {
          const deg = Math.round(data.zones[z].avg_angle_deg)
          const L = 9
          draw(toneColor(tone)); pdf.setLineWidth(0.6)
          pdf.line(x, yy, x, yy - L)                                          // neutro
          pdf.setLineWidth(1)
          pdf.line(x, yy, x + L * Math.sin(rad(deg)), yy - L * Math.cos(rad(deg))) // real
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
    chip(METRIC_LABELS.totalMinutes, `${data.totalMinutes} min`, M + 64)
    chip(METRIC_LABELS.pauses, String(data.pauses), M + 110)
    y += 16

    const dist = buildDistribution(data.countsByClass)
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
      y += 3
    }

    // 5. Qué hacer (recomendaciones, sin fuentes)
    const guide = recommendationsFor(data.dominantDeviation)
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
```

- [ ] **Step 3: Limpiar lo que quede sin uso**

Tras los borrados, verificar que NO queden referencias a `drawSpine`, `POSTURE_LEGEND` ni `dominantPlain` en `sessionPdf.ts`, ni cualquier otro import sin uso. (El veredicto reemplaza la "desviación más frecuente"; los chips son tiempo de uso y pausas.) Confirmar con `npm run build` (TS strict, `noUnusedLocals`).

- [ ] **Step 4: Build + suite**

Run: `npm run build && npm run test -- --run`
Expected: `tsc -b` sin errores; suite verde. (`buildSessionPdf`/`drawSeatedBody` no tienen test unitario; sus partes puras ya están cubiertas.)

- [ ] **Step 5: Verificación manual (humo) — no automatizable**

```bash
npm run dev
```
Abrir una sesión calibrada y "Descargar PDF". Confirmar: arriba el **veredicto** en una frase; score + barra de distribución + chips; **dos personas sentadas** (recta vs inclinada) con el **arco de ángulo y los grados sobre la zona**; una **línea clara por zona** ("Cuello - se inclinó 22° el 41% del tiempo, hasta 3 min seguidos"); "Qué hacer" sin "Fuentes:"; sin glifos rotos. (Las proporciones del cuerpo pueden requerir un ajuste fino de coordenadas — anotar cualquier desajuste para una pasada posterior; no bloquea si build+suite están verdes.)

- [ ] **Step 6: Commit**

```bash
npm run build && npm run test -- --run
git add src/features/session-history/lib/sessionPdf.ts
git commit -m "feat(session-report): PDF narrativo con cuerpo humano en vector y veredicto"
```

---

## Notas de verificación final (tras ambas tareas)

- `npm run build` y `npm run test -- --run` en verde.
- El PDF muestra el veredicto, dos cuerpos sentados (correcto vs tuyo) con el ángulo sobre la zona, una línea por zona, y recomendaciones sin "Fuentes".
- No quedan `drawSpine`, tarjetas de zona, columna de ángulos ni términos prohibidos del glosario.
- `verdictSentence` lo comparten pantalla (`PostureComparison`) y PDF.
