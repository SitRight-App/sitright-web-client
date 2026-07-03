import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/iam/context/AuthContext'
import type { LatestReading } from '../types/posture'

const READINGS_PER_MINUTE = 12 // 12 lecturas × 5 s = 60 s
// Intervalo por defecto del recordatorio si el usuario no configuró uno.
const DEFAULT_BREAK_REMINDER_MINUTES = 60
// Un hueco de ≥ 5 minutos sin lecturas nuevas se interpreta como una pausa
// activa automática y reinicia el contador del recordatorio.
const AUTO_BREAK_GAP_MS = 5 * 60_000

export function useBreakReminder(reading: LatestReading | null | undefined) {
  const { user } = useAuth()
  const intervalMinutes = user?.preferences.break_reminder_minutes ?? DEFAULT_BREAK_REMINDER_MINUTES
  const readingsForBreak = intervalMinutes * READINGS_PER_MINUTE

  const [showReminder, setShowReminder] = useState(false)
  const prevIdRef = useRef<string | undefined>(undefined)
  const lastTimestampRef = useRef<number | undefined>(undefined)
  const countRef = useRef(0)

  // Si las notificaciones están desactivadas no se muestra el recordatorio,
  // pero el contador sigue avanzando.
  const notificationsEnabled = user?.preferences.email_notifications ?? true

  useEffect(() => {
    if (!reading || reading.id === prevIdRef.current) return
    prevIdRef.current = reading.id

    const timestamp = new Date(reading.timestamp).getTime()
    const previousTimestamp = lastTimestampRef.current
    lastTimestampRef.current = timestamp

    // Un hueco de ≥ 5 min sin lecturas nuevas se asume como pausa activa y
    // reinicia el contador.
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
