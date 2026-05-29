import { useEffect, useRef, useState } from 'react'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'
import {
  useMarkNotificationRead,
  useMyNotifications,
  useUnreadNotificationsCount,
} from '../hooks/useNotifications'
import type { AppNotification } from '../types/auth'

const dateTimeFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Botón de campana con badge de no leídas y dropdown editorial que muestra las
 * notificaciones más recientes. Al hacer click en una notificación no leída se
 * marca como leída inmediatamente vía PATCH al backend.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  const notifications = useMyNotifications()
  const markRead = useMarkNotificationRead()

  // Cierra el dropdown al hacer click fuera o al presionar Escape.
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand/30 hover:text-ink"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        aria-expanded={open}
      >
        <BellIcon hasUnread={unreadCount > 0} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-terracotta px-1 font-mono text-[9px] font-medium text-cream">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationsDropdown
          notifications={notifications.data ?? []}
          isLoading={notifications.isLoading}
          isError={notifications.isError}
          unreadCount={unreadCount}
          onMarkRead={(id) => markRead.mutate(id)}
          isMarking={markRead.isPending}
        />
      )}
    </div>
  )
}

interface BellIconProps {
  hasUnread: boolean
}

function BellIcon({ hasUnread }: BellIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <path d="M10 3a4 4 0 0 0-4 4v2.6c0 .8-.3 1.5-.8 2L4 13h12l-1.2-1.4c-.5-.5-.8-1.3-.8-2V7a4 4 0 0 0-4-4z" />
      <path d="M8.5 16a1.5 1.5 0 0 0 3 0" strokeWidth={hasUnread ? 1.6 : 1.4} />
    </svg>
  )
}

interface DropdownProps {
  notifications: AppNotification[]
  isLoading: boolean
  isError: boolean
  unreadCount: number
  onMarkRead: (id: string) => void
  isMarking: boolean
}

function NotificationsDropdown({
  notifications,
  isLoading,
  isError,
  unreadCount,
  onMarkRead,
  isMarking,
}: DropdownProps) {
  return (
    <div className="absolute right-0 top-12 z-40 w-[380px] overflow-hidden rounded-md border border-sand bg-cream-bone shadow-lg">
      <div className="flex items-end justify-between border-b border-sand bg-cream px-5 py-4">
        <div>
          <p className="label-mono">Notificaciones</p>
          <h3 className="mt-1 font-serif text-lg leading-tight tracking-tight text-ink">
            Tus últimas alertas.
          </h3>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-terracotta/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-terracotta-deep">
            {unreadCount} sin leer
          </span>
        )}
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {isError && (
          <p className="border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-xs text-terracotta-deep">
            No se pudieron cargar las notificaciones.
          </p>
        )}

        {isLoading && (
          <ul>
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="grid grid-cols-[20px_1fr_auto] items-start gap-3 border-b border-dashed border-sand px-5 py-4 last:border-0"
              >
                <Skeleton width={8} height={8} circle className="mt-1.5" />
                <div className="space-y-1.5">
                  <SkeletonTextLine width="85%" />
                  <SkeletonTextLine width="40%" />
                </div>
                <SkeletonTextLine width={56} />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && notifications.length === 0 && !isError && (
          <div className="px-5 py-10 text-center">
            <p className="font-serif text-base text-ink">Sin notificaciones por ahora.</p>
            <p className="mt-1 text-[11px] text-ink-soft">
              Cuando tu chaleco detecte algo relevante, lo verás aquí.
            </p>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <ul>
            {notifications.slice(0, 10).map((n, i) => (
              <NotificationRow
                key={n.id}
                notification={n}
                isLast={i === Math.min(notifications.length, 10) - 1}
                onMarkRead={onMarkRead}
                disabled={isMarking}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface NotificationRowProps {
  notification: AppNotification
  isLast: boolean
  onMarkRead: (id: string) => void
  disabled: boolean
}

function NotificationRow({ notification: n, isLast, onMarkRead, disabled }: NotificationRowProps) {
  const handleClick = () => {
    if (!n.is_read && !disabled) onMarkRead(n.id)
  }

  const isClickable = !n.is_read && !disabled

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isClickable}
        className={`grid w-full grid-cols-[20px_1fr_auto] items-start gap-3 px-5 py-4 text-left transition-colors ${
          !isLast ? 'border-b border-dashed border-sand' : ''
        } ${isClickable ? 'cursor-pointer hover:bg-cream/60' : 'cursor-default'}`}
      >
        <span
          className={`mt-1.5 inline-block h-2 w-2 rounded-full ${
            n.is_read ? 'bg-ink-faint/40' : 'bg-terracotta'
          }`}
        />
        <div>
          <p className={`font-serif text-[14px] leading-snug ${n.is_read ? 'text-ink-soft' : 'text-ink'}`}>
            {n.message}
          </p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            {n.type} · {n.channel}
          </p>
        </div>
        <span className="whitespace-nowrap font-mono text-[10px] text-ink-soft">
          {dateTimeFmt.format(new Date(n.sent_at))}
        </span>
      </button>
    </li>
  )
}
