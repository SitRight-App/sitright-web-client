import type { Variants } from 'framer-motion'

/**
 * Presets de animación reutilizables, declarativos.
 *
 * La regla del diseño SitRight es que el movimiento sea sutil y rápido — nunca
 * más de 400 ms ni desplazamientos mayores a 12 px. Lo justo para que el ojo
 * registre que algo cambió, sin distraer.
 */

const EASE = [0.2, 0.7, 0.2, 1] as const

/** Fade + leve subida desde abajo. Para títulos y headers de página. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
}

/** Fade simple sin desplazamiento, para contenido secundario. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
}

/**
 * Contenedor con stagger para listas y grids. Cada hijo entra con un retraso
 * incremental de 50 ms.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

/** Item dentro de un contenedor con `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}

/** Transición de página: leve fade + slide muy corto. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}
