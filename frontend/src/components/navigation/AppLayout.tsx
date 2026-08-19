import { BarChart3, Bot, CalendarCheck, ExternalLink, LogOut, Map, Settings, Shield, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/auth.store';

export function AppLayout() {
  const { user, logout } = useAuthStore(); const navigate = useNavigate();
  const navigation: Array<[string, string, LucideIcon]> = [
    ['/today', 'Hôm nay', CalendarCheck], ['/roadmap', 'Lộ trình', Map], ['/ai-coach', 'AI Coach', Bot],
    ['/external', 'Nguồn bên ngoài', ExternalLink], ['/reports', 'Báo cáo', BarChart3], ['/settings', 'Cài đặt', Settings],
  ];
  if (user?.role === 'ADMIN') navigation.push(['/admin', 'Quản trị', Shield]);
  async function signOut() { await logout(); navigate('/login'); }
  return <div className="app-shell"><aside className="sidebar">
    <div><p className="eyebrow">TOEIC QUEST</p><h1>Road to 800</h1><p className="muted">Mỗi ngày một chiến thắng nhỏ.</p></div>
    <nav aria-label="Điều hướng chính">{navigation.map(([to, label, Icon]) =>
      <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} />{label}</NavLink>)}</nav>
    <div className="sidebar-user"><strong>{user?.displayName}</strong><span>{user?.email}</span>
      <button type="button" onClick={signOut}><LogOut size={16} /> Đăng xuất</button></div>
  </aside><main className="main-content"><Outlet /></main></div>;
}
