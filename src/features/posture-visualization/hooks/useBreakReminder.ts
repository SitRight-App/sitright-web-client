import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/iam/context/AuthContext'
import type { LatestReading } from '../types/posture'
import type { VestStatus } from './useVestStatus'

const READINGS_PER_MINUTE = 12 // 12 lecturas × 5 s = 60 s
// HU-12 AC4 — si las preferencias del usuario no tienen un intervalo, se usa
// el valor por defecto de 60 minutos.
const DEFAULT_BREAK_REMINDER_MINUTES = 60

export function useBreakReminder(vestStatus: VestStatus, reading: LatestReading | null | undefined) {
  const { user } = useAuth()
  const intervalMinutes = user?.preferences.break_reminder_minutes ?? DEFAULT_BREAK_REMINDER_MINUTES
  const readingsForBreak = intervalMinutes * READINGS_PER_MINUTE

  const [showReminder, setShowReminder] = useState(false)
  const prevIdRef = useRef<string | undefined>(undefined)
  const countRef = useRef(0)

  // HU-12 AC3 — si las notificaciones están desactivadas, no se muestra el
  // recordatorio pero el contador sigue marchando (el sistema "registra
  // internamente que se cumplió el umbral").
  const notificationsEnabled = user?.preferences.email_notifications ?? true

  useEffect(() => {
    // HU-12 AC2 — el chaleco se desconectó: el sistema asume pausa y
    // reinicia el contador en cuanto la conexión se restablezca.
    if (vestStatus !== 'connected' && vestStatus !== 'battery_low') {
      countRef.current = 0
      return
    }
    if (!reading || reading.id === prevIdRef.current) return
    prevIdRef.current = reading.id

    countRef.current += 1
    if (countRef.current >= readingsForBreak) {
      if (notificationsEnabled) setShowReminder(true)
      countRef.current = 0
    }
  }, [reading, vestStatus, readingsForBreak, notificationsEnabled])

  return { showReminder, dismiss: () => setShowReminder(false) }
}
