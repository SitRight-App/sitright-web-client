import type { PostureClass } from '../types/posture'
import { POSTURE_COLORS } from '../types/posture'

interface Props {
  value: number
  postureClass: PostureClass
}

export function ConfidenceBar({ value, postureClass }: Props) {
  const percent = Math.round(value * 100)
  const barColor = POSTURE_COLORS[postureClass]

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>Confianza del modelo</span>
        <span className="font-semibold">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
