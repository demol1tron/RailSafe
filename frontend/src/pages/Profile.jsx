import {useState} from 'react';
import {api, errorText} from '../api/client';
import {useAuth} from '../contexts/AuthContext';
import {roleLabel} from '../utils/labels';

export default function Profile() {
  const {user, setUser} = useAuth();
  const [form, setForm] = useState({full_name: user.full_name, phone: user.phone || ''});
  const [pass, setPass] = useState({old_password: '', new_password: ''});
  const [message, setMessage] = useState('');

  const save = async (event) => {
    event.preventDefault();
    const fullName = form.full_name.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) {
      setMessage('Введите ФИО');
      return;
    }
    try {
      const response = await api.put('/profile', {...form, full_name: fullName, phone: form.phone || null});
      setUser(response.data);
      setForm({full_name: response.data.full_name, phone: response.data.phone || ''});
      setMessage('Профиль сохранён');
    } catch (err) {
      setMessage(errorText(err));
    }
  };

  const change = async (event) => {
    event.preventDefault();
    try {
      await api.post('/profile/password', pass);
      setPass({old_password: '', new_password: ''});
      setMessage('Пароль изменён. Активные refresh-токены отозваны.');
    } catch (err) {
      setMessage(errorText(err));
    }
  };

  return <>
    <div className="page-head"><div><h1>Профиль</h1><p>{user.email} · {roleLabel(user.role)}</p></div></div>
    {message && <div className="notice">{message}</div>}
    <div className="grid two">
      <form className="panel" onSubmit={save}>
        <h2>Личные данные</h2>
        <label>ФИО
          <input required minLength="2" maxLength="255" value={form.full_name} onChange={(event) => setForm({...form, full_name: event.target.value})} />
        </label>
        <label>Телефон
          <input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} />
        </label>
        <button>Сохранить</button>
      </form>
      <form className="panel" onSubmit={change}>
        <h2>Смена пароля</h2>
        <label>Текущий пароль
          <input type="password" value={pass.old_password} onChange={(event) => setPass({...pass, old_password: event.target.value})} />
        </label>
        <label>Новый пароль
          <input type="password" minLength="8" value={pass.new_password} onChange={(event) => setPass({...pass, new_password: event.target.value})} />
        </label>
        <button>Изменить пароль</button>
      </form>
    </div>
  </>;
}
