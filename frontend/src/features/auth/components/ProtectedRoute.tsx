import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../auth.store';

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, initialized, hydrate } = useAuthStore();
  useEffect(() => void hydrate(), [hydrate]);
  if (!initialized) return <div className="center-screen">Đang tải phiên đăng nhập...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/today" replace />;
  return <Outlet />;
}

