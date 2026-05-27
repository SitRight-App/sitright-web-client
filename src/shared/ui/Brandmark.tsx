interface Props {
  size?: number
  className?: string
}

export function Brandmark({ size = 22, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      className={className}
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
      <line x1="12" y1="7" x2="12" y2="10" strokeDasharray="1,1.5" />
      <line x1="12" y1="14" x2="12" y2="17" strokeDasharray="1,1.5" />
    </svg>
  )
}
