import {useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, errorText} from '../api/client';
import {ROLE_LABELS, USER_ROLE_VALUES, roleCodeFromInput, roleLabel} from '../utils/labels';

export default function Users() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const query = useQuery({queryKey: ['users'], queryFn: () => api.get('/users?size=100').then((response) => response.data)});

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post('/users', form);
      setForm(null);
      queryClient.invalidateQueries({queryKey: ['users']});
    } catch (err) {
      setError(errorText(err));
    }
  };

  const deactivate = async (id) => {
    await api.patch(`/users/${id}/deactivate`);
    queryClient.invalidateQueries({queryKey: ['users']});
  };

  const edit = async (user) => {
    const fullName = window.prompt('ФИО', user.full_name);
    if (fullName === null) return;
    const allowed = USER_ROLE_VALUES.map((value) => ROLE_LABELS[value]).join(' / ');
    const roleInput = window.prompt(`Роль: ${allowed}`, roleLabel(user.role));
    if (roleInput === null) return;
    const role = roleCodeFromInput(roleInput);
    if (!role || !USER_ROLE_VALUES.includes(role)) {
      setError(`Допустимые роли: ${allowed}`);
      return;
    }
    try {
      await api.put(`/users/${user.id}`, {full_name: fullName, role, phone: user.phone});
      setError('');
      queryClient.invalidateQueries({queryKey: ['users']});
    } catch (err) {
      setError(errorText(err));
    }
  };

  return <>
    <div className="page-head">
      <div><h1>Пользователи</h1><p>Управление ролями и доступом</p></div>
      <button onClick={() => setForm({email: '', password: '', full_name: '', phone: '', role: 'INSPECTOR'})}>+ Создать пользователя</button>
    </div>
    {error && <div className="alert error">{error}</div>}
    {form && <form className="panel inline-form" onSubmit={save}>
      <div className="form-grid">
        <label>ФИО<input required value={form.full_name} onChange={(event) => setForm({...form, full_name: event.target.value})} /></label>
        <label>Email<input type="email" required value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} /></label>
        <label>Пароль<input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({...form, password: event.target.value})} /></label>
        <label>Телефон<input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} /></label>
        <label>Роль<select value={form.role} onChange={(event) => setForm({...form, role: event.target.value})}>
          {USER_ROLE_VALUES.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}
        </select></label>
      </div>
      <div className="actions"><button>Создать</button><button type="button" className="secondary" onClick={() => setForm(null)}>Отмена</button></div>
    </form>}
    <div className="table-wrap"><table>
      <thead><tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Статус</th><th>Регистрация</th><th /></tr></thead>
      <tbody>{query.data?.map((user) => <tr key={user.id}>
        <td>{user.full_name}</td><td>{user.email}</td><td>{roleLabel(user.role)}</td>
        <td>{user.is_active ? 'Активен' : 'Заблокирован'}</td>
        <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
        <td className="row-actions"><button className="linkbtn" onClick={() => edit(user)}>Изменить</button>{user.is_active && user.role !== 'ADMIN' && <button className="linkbtn danger-text" onClick={() => deactivate(user.id)}>Заблокировать</button>}</td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
