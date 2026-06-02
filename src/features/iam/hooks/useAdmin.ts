import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deactivateUser, getAdminStats, listAllUsers } from '../services/adminService'

export function useAllUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => listAllUsers(),
    staleTime: 60_000,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    staleTime: 60_000,
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}
