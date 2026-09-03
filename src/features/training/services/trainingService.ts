import { apiFetch, tokenStorage } from '@/shared/api/client'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

export interface Triple {
  ax: number
  ay: number
  az: number
}

export interface RawReading {
  id: string
  cervical: Triple
  dorsal: Triple
  lumbar: Triple
}

/** Última lectura cruda del chaleco (se sondea durante la captura). */
export async function getLatestRaw(): Promise<RawReading | null> {
  try {
    return await apiFetch<RawReading>('/readings/latest/raw')
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

export interface SampleIn {
  subject: string
  label: string
  cervical: number[]
  dorsal: number[]
  lumbar: number[]
}

export async function saveSamples(samples: SampleIn[]): Promise<{ saved: number }> {
  return apiFetch('/training/samples', {
    method: 'POST',
    body: JSON.stringify({ samples }),
  })
}

export interface CaptureStats {
  total: number
  by_label: Record<string, number>
  by_subject: Record<string, number>
}

export async function getCaptureStats(): Promise<CaptureStats> {
  return apiFetch('/training/samples/stats')
}

/** Descarga el dataset como CSV (endpoint devuelve texto, no JSON). */
export async function downloadDataset(): Promise<void> {
  const res = await fetch(`${BASE_URL}/training/samples/export`, {
    headers: { Authorization: `Bearer ${tokenStorage.getAccess() ?? ''}` },
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'training_samples.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function tripleToArray(t: Triple): number[] {
  return [t.ax, t.ay, t.az]
}
