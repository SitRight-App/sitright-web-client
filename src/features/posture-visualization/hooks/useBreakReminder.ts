import { useEffect, useRef, useState } from 'react'
import type { LatestReading } from '../types/posture'
import type { VestStatus } from './useVestStatus'

const READINGS_FOR_BREAK = 720  // 720 × 5s = 60 minutos

export function useBreakReminder(vestStatus: VestStatus, reading: LatestReading | null | undefined) {
  const [showReminder, setShowReminder] = useState(false)
  const prevIdRef = useRef<string | undefined>(undefined)
  const countRef = useRef(0)

  useEffect(() => {
    // Resetea el contador cuando el chaleco se desconecta (sin importar si el ID de lectura cambió)
    if (vestStatus !== 'connected' && vestStatus !== 'battery_low') {
      countRef.current = 0
      return
    }
    if (!reading || reading.id === prevIdRef.current) return
    prevIdRef.current = reading.id

    countRef.current += 1
    if (countRef.current >= READINGS_FOR_BREAK) {
      setShowReminder(true)
      countRef.current = 0
    }
  }, [reading, vestStatus])

  return { showReminder, dismiss: () => setShowReminder(false) }
}
