import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {errorText} from '../api/client';

export default function Register() {
  const {register} = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({email: '', password: '', repeat: '', full_name: '', phone: ''});
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const fullName = form.full_name.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) {
      setError('Введите ФИО');
      return;
    }
    if (form.password !== form.repeat) {
      setError('Пароли не совпадают');
      return;
    }
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: fullName,
        phone: form.phone || null,
      });
      nav('/login');
    } catch (err) {
      setError(errorText(err));
    }
  };

  return <div className="auth-page"><div className="auth-card wide">
    <h1>Регистрация</h1>
    <p>Роль назначается автоматически: Сотрудник. Диспетчеров и инспекторов создаёт администратор.</p>
    <form onSubmit={submit}>
      <label>ФИО
        <input required minLength="2" maxLength="255" value={form.full_name} onChange={(event) => setForm({...form, full_name: event.target.value})} />
      </label>
      <label>Email
        <input type="email" required value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} />
      </label>
      <label>Телефон
        <input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} />
      </label>
      <label>Пароль
        <input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({...form, password: event.target.value})} />
      </label>
      <label>Повторите пароль
        <input type="password" minLength="8" required value={form.repeat} onChange={(event) => setForm({...form, repeat: event.target.value})} />
      </label>
      {error && <div className="alert error">{error}</div>}
      <button>Создать аккаунт</button>
    </form>
    <Link to="/login">Вернуться ко входу</Link>
  </div></div>;
}
