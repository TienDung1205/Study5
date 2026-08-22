import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../../config/app';
import { useAuthStore } from '../auth.store';
import { PasswordInput } from '../components/PasswordInput';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError('');
    try { const user = await login(email.trim().toLowerCase(), password); navigate(user.role === 'ADMIN' ? '/admin' : '/today'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể đăng nhập.'); }
    finally { setSubmitting(false); }
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">{APP_NAME.toUpperCase()}</p><h1>Tiếp tục hành trình</h1>
    <p className="muted">Đăng nhập để tiếp tục bài học trong lộ trình.</p>
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Mật khẩu<PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
    <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
  </form></main>;
}
