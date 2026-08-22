import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth.store';
import { PasswordInput } from '../components/PasswordInput';

export function RegisterPage() {
  const navigate = useNavigate(); const register = useAuthStore((state) => state.register);
  const [displayName, setDisplayName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await register(displayName, email, password); navigate('/onboarding'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể đăng ký.'); }
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">BẮT ĐẦU ROAD TO 800</p><h1>Tạo tài khoản</h1>
    <label>Họ tên<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} required /></label>
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Mật khẩu<PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
    {error && <p className="form-error">{error}</p>}<button className="primary-button">Tạo tài khoản</button>
    <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
  </form></main>;
}
