import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('learner@toeicquest.local');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError('');
    try { const user = await login(email, password); navigate(user.role === 'ADMIN' ? '/admin' : '/today'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể đăng nhập.'); }
    finally { setSubmitting(false); }
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">TOEIC QUEST 800</p><h1>Tiếp tục hành trình</h1>
    <p className="muted">Đăng nhập để tiếp tục bài học trong lộ trình.</p>
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
    <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
  </form></main>;
}
