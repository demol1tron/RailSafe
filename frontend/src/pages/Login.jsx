import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {errorText} from '../api/client';
import {useAuth} from '../contexts/AuthContext';

export default function Login() {
  const {login, verifyTwoFactor} = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({email: '', password: ''});
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitCredentials = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(form.email, form.password);
      if (result.requires_2fa) {
        setChallenge(result);
        setCode('');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyTwoFactor(challenge.challenge_id, code);
      navigate('/dashboard');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetChallenge = () => {
    setChallenge(null);
    setCode('');
    setError('');
  };

  return <div className="auth-page"><div className="auth-card">
    <div className="auth-logo">RS</div>
    <h1>RailSafe</h1>
    <p>Система мониторинга железнодорожной безопасности</p>

    {!challenge ? <form onSubmit={submitCredentials}>
      <label>Email
        <input
          type="email"
          autoComplete="username"
          required
          value={form.email}
          onChange={(event) => setForm({...form, email: event.target.value})}
        />
      </label>
      <label>Пароль
        <input
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(event) => setForm({...form, password: event.target.value})}
        />
      </label>
      {error && <div className="alert error">{error}</div>}
      <button disabled={submitting}>{submitting ? 'Вход…' : 'Войти'}</button>
    </form> : <form onSubmit={submitCode}>
      <div className="notice">
        Пароль подтверждён. На email учётной записи отправлен одноразовый код.
        {challenge.expires_in && <> Код действует {Math.ceil(challenge.expires_in / 60)} мин.</>}
      </div>
      <label>Код подтверждения
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength="6"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
        />
      </label>
      {error && <div className="alert error">{error}</div>}
      <button disabled={submitting || code.length !== 6}>
        {submitting ? 'Проверка…' : 'Подтвердить вход'}
      </button>
      <button type="button" className="secondary" style={{width: '100%', marginTop: 8}} onClick={resetChallenge} disabled={submitting}>
        Вернуться к вводу пароля
      </button>
    </form>}

    {!challenge && <p className="muted">Нет учётной записи? <Link to="/register">Регистрация сотрудника</Link></p>}
  </div></div>;
}
