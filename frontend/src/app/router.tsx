import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/navigation/AppLayout';
import { AdminPage } from '../features/admin/pages/AdminPage';
import { AiCoachPage } from '../features/ai-coach/pages/AiCoachPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ExternalPage } from '../features/external-submissions/pages/ExternalPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { RoadmapPage } from '../features/roadmap/pages/RoadmapPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { TodayPage } from '../features/today/pages/TodayPage';

export function AppRouter() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/ai-coach" element={<AiCoachPage />} />
        <Route path="/external" element={<ExternalPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/today" replace />} />
  </Routes>;
}

