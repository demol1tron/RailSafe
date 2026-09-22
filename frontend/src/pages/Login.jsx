import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {api, errorText} from '../api/client';
import {useAuth} from '../contexts/AuthContext';

export default function Login() {
  const {login, verifyTwoFactor} = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({email: '', password: ''});
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');

  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitCredentials = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
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

  const submitForgotPassword = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', {email: resetEmail});
      setNotice(response.data?.detail || 'Если такая учётная запись существует, код отправлен на email.');
      setResetStep('code');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (newPassword.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }
    if (newPassword !== repeatPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: resetEmail,
        code: resetCode,
        new_password: newPassword,
      });
      setForm((current) => ({...current, email: resetEmail, password: ''}));
      setResetMode(false);
      setResetStep('email');
      setResetCode('');
      setNewPassword('');
      setRepeatPassword('');
      setNotice(response.data?.detail || 'Пароль успешно изменён.');
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

  const openReset = () => {
    setResetMode(true);
    setResetStep('email');
    setResetEmail(form.email || '');
    setResetCode('');
    setNewPassword('');
    setRepeatPassword('');
    setError('');
    setNotice('');
  };

  const closeReset = () => {
    setResetMode(false);
    setResetStep('email');
    setError('');
    setNotice('');
  };

  return <div className="auth-page"><div className="auth-card">
    <div className="auth-logo">RS</div>
    <h1>RailSafe</h1>
    <p>Система мониторинга железнодорожной безопасности</p>

    {resetMode ? <>
      <h2>Восстановление пароля</h2>

      {resetStep === 'email' ? <form onSubmit={submitForgotPassword}>
        <label>Email
          <input
            type="email"
            autoComplete="email"
            required
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
          />
        </label>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        <button disabled={submitting}>{submitting ? 'Отправка…' : 'Отправить код'}</button>
        <button type="button" className="secondary" style={{width: '100%', marginTop: 8}} onClick={closeReset} disabled={submitting}>
          Вернуться ко входу
        </button>
      </form> : <form onSubmit={submitResetPassword}>
        {notice && <div className="notice">{notice}</div>}
        <label>Код из письма
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength="6"
            required
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />
        </label>
        <label>Новый пароль
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label>Повторите пароль
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
            value={repeatPassword}
            onChange={(event) => setRepeatPassword(event.target.value)}
          />
        </label>
        {error && <div className="alert error">{error}</div>}
        <button disabled={submitting || resetCode.length !== 6}>
          {submitting ? 'Сохранение…' : 'Изменить пароль'}
        </button>
        <button
          type="button"
          className="secondary"
          style={{width: '100%', marginTop: 8}}
          onClick={() => {
            setResetStep('email');
            setResetCode('');
            setError('');
            setNotice('');
          }}
          disabled={submitting}
        >
          Запросить новый код
        </button>
        <button type="button" className="secondary" style={{width: '100%', marginTop: 8}} onClick={closeReset} disabled={submitting}>
          Вернуться ко входу
        </button>
      </form>}
    </> : !challenge ? <form onSubmit={submitCredentials}>
      {notice && <div className="notice">{notice}</div>}
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
      <button
        type="button"
        className="linkbtn"
        style={{width: '100%', marginTop: 10}}
        onClick={openReset}
        disabled={submitting}
      >
        Забыли пароль?
      </button>
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

    {!challenge && !resetMode && <p className="muted">Нет учётной записи? <Link to="/register">Регистрация сотрудника</Link></p>}
  </div></div>;
}
