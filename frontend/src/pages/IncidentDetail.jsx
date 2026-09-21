import {useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api, errorText} from '../api/client';
import IncidentMap from '../components/IncidentMap';
import {useAuth} from '../contexts/AuthContext';
import {severityLabel, statusLabel} from '../utils/labels';

const nextMap = {
  NEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
};

export default function IncidentDetail() {
  const {id} = useParams();
  const {user} = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');

  const incident = useQuery({queryKey: ['incident', id], queryFn: () => api.get(`/incidents/${id}`).then((response) => response.data)});
  const comments = useQuery({queryKey: ['comments', id], queryFn: () => api.get(`/incidents/${id}/comments`).then((response) => response.data)});
  const history = useQuery({queryKey: ['history', id], queryFn: () => api.get(`/incidents/${id}/history`).then((response) => response.data)});
  const stations = useQuery({queryKey: ['stations'], queryFn: () => api.get('/stations').then((response) => response.data)});
  const inspectors = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => api.get('/users/inspectors/list').then((response) => response.data),
    enabled: ['ADMIN', 'DISPATCHER'].includes(user.role),
  });

  const reload = () => {
    queryClient.invalidateQueries({queryKey: ['incident', id]});
    queryClient.invalidateQueries({queryKey: ['history', id]});
    queryClient.invalidateQueries({queryKey: ['comments', id]});
  };

  if (incident.isLoading) return <p>Загрузка…</p>;
  if (incident.error) return <div className="alert error">{errorText(incident.error)}</div>;
  const item = incident.data;
  const stationName = stations.data?.find((station) => station.id === item.station_id)?.name || '—';

  const changeStatus = async (newStatus) => {
    const note = window.prompt('Комментарий к смене статуса (необязательно):', '') || null;
    try {
      await api.patch(`/incidents/${id}/status`, {new_status: newStatus, comment: note});
      reload();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const assign = async (event) => {
    if (!event.target.value) return;
    try {
      await api.patch(`/incidents/${id}/assign`, {assigned_to_id: event.target.value});
      reload();
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  const addComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/incidents/${id}/comments`, {text: comment});
    setComment('');
    reload();
  };

  const remove = async () => {
    if (window.confirm('Удалить инцидент без возможности восстановления?')) {
      await api.delete(`/incidents/${id}`);
      navigate('/incidents');
    }
  };

  const canEdit = ['ADMIN', 'DISPATCHER'].includes(user.role)
    || (user.role === 'EMPLOYEE' && item.reported_by_id === user.id && item.status === 'NEW');

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Инцидент · {item.id.slice(0, 8)}</div>
        <h1>{item.title}</h1>
        <p>{new Date(item.occurred_at).toLocaleString('ru-RU')}</p>
      </div>
      <div className="actions">
        {canEdit && <Link className="button secondary" to={`/incidents/${id}/edit`}>Редактировать</Link>}
        {user.role === 'ADMIN' && <button className="danger" onClick={remove}>Удалить</button>}
      </div>
    </div>
    {message && <div className="alert error">{message}</div>}

    <div className="grid two detail-grid">
      <div className="panel">
        <h2>Сведения</h2>
        <dl className="details">
          <dt>Описание</dt><dd>{item.description}</dd>
          <dt>Станция</dt><dd>{stationName}</dd>
          <dt>Тяжесть</dt><dd><span className={`severity ${item.severity}`}>{severityLabel(item.severity)}</span></dd>
          <dt>Статус</dt><dd><span className={`badge ${item.status}`}>{statusLabel(item.status)}</span></dd>
          <dt>Создан</dt><dd>{new Date(item.created_at).toLocaleString('ru-RU')}</dd>
        </dl>
        <IncidentMap
          value={{latitude: item.latitude, longitude: item.longitude}}
          stations={stations.data || []}
          single
          height={330}
        />
      </div>

      <div className="stack">
        <div className="panel">
          <h2>Управление</h2>
          {['ADMIN', 'DISPATCHER'].includes(user.role) && <label>Назначенный инспектор
            <select value={item.assigned_to_id || ''} onChange={assign}>
              <option value="">Не назначен</option>
              {inspectors.data?.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.full_name}</option>)}
            </select>
          </label>}
          {['ADMIN', 'DISPATCHER', 'INSPECTOR'].includes(user.role) && <div className="status-actions">
            {nextMap[item.status]?.map((status) => <button key={status} onClick={() => changeStatus(status)}>{statusLabel(status)}</button>)}
            {!nextMap[item.status]?.length && <span className="muted">Финальный статус</span>}
          </div>}
        </div>

        <div className="panel">
          <h2>История статусов</h2>
          <div className="timeline">{history.data?.map((entry) => <div key={entry.id}>
            <span />
            <div>
              <b>{entry.old_status ? `${statusLabel(entry.old_status)} → ` : ''}{statusLabel(entry.new_status)}</b>
              <small>{new Date(entry.changed_at).toLocaleString('ru-RU')}</small>
              {entry.comment && <p>{entry.comment}</p>}
            </div>
          </div>)}</div>
        </div>
      </div>
    </div>

    <div className="panel">
      <h2>Комментарии</h2>
      <div className="comments">{comments.data?.map((entry) => <div key={entry.id}>
        <p>{entry.text}</p>
        <small>{new Date(entry.created_at).toLocaleString('ru-RU')}</small>
      </div>)}</div>
      <form className="comment-form" onSubmit={addComment}>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавить комментарий…" />
        <button>Отправить</button>
      </form>
    </div>
  </>;
}
