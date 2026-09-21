import {useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, errorText} from '../api/client';
import {ROLE_LABELS, USER_ROLE_VALUES, roleCodeFromInput, roleLabel} from '../utils/labels';

export default function Users() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const query = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users?size=100').then((response) => response.data),
  });

  const validateName = (value) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) {
      setError('Введите ФИО пользователя');
      return null;
    }
    return normalized;
  };

  const save = async (event) => {
    event.preventDefault();
    const fullName = validateName(form.full_name);
    if (!fullName) return;

    try {
      setError('');
      await api.post('/users', {...form, full_name: fullName});
      setForm(null);
      queryClient.invalidateQueries({queryKey: ['users']});
    } catch (err) {
      setError(errorText(err));
    }
  };

  const setStatus = async (user) => {
    const action = user.is_active ? 'заблокировать' : 'разблокировать';
    if (!window.confirm(`Вы действительно хотите ${action} пользователя «${user.full_name}»?`)) return;

    try {
      setBusyId(user.id);
      setError('');
      await api.patch(`/users/${user.id}/status`, {is_active: !user.is_active});
      queryClient.invalidateQueries({queryKey: ['users']});
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (user) => {
    if (!window.confirm(
      `Удалить пользователя «${user.full_name}»?\n\n` +
      'Удаление возможно только если с пользователем не связаны инциденты, комментарии или история статусов.',
    )) return;

    try {
      setBusyId(user.id);
      setError('');
      await api.delete(`/users/${user.id}`);
      queryClient.invalidateQueries({queryKey: ['users']});
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const edit = async (user) => {
    const fullNameInput = window.prompt('ФИО', user.full_name);
    if (fullNameInput === null) return;
    const fullName = validateName(fullNameInput);
    if (!fullName) return;

    const allowed = USER_ROLE_VALUES.map((value) => ROLE_LABELS[value]).join(' / ');
    const roleInput = window.prompt(`Роль: ${allowed}`, roleLabel(user.role));
    if (roleInput === null) return;
    const role = roleCodeFromInput(roleInput);
    if (!role || !USER_ROLE_VALUES.includes(role)) {
      setError(`Допустимые роли: ${allowed}`);
      return;
    }

    try {
      setBusyId(user.id);
      setError('');
      await api.put(`/users/${user.id}`, {
        full_name: fullName,
        role,
        phone: user.phone,
      });
      queryClient.invalidateQueries({queryKey: ['users']});
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  return <>
    <div className="page-head">
      <div><h1>Пользователи</h1><p>Управление ролями и доступом</p></div>
      <button onClick={() => setForm({email: '', password: '', full_name: '', phone: '', role: 'INSPECTOR'})}>
        + Создать пользователя
      </button>
    </div>

    {error && <div className="alert error">{error}</div>}

    {form && <form className="panel inline-form" onSubmit={save}>
      <div className="form-grid">
        <label>ФИО
          <input
            required
            minLength="2"
            maxLength="255"
            value={form.full_name}
            onChange={(event) => setForm({...form, full_name: event.target.value})}
          />
        </label>
        <label>Email
          <input type="email" required value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} />
        </label>
        <label>Пароль
          <input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({...form, password: event.target.value})} />
        </label>
        <label>Телефон
          <input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} />
        </label>
        <label>Роль
          <select value={form.role} onChange={(event) => setForm({...form, role: event.target.value})}>
            {USER_ROLE_VALUES.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}
          </select>
        </label>
      </div>
      <div className="actions">
        <button>Создать</button>
        <button type="button" className="secondary" onClick={() => setForm(null)}>Отмена</button>
      </div>
    </form>}

    <div className="table-wrap"><table>
      <thead><tr><th>ФИО</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Статус</th><th>Регистрация</th><th /></tr></thead>
      <tbody>{query.data?.map((user) => <tr key={user.id}>
        <td>{user.full_name}</td>
        <td>{user.email}</td>
        <td>{user.phone || '—'}</td>
        <td>{roleLabel(user.role)}</td>
        <td>{user.is_active ? 'Активен' : 'Заблокирован'}</td>
        <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
        <td className="row-actions">
          <button className="linkbtn" disabled={busyId === user.id} onClick={() => edit(user)}>Изменить</button>
          {user.role !== 'ADMIN' && <>
            <button
              className={`linkbtn ${user.is_active ? 'danger-text' : ''}`}
              disabled={busyId === user.id}
              onClick={() => setStatus(user)}
            >
              {user.is_active ? 'Заблокировать' : 'Разблокировать'}
            </button>
            <button
              className="linkbtn danger-text"
              disabled={busyId === user.id}
              onClick={() => remove(user)}
            >
              Удалить
            </button>
          </>}
        </td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
