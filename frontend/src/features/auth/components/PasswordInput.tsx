import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <div className="password-input">
    <input {...props} type={visible ? 'text' : 'password'} />
    <button
      type="button"
      aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      aria-pressed={visible}
      title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      onClick={() => setVisible((current) => !current)}
    >
      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>;
}
