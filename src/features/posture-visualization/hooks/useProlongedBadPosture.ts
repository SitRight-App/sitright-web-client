import { useEffect, useRef, useState } from 'react'
import type { LatestReading } from '../types/posture'

const BAD_CLASSES = new Set(['forward_slouch', 'excessive_recline'])
const READINGS_THRESHOLD = 60  // 60 × 5s = 5 minutos

export function useProlongedBadPosture(reading: LatestReading | null | undefined) {
  const [isAlertActive, setAlertActive] = useState(false)
  const prevIdRef = useRef<string | undefined>(undefined)
  const badCountRef = useRef(0)

  useEffect(() => {
    if (!reading || reading.id === prevIdRef.current) return
    prevIdRef.current = reading.id

    if (BAD_CLASSES.has(reading.posture_class)) {
      badCountRef.current += 1
      if (badCountRef.current >= READINGS_THRESHOLD) setAlertActive(true)
    } else {
      badCountRef.current = 0
      setAlertActive(false)
    }
  }, [reading])

  return { isAlertActive, dismiss: () => setAlertActive(false) }
}
