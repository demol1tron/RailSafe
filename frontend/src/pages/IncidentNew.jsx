import {useNavigate} from 'react-router-dom';
import {api} from '../api/client';
import IncidentForm from '../components/IncidentForm';

export default function IncidentNew() {
  const navigate = useNavigate();
  const save = async (data) => {
    const response = await api.post('/incidents', data);
    navigate(`/incidents/${response.data.id}`);
  };

  return <>
    <div className="page-head">
      <div>
        <h1>Новый инцидент</h1>
        <p>Заполните сведения и укажите точку на карте Новосибирска.</p>
      </div>
    </div>
    <div className="panel"><IncidentForm onSubmit={save} submitText="Зарегистрировать инцидент" /></div>
  </>;
}
