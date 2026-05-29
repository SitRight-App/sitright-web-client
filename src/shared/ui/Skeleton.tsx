import type { CSSProperties, HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Ancho del placeholder (cualquier unidad CSS válida). */
  width?: number | string
  /** Alto del placeholder. */
  height?: number | string
  /** Si true, renderiza forma de píldora. */
  pill?: boolean
  /** Si true, renderiza círculo (override de width/height al mismo valor). */
  circle?: boolean
}

/**
 * Primitivo de skeleton editorial. Pulsado sutil sobre fondo sand para
 * sustituir los textos 'Cargando…' por un placeholder visual coherente con la
 * paleta y la tipografía del sistema.
 */
export function Skeleton({
  width,
  height = 12,
  pill = false,
  circle = false,
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  const finalStyle: CSSProperties = {
    width: circle ? height : width,
    height,
    ...style,
  }
  const radius = circle ? 'rounded-full' : pill ? 'rounded-full' : 'rounded-[3px]'
  return (
    <div
      role="status"
      aria-label="Cargando"
      style={finalStyle}
      className={`animate-pulse bg-sand/40 ${radius} ${className}`}
      {...rest}
    />
  )
}

/** Línea de texto serif para skeleton de h2/h3 (alto serif estándar). */
export function SkeletonTextLine({
  width = '70%',
  className = '',
}: {
  width?: number | string
  className?: string
}) {
  return <Skeleton width={width} height={14} className={className} />
}

/** Bloque editorial con borde sand, mismo padding que las cards reales. */
export function SkeletonCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded border border-sand bg-cream-bone p-6 ${className}`}>
      {children}
    </div>
  )
}
