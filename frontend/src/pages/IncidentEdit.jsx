import {useQuery} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import {api} from '../api/client';
import IncidentForm from '../components/IncidentForm';

export default function IncidentEdit() {
  const {id} = useParams();
  const navigate = useNavigate();
  const incident = useQuery({
    queryKey: ['incident', id],
    queryFn: () => api.get(`/incidents/${id}`).then((response) => response.data),
  });

  const save = async (data) => {
    const response = await api.put(`/incidents/${id}`, data);
    navigate(`/incidents/${response.data.id}`);
  };

  if (!incident.data) return <p>Загрузка…</p>;
  return <>
    <div className="page-head"><div><h1>Редактирование</h1><p>{incident.data.title}</p></div></div>
    <div className="panel"><IncidentForm initial={incident.data} onSubmit={save} /></div>
  </>;
}
