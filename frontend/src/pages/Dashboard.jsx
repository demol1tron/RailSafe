import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from '../api/client';
import {useAuth} from '../contexts/AuthContext';
import IncidentMap from '../components/IncidentMap';
import {statusLabel} from '../utils/labels';

export default function Dashboard() {
  const {user} = useAuth();
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/statistics/summary').then((response) => response.data),
    enabled: user?.role !== 'EMPLOYEE',
  });
  const map = useQuery({queryKey: ['map', 'dash'], queryFn: () => api.get('/incidents/map').then((response) => response.data)});
  const stations = useQuery({queryKey: ['stations'], queryFn: () => api.get('/stations').then((response) => response.data)});
  const recent = useQuery({queryKey: ['incidents', 'recent'], queryFn: () => api.get('/incidents?size=5').then((response) => response.data)});
  const summary = stats.data || {};

  return <>
    <div className="page-head">
      <div><h1>Обзор</h1><p>Оперативная обстановка по железнодорожной безопасности в Новосибирске</p></div>
      <Link className="button" to="/incidents/new">+ Новый инцидент</Link>
    </div>
    {user?.role !== 'EMPLOYEE' ? <div className="stats">
      <div><small>Всего</small><b>{summary.total ?? '—'}</b></div>
      <div><small>Новые</small><b>{summary.by_status?.NEW ?? 0}</b></div>
      <div><small>В работе</small><b>{(summary.by_status?.ASSIGNED ?? 0) + (summary.by_status?.IN_PROGRESS ?? 0)}</b></div>
      <div><small>Закрытые</small><b>{summary.by_status?.CLOSED ?? 0}</b></div>
    </div> : <div className="notice">Для сотрудника отображаются только собственные заявки.</div>}
    <div className="grid two">
      <div className="panel">
        <div className="panel-title"><h2>Карта инцидентов и станций</h2><Link to="/map">Открыть карту</Link></div>
        <IncidentMap incidents={(map.data || []).slice(0, 30)} stations={stations.data || []} height={360} />
      </div>
      <div className="panel">
        <h2>Последние инциденты</h2>
        <div className="incident-list">
          {recent.data?.items?.map((item) => <Link key={item.id} to={`/incidents/${item.id}`}>
            <div><b>{item.title}</b><span>{new Date(item.occurred_at).toLocaleString('ru-RU')}</span></div>
            <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
          </Link>)}
          {!recent.data?.items?.length && <p className="muted">Пока нет зарегистрированных инцидентов.</p>}
        </div>
      </div>
    </div>
  </>;
}
