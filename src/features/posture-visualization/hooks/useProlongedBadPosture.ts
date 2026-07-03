import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/iam/context/AuthContext'
import type { LatestReading } from '../types/posture'

const BAD_CLASSES = new Set(['forward_slouch', 'excessive_recline'])
const READINGS_PER_MINUTE = 12 // 12 lecturas × 5 s = 60 s
// Si el usuario no configuró un umbral, se usa el valor por defecto de
// 5 minutos (60 lecturas).
const DEFAULT_ALERT_THRESHOLD_MINUTES = 5

export function useProlongedBadPosture(reading: LatestReading | null | undefined) {
  const { user } = useAuth()
  const thresholdMinutes = user?.preferences?.alert_threshold_minutes ?? DEFAULT_ALERT_THRESHOLD_MINUTES
  const readingsThreshold = Math.round(thresholdMinutes * READINGS_PER_MINUTE)

  const [isAlertActive, setAlertActive] = useState(false)
  const prevIdRef = useRef<string | undefined>(undefined)
  const badCountRef = useRef(0)

  useEffect(() => {
    if (!reading || reading.id === prevIdRef.current) return
    prevIdRef.current = reading.id

    if (BAD_CLASSES.has(reading.posture_class)) {
      badCountRef.current += 1
      if (badCountRef.current >= readingsThreshold) setAlertActive(true)
    } else {
      badCountRef.current = 0
      setAlertActive(false)
    }
  }, [reading, readingsThreshold])

  return { isAlertActive, dismiss: () => setAlertActive(false) }
}
