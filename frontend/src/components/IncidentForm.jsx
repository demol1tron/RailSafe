import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api, errorText} from '../api/client';
import IncidentMap from './IncidentMap';
import {SEVERITY_VALUES, severityLabel} from '../utils/labels';

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function IncidentForm({initial, onSubmit, submitText = 'Сохранить'}) {
  const [form, setForm] = useState(initial || {
    title: '',
    description: '',
    category_id: '',
    station_id: '',
    severity: 'MEDIUM',
    occurred_at: nowLocal(),
  });
  const [point, setPoint] = useState(
    initial?.latitude != null ? {latitude: initial.latitude, longitude: initial.longitude} : null,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initial) return;
    setForm({...initial, occurred_at: new Date(initial.occurred_at).toISOString().slice(0, 16)});
    setPoint({latitude: initial.latitude, longitude: initial.longitude});
  }, [initial]);

  const refs = useQuery({
    queryKey: ['incident-refs'],
    queryFn: async () => {
      const [categories, stations] = await Promise.all([api.get('/categories'), api.get('/stations')]);
      return {categories: categories.data, stations: stations.data};
    },
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!point) {
      setError('Укажите место инцидента: поставьте маркер кликом по карте.');
      return;
    }
    setError('');
    try {
      await onSubmit({
        ...form,
        station_id: form.station_id || null,
        occurred_at: new Date(form.occurred_at).toISOString(),
        ...point,
      });
    } catch (err) {
      setError(errorText(err));
    }
  };

  const refsData = refs.data || {categories: [], stations: []};

  return (
    <form className="incident-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="span2">Название
          <input required minLength="3" value={form.title || ''} onChange={(e) => setForm({...form, title: e.target.value})} />
        </label>
        <label className="span2">Описание
          <textarea required rows="5" value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} />
        </label>
        <label>Категория
          <select required value={form.category_id || ''} onChange={(e) => setForm({...form, category_id: e.target.value})}>
            <option value="">Выберите</option>
            {refsData.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Тяжесть
          <select value={form.severity || 'MEDIUM'} onChange={(e) => setForm({...form, severity: e.target.value})}>
            {SEVERITY_VALUES.map((value) => <option key={value} value={value}>{severityLabel(value)}</option>)}
          </select>
        </label>
        <label>Станция (необязательно)
          <select value={form.station_id || ''} onChange={(e) => setForm({...form, station_id: e.target.value})}>
            <option value="">—</option>
            {refsData.stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Дата и время
          <input type="datetime-local" required value={form.occurred_at || ''} onChange={(e) => setForm({...form, occurred_at: e.target.value})} />
        </label>
      </div>

      <div className="map-picker">
        <div>
          <h3>Место инцидента</h3>
          <p>Нажмите на карту, чтобы поставить или переместить маркер инцидента.</p>
        </div>
        <IncidentMap
          selectable
          value={point}
          onChange={setPoint}
          stations={refsData.stations}
          height={430}
        />
        <div className={point ? 'point-ok' : 'point-warn'}>
          {point ? '✓ Точка на карте выбрана' : 'Маркер инцидента ещё не установлен'}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      <div className="form-actions"><button type="submit">{submitText}</button></div>
    </form>
  );
}
