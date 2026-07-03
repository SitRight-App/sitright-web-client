import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/iam/context/AuthContext'
import type { LatestReading } from '../types/posture'

const READINGS_PER_MINUTE = 12 // 12 lecturas × 5 s = 60 s
// HU-12 AC4 — si las preferencias del usuario no tienen un intervalo, se usa
// el valor por defecto de 60 minutos.
const DEFAULT_BREAK_REMINDER_MINUTES = 60
// HU-12 AC2 — el sistema considera una pausa activa automática cuando pasan al
// menos 5 minutos sin lecturas nuevas. Antes esto se ataba al flag de
// desconexión del chaleco (~30 s), demasiado agresivo: un microcorte de WiFi
// bastaba para reiniciar el contador del recordatorio.
const AUTO_BREAK_GAP_MS = 5 * 60_000

export function useBreakReminder(reading: LatestReading | null | undefined) {
  const { user } = useAuth()
  const intervalMinutes = user?.preferences.break_reminder_minutes ?? DEFAULT_BREAK_REMINDER_MINUTES
  const readingsForBreak = intervalMinutes * READINGS_PER_MINUTE

  const [showReminder, setShowReminder] = useState(false)
  const prevIdRef = useRef<string | undefined>(undefined)
  const lastTimestampRef = useRef<number | undefined>(undefined)
  const countRef = useRef(0)

  // HU-12 AC3 — si las notificaciones están desactivadas, no se muestra el
  // recordatorio pero el contador sigue marchando (el sistema "registra
  // internamente que se cumplió el umbral").
  const notificationsEnabled = user?.preferences.email_notifications ?? true

  useEffect(() => {
    if (!reading || reading.id === prevIdRef.current) return
    prevIdRef.current = reading.id

    const timestamp = new Date(reading.timestamp).getTime()
    const previousTimestamp = lastTimestampRef.current
    lastTimestampRef.current = timestamp

    // HU-12 AC2 — si transcurrieron ≥ 5 minutos sin lecturas nuevas (según el
    // tiempo desde la última lectura), se asume una pausa activa automática y
    // se reinicia el contador del recordatorio.
    if (previousTimestamp !== undefined && timestamp - previousTimestamp >= AUTO_BREAK_GAP_MS) {
      countRef.current = 0
      return
    }

    countRef.current += 1
    if (countRef.current >= readingsForBreak) {
      if (notificationsEnabled) setShowReminder(true)
      countRef.current = 0
    }
  }, [reading, readingsForBreak, notificationsEnabled])

  return { showReminder, dismiss: () => setShowReminder(false) }
}
