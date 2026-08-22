import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Award, BarChart3, Bell, Bot, ExternalLink, Flame, LogOut, Map, PlayCircle, Settings, Shield, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../config/app';
import { useToast } from '../feedback/ToastProvider';
import { useAuthStore } from '../../features/auth/auth.store';
import { getJson } from '../../services/api-client';
import type { LearnerProfile } from '../../types/domain';

interface NavNotification { id: string; title: string; message: string; readAt?: string }

export function AppLayout() {
  const { user, logout } = useAuthStore(); const navigate = useNavigate();
  const { showToast } = useToast();
  const knownNotificationIds = useRef<Set<string> | null>(null);
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => getJson<NavNotification[]>('/notifications'), refetchInterval: 60_000 });
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me'), enabled: user?.role === 'LEARNER' });
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  useEffect(() => {
    if (!notifications.data) return;
    if (!knownNotificationIds.current) {
      knownNotificationIds.current = new Set(notifications.data.map((item) => item.id));
      return;
    }
    notifications.data.forEach((item) => {
      if (!item.readAt && !knownNotificationIds.current?.has(item.id)) {
        showToast(<><strong>{item.title}</strong><br />{item.message}</>, 'info');
      }
      knownNotificationIds.current?.add(item.id);
    });
  }, [notifications.data, showToast]);
  const navigation: Array<[string, string, LucideIcon, number?]> = [
    ['/today', user?.role === 'ADMIN' ? 'Xem bài học' : 'Tiếp tục học', PlayCircle], ['/roadmap', 'Lộ trình học', Map], ['/ai-coach', 'AI Coach', Bot],
    ['/external', 'Nguồn bên ngoài', ExternalLink], ['/reports', 'Tiến độ & thống kê', BarChart3], ['/notifications', 'Thông báo', Bell, unreadCount], ['/settings', 'Cài đặt', Settings],
  ];
  if (user?.role === 'ADMIN') navigation.push(['/admin', 'Quản trị', Shield]);
  async function signOut() { await logout(); navigate('/login'); }
  return <div className="app-shell"><aside className="sidebar">
    <div><p className="eyebrow">{APP_NAME.toUpperCase()}</p><h1>TOEIC Roadmap</h1><p className="muted">Mỗi ngày một chiến thắng nhỏ.</p></div>
    <nav aria-label="Điều hướng chính">{navigation.map(([to, label, Icon, badge]) =>
      <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} />{label}{Boolean(badge) && <span className="nav-badge">{badge}</span>}</NavLink>)}</nav>
    <div className="sidebar-user">{user?.role === 'LEARNER' && <div className="sidebar-progress"><span><Award size={16} /><strong>{profile.data?.progress?.totalXp ?? 0} XP</strong></span><span><Flame size={16} /><strong>{profile.data?.progress?.streakCount ?? 0} ngày</strong></span></div>}
      <strong>{user?.displayName}</strong><span>{user?.email}</span>
      <button type="button" onClick={signOut}><LogOut size={16} /> Đăng xuất</button></div>
  </aside><main className="main-content"><Outlet /></main></div>;
}
