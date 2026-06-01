import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/authService'

const LIST_KEY = ['notifications', 'me'] as const
const UNREAD_KEY = ['notifications', 'unread-count'] as const

export function useMyNotifications() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: listMyNotifications,
    staleTime: 30_000,
  })
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: countUnreadNotifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
    select: (data) => data.count,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_KEY })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_KEY })
    },
  })
}
