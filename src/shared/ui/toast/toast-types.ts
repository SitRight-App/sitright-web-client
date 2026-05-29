export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  description?: string
  /** Milisegundos antes de auto-cerrarse. 0 = persistente. */
  duration?: number
}

export type ToastInput = Omit<Toast, 'id'>
