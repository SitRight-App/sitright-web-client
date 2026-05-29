import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageTransition } from './presets'

interface Props {
  children: ReactNode
}

/**
 * Wrap de página: aplica el preset de transición al primer render. Útil para
 * que el cambio entre rutas se sienta como una entrada deliberada y no como un
 * salto duro.
 */
export function PageMotion({ children }: Props) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageTransition}>
      {children}
    </motion.div>
  )
}
