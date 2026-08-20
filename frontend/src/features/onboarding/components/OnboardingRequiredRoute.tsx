import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { getJson } from '../../../services/api-client';
import type { LearnerProfile } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';

export function OnboardingRequiredRoute() {
  const user = useAuthStore((state) => state.user);
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me'), enabled: user?.role === 'LEARNER' });

  if (user?.role === 'ADMIN') return <Outlet />;
  if (profile.isPending) return <div className="center-screen">Đang kiểm tra lộ trình...</div>;
  if (profile.isError) return <div className="center-screen error-state">{profile.error.message}</div>;
  if (!profile.data.learningGoal?.onboardingCompletedAt) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
