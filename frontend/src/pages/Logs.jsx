import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api, errorText} from '../api/client';

const METHODS = ['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function Logs() {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['audit-logs', page, method, statusCode, search],
    queryFn: async () => {
      const params = new URLSearchParams({page: String(page), size: '50'});
      if (method) params.set('method', method);
      if (statusCode) params.set('status_code', statusCode);
      if (search.trim()) params.set('search', search.trim());
      const response = await api.get(`/logs?${params.toString()}`);
      return response.data;
    },
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.total || 0) / 50));

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return <>
    <div className="page-head">
      <div>
        <h1>Журнал действий</h1>
        <p>Аудит запросов и действий пользователей. Доступен только администратору.</p>
      </div>
    </div>

    <div className="toolbar">
      <select value={method} onChange={(event) => updateFilter(setMethod, event.target.value)}>
        {METHODS.map((value) => <option key={value || 'all'} value={value}>{value || 'Все методы'}</option>)}
      </select>
      <input
        style={{maxWidth: 360}}
        placeholder="Путь, email или IP"
        value={search}
        onChange={(event) => updateFilter(setSearch, event.target.value)}
      />
      <input
        style={{maxWidth: 150}}
        type="number"
        min="100"
        max="599"
        placeholder="HTTP статус"
        value={statusCode}
        onChange={(event) => updateFilter(setStatusCode, event.target.value)}
      />
    </div>

    {query.error && <div className="alert error">{errorText(query.error)}</div>}

    <div className="table-wrap"><table>
      <thead><tr>
        <th>Время</th>
        <th>Пользователь</th>
        <th>Метод</th>
        <th>Запрос</th>
        <th>Статус</th>
        <th>IP</th>
      </tr></thead>
      <tbody>{query.data?.items?.map((item) => <tr key={item.id}>
        <td>{new Date(item.created_at).toLocaleString('ru-RU')}</td>
        <td>{item.actor_email || 'Неавторизованный'}</td>
        <td><b>{item.method}</b></td>
        <td>
          <code style={{fontSize: 12, whiteSpace: 'nowrap'}}>{item.path}</code>
          {item.query_string && <div className="muted">?{item.query_string}</div>}
        </td>
        <td>{item.status_code}</td>
        <td>{item.ip_address || '—'}</td>
      </tr>)}</tbody>
    </table></div>

    {!query.isLoading && !query.data?.items?.length && <div className="panel"><p className="muted">Записей не найдено.</p></div>}

    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16}}>
      <button className="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← Назад</button>
      <span>Страница {page} из {totalPages} · всего {query.data?.total || 0}</span>
      <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Далее →</button>
    </div>
  </>;
}
