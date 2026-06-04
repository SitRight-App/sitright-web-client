interface Props {
  size?: number
  className?: string
}

/**
 * Marca SitRight: una columna-S — la curva natural de una columna sana es una S,
 * que además es la S de SitRight. Los 3 nodos representan las 3 zonas / sensores
 * (cervical · dorsal · lumbar). Glifo monocromo (currentColor) pensado para ir
 * dentro de un contenedor de marca; el icono de app con escudo vive en
 * `public/favicon.svg`.
 */
export function Brandmark({ size = 22, className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      <path
        d="M29 13 C 20.5 16, 20.5 22, 24 24.5 C 27.5 27, 27.5 33, 19 36"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="29" cy="13" r="2.7" fill="currentColor" />
      <circle cx="24" cy="24.5" r="2.7" fill="currentColor" />
      <circle cx="19" cy="36" r="2.7" fill="currentColor" />
    </svg>
  )
}
