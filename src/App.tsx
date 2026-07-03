import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/shared/ui/toast'
import { AppLayout } from '@/shared/layout/AppLayout'
import { DashboardPage } from '@/features/posture-visualization/pages/DashboardPage'
import { AuthProvider } from '@/features/iam/context/AuthContext'
import { ProtectedRoute } from '@/features/iam/components/ProtectedRoute'
import { AdminRoute } from '@/features/iam/components/AdminRoute'
import { ForgotPasswordPage } from '@/features/iam/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/iam/pages/ResetPasswordPage'
import { LoginPage } from '@/features/iam/pages/LoginPage'
import { RegisterPage } from '@/features/iam/pages/RegisterPage'
import { HistoryListPage } from '@/features/session-history/pages/HistoryListPage'
import { SessionDetailPage } from '@/features/session-history/pages/SessionDetailPage'
import { WeeklyEvolutionPage } from '@/features/session-history/pages/WeeklyEvolutionPage'
import { VestManagementPage } from '@/features/vest-management/pages/VestManagementPage'
import { SettingsPage } from '@/features/iam/pages/SettingsPage'
import { AdminPage } from '@/features/iam/pages/AdminPage'
import { RecommendationsPage } from '@/features/recommendations/pages/RecommendationsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user": framer-motion respeta la preferencia del SO y
          convierte los desplazamientos en fundidos cuando el usuario lo pide. */}
      <MotionConfig reducedMotion="user">
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="history" element={<HistoryListPage />} />
                  <Route path="history/weekly" element={<WeeklyEvolutionPage />} />
                  <Route path="history/:sessionId" element={<SessionDetailPage />} />
                  <Route path="recommendations" element={<RecommendationsPage />} />
                  <Route path="vest" element={<VestManagementPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
