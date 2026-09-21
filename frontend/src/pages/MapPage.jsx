import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {api} from '../api/client';
import IncidentMap from '../components/IncidentMap';
import {SEVERITY_VALUES, STATUS_VALUES, severityLabel, statusLabel} from '../utils/labels';

export default function MapPage() {
  const [filters, setFilters] = useState({status: '', severity: ''});
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const incidents = useQuery({
    queryKey: ['map', filters],
    queryFn: () => api.get('/incidents/map' + (query ? `?${query}` : '')).then((response) => response.data),
  });
  const stations = useQuery({
    queryKey: ['stations'],
    queryFn: () => api.get('/stations').then((response) => response.data),
  });

  return <>
    <div className="page-head">
      <div>
        <h1>Карта инцидентов и станций</h1>
      </div>
      <div className="filters">
        <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
          <option value="">Все статусы</option>
          {STATUS_VALUES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select>
        <select value={filters.severity} onChange={(e) => setFilters({...filters, severity: e.target.value})}>
          <option value="">Любая тяжесть</option>
          {SEVERITY_VALUES.map((value) => <option key={value} value={value}>{severityLabel(value)}</option>)}
        </select>
      </div>
    </div>
    <div className="panel map-panel">
      <IncidentMap incidents={incidents.data || []} stations={stations.data || []} height="calc(100vh - 190px)" />
    </div>
  </>;
}
