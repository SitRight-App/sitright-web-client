import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Toast, ToastInput, ToastVariant } from './toast-types'

const DEFAULT_DURATION_MS = 4000

interface ToastContextValue {
  push: (toast: ToastInput) => string
  dismiss: (id: string) => void
  success: (message: string, description?: string) => string
  error: (message: string, description?: string) => string
  info: (message: string, description?: string) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx === null) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>')
  }
  return ctx
}

interface ProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const handle = timeoutsRef.current.get(id)
    if (handle) {
      clearTimeout(handle)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast: ToastInput) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const duration = toast.duration ?? DEFAULT_DURATION_MS
      setToasts((prev) => [...prev, { ...toast, id }])
      if (duration > 0) {
        const handle = setTimeout(() => dismiss(id), duration)
        timeoutsRef.current.set(id, handle)
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((handle) => clearTimeout(handle))
      timeouts.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (message, description) =>
        push({ variant: 'success', message, description }),
      error: (message, description) =>
        push({ variant: 'error', message, description }),
      info: (message, description) =>
        push({ variant: 'info', message, description }),
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

interface ViewportProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

function ToastViewport({ toasts, onDismiss }: ViewportProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-[380px] flex-col-reverse gap-3"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

interface CardProps {
  toast: Toast
  onDismiss: () => void
}

const VARIANT_STYLES: Record<ToastVariant, { border: string; accent: string; icon: string }> = {
  success: {
    border: 'border-l-moss',
    accent: 'text-moss',
    icon: '✓',
  },
  error: {
    border: 'border-l-terracotta',
    accent: 'text-terracotta-deep',
    icon: '!',
  },
  info: {
    border: 'border-l-ink',
    accent: 'text-ink',
    icon: '·',
  },
}

function ToastCard({ toast, onDismiss }: CardProps) {
  const { border, accent, icon } = VARIANT_STYLES[toast.variant]
  return (
    <div
      role="status"
      className={`pointer-events-auto animate-toast-in border border-sand border-l-[3px] bg-cream-bone p-4 shadow-sm ${border}`}
    >
      <div className="grid grid-cols-[24px_1fr_24px] items-start gap-3">
        <span className={`font-mono text-base leading-none ${accent}`}>{icon}</span>
        <div>
          <p className="font-serif text-[15px] leading-snug text-ink">{toast.message}</p>
          {toast.description && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {toast.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="grid h-5 w-5 place-items-center font-mono text-base text-ink-faint transition-colors hover:text-ink"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
    </div>
  )
}
