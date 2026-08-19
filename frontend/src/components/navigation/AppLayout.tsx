import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, Bot, CalendarCheck, ExternalLink, LogOut, Map, Settings, Shield, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/auth.store';
import { getJson } from '../../services/api-client';

interface NavNotification { id: string; readAt?: string }

export function AppLayout() {
  const { user, logout } = useAuthStore(); const navigate = useNavigate();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => getJson<NavNotification[]>('/notifications'), refetchInterval: 60_000 });
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const navigation: Array<[string, string, LucideIcon, number?]> = [
    ['/today', 'Hôm nay', CalendarCheck], ['/roadmap', 'Lộ trình', Map], ['/ai-coach', 'AI Coach', Bot],
    ['/external', 'Nguồn bên ngoài', ExternalLink], ['/reports', 'Báo cáo', BarChart3], ['/notifications', 'Thông báo', Bell, unreadCount], ['/settings', 'Cài đặt', Settings],
  ];
  if (user?.role === 'ADMIN') navigation.push(['/admin', 'Quản trị', Shield]);
  async function signOut() { await logout(); navigate('/login'); }
  return <div className="app-shell"><aside className="sidebar">
    <div><p className="eyebrow">TOEIC QUEST</p><h1>Road to 800</h1><p className="muted">Mỗi ngày một chiến thắng nhỏ.</p></div>
    <nav aria-label="Điều hướng chính">{navigation.map(([to, label, Icon, badge]) =>
      <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} />{label}{Boolean(badge) && <span className="nav-badge">{badge}</span>}</NavLink>)}</nav>
    <div className="sidebar-user"><strong>{user?.displayName}</strong><span>{user?.email}</span>
      <button type="button" onClick={signOut}><LogOut size={16} /> Đăng xuất</button></div>
  </aside><main className="main-content"><Outlet /></main></div>;
}
