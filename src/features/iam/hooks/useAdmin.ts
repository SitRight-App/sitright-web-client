import { useQuery } from '@tanstack/react-query'
import { listAllUsers } from '../services/adminService'

export function useAllUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => listAllUsers(),
    staleTime: 60_000,
  })
}
