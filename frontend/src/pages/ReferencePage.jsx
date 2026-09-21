import {useMemo, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, errorText} from '../api/client';
import {useAuth} from '../contexts/AuthContext';
import {SEVERITY_VALUES, severityLabel} from '../utils/labels';

const config = {
  stations: {
    title: 'Станции',
    fields: [
      ['name', 'Название'],
      ['code', 'ЕСР-код'],
      ['latitude', 'Широта', 'number'],
      ['longitude', 'Долгота', 'number'],
      ['region', 'Регион'],
    ],
  },
  categories: {
    title: 'Категории инцидентов',
    fields: [
      ['name', 'Название'],
      ['default_severity', 'Тяжесть по умолчанию', 'severity'],
      ['description', 'Описание'],
    ],
  },
};

export default function ReferencePage({type}) {
  const {user} = useAuth();
  const queryClient = useQueryClient();
  const pageConfig = config[type];
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const data = useQuery({queryKey: [type], queryFn: () => api.get(`/${type}`).then((response) => response.data)});
  const canWrite = user.role === 'ADMIN' || (user.role === 'DISPATCHER' && type === 'stations');
  const canDelete = user.role === 'ADMIN';
  const empty = useMemo(() => Object.fromEntries(pageConfig.fields.map(([key]) => [key, ''])), [pageConfig]);

  const save = async (event) => {
    event.preventDefault();
    const payload = {...editing};
    delete payload.id;
    for (const [key, , kind] of pageConfig.fields) {
      if (kind === 'number' && payload[key] !== '') payload[key] = Number(payload[key]);
      if (payload[key] === '') payload[key] = null;
    }
    try {
      if (editing.id) await api.put(`/${type}/${editing.id}`, payload);
      else await api.post(`/${type}`, payload);
      setEditing(null);
      setError('');
      queryClient.invalidateQueries({queryKey: [type]});
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await api.delete(`/${type}/${id}`);
      queryClient.invalidateQueries({queryKey: [type]});
    } catch (err) {
      setError(errorText(err));
    }
  };

  return <>
    <div className="page-head">
      <div><h1>{pageConfig.title}</h1><p>Справочник RailSafe</p></div>
      {canWrite && <button onClick={() => setEditing({...empty})}>+ Добавить</button>}
    </div>
    {error && <div className="alert error">{error}</div>}
    {editing && <form className="panel inline-form" onSubmit={save}>
      <h2>{editing.id ? 'Редактирование' : 'Новая запись'}</h2>
      <div className="form-grid">{pageConfig.fields.map(([key, label, kind]) => <label key={key}>{label}
        {kind === 'severity' ? <select value={editing[key] || ''} onChange={(e) => setEditing({...editing, [key]: e.target.value})}>
          <option value="">—</option>
          {SEVERITY_VALUES.map((value) => <option key={value} value={value}>{severityLabel(value)}</option>)}
        </select> : <input
          required={['name', 'code', 'latitude', 'longitude'].includes(key)}
          type={kind === 'number' ? 'number' : 'text'}
          step="any"
          value={editing[key] ?? ''}
          onChange={(e) => setEditing({...editing, [key]: e.target.value})}
        />}
      </label>)}</div>
      <div className="actions">
        <button>Сохранить</button>
        <button type="button" className="secondary" onClick={() => setEditing(null)}>Отмена</button>
      </div>
    </form>}
    <div className="table-wrap"><table>
      <thead><tr>{pageConfig.fields.map(([, label]) => <th key={label}>{label}</th>)}{(canWrite || canDelete) && <th />}</tr></thead>
      <tbody>{data.data?.map((row) => <tr key={row.id}>
        {pageConfig.fields.map(([key, , kind]) => <td key={key}>{kind === 'severity' ? severityLabel(row[key]) : String(row[key] ?? '—')}</td>)}
        {(canWrite || canDelete) && <td className="row-actions">
          {canWrite && <button className="linkbtn" onClick={() => setEditing({...row})}>Изменить</button>}
          {canDelete && <button className="linkbtn danger-text" onClick={() => remove(row.id)}>Удалить</button>}
        </td>}
      </tr>)}</tbody>
    </table></div>
  </>;
}
