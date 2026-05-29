import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/shared/ui/toast'
import { AppLayout } from '@/shared/layout/AppLayout'
import { DashboardPage } from '@/features/posture-visualization/pages/DashboardPage'
import { AuthProvider } from '@/features/iam/context/AuthContext'
import { ProtectedRoute } from '@/features/iam/components/ProtectedRoute'
import { LoginPage } from '@/features/iam/pages/LoginPage'
import { RegisterPage } from '@/features/iam/pages/RegisterPage'
import { HistoryListPage } from '@/features/session-history/pages/HistoryListPage'
import { SessionDetailPage } from '@/features/session-history/pages/SessionDetailPage'
import { VestManagementPage } from '@/features/vest-management/pages/VestManagementPage'
import { SettingsPage } from '@/features/iam/pages/SettingsPage'
import { RecommendationsPage } from '@/features/recommendations/pages/RecommendationsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="history" element={<HistoryListPage />} />
                  <Route path="history/:sessionId" element={<SessionDetailPage />} />
                  <Route path="recommendations" element={<RecommendationsPage />} />
                  <Route path="vest" element={<VestManagementPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
