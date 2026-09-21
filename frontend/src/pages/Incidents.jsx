import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from '../api/client';
import {useAuth} from '../contexts/AuthContext';
import {STATUS_VALUES, severityLabel, statusLabel} from '../utils/labels';

export default function Incidents() {
  const {user} = useAuth();
  const [status, setStatus] = useState('');
  const {data} = useQuery({
    queryKey: ['incidents', status],
    queryFn: () => api.get('/incidents?size=50' + (status ? `&status=${status}` : '')).then((response) => response.data),
  });

  return <>
    <div className="page-head">
      <div><h1>Инциденты</h1><p>{data?.total ?? 0} записей, доступных вашей роли</p></div>
      {['ADMIN', 'DISPATCHER', 'EMPLOYEE'].includes(user.role) && <Link className="button" to="/incidents/new">+ Создать инцидент</Link>}
    </div>
    <div className="toolbar">
      <select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">Все статусы</option>
        {STATUS_VALUES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
      </select>
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>Название</th><th>Тяжесть</th><th>Статус</th><th>Дата</th><th /></tr></thead>
      <tbody>{data?.items?.map((item) => <tr key={item.id}>
        <td><b>{item.title}</b></td>
        <td><span className={`severity ${item.severity}`}>{severityLabel(item.severity)}</span></td>
        <td><span className={`badge ${item.status}`}>{statusLabel(item.status)}</span></td>
        <td>{new Date(item.occurred_at).toLocaleString('ru-RU')}</td>
        <td><Link to={`/incidents/${item.id}`}>Открыть →</Link></td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
