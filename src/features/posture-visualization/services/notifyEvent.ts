import { apiFetch } from '@/shared/api/client'

export type NotifyEventType = 'bad_posture_alert' | 'break_reminder'

/**
 * Avisa al backend que se disparó una alerta de postura prolongada o un
 * recordatorio de pausa, para que envíe el correo correspondiente. El
 * dedupe (una vez por episodio/intervalo) ya lo hacen los hooks que llaman
 * a esta función, y el backend aplica su propio cooldown de 30 min.
 */
export async function notifyEvent(type: NotifyEventType): Promise<void> {
  await apiFetch<void>('/users/me/notifications', {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}
