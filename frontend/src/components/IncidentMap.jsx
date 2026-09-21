import {useEffect, useRef} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {statusLabel} from '../utils/labels';

export const NOVOSIBIRSK_CENTER = [82.9204, 55.0302];

const severityColor = {
  LOW: '#2e9d58',
  MEDIUM: '#e0a72e',
  HIGH: '#e67823',
  CRITICAL: '#c83532',
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export default function IncidentMap({
  incidents = [],
  stations = [],
  selectable = false,
  value,
  onChange,
  height = 420,
  single = false,
}) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const incidentMarkers = useRef([]);
  const stationMarkers = useRef([]);
  const selected = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: el.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: NOVOSIBIRSK_CENTER,
      zoom: 10.5,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    if (selectable) {
      map.on('click', (event) => onChange?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      }));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [selectable, onChange]);

  useEffect(() => {
    incidentMarkers.current.forEach((marker) => marker.remove());
    incidentMarkers.current = [];
    if (single || !mapRef.current) return;

    for (const item of incidents) {
      const dot = document.createElement('div');
      dot.className = 'incident-marker';
      dot.style.background = severityColor[item.severity] || '#555';
      dot.title = `Инцидент: ${item.title}`;

      const popup = new maplibregl.Popup({offset: 18}).setHTML(
        `<strong>${escapeHtml(item.title)}</strong><br>` +
        `${escapeHtml(item.category)}<br>${escapeHtml(statusLabel(item.status))}<br>` +
        `<a href="/incidents/${encodeURIComponent(item.id)}">Открыть инцидент</a>`,
      );

      const marker = new maplibregl.Marker({element: dot})
        .setLngLat([item.longitude, item.latitude])
        .setPopup(popup)
        .addTo(mapRef.current);
      incidentMarkers.current.push(marker);
    }
  }, [incidents, single]);

  useEffect(() => {
    stationMarkers.current.forEach((marker) => marker.remove());
    stationMarkers.current = [];
    if (!mapRef.current) return;

    for (const station of stations) {
      const dot = document.createElement('div');
      dot.className = 'station-marker';
      dot.textContent = 'С';
      dot.title = `Станция: ${station.name}`;

      const popup = new maplibregl.Popup({offset: 18}).setHTML(
        `<strong>${escapeHtml(station.name)}</strong><br>` +
        `ЕСР: ${escapeHtml(station.code)}` +
        (station.region ? `<br>${escapeHtml(station.region)}` : ''),
      );

      const marker = new maplibregl.Marker({element: dot})
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(mapRef.current);
      stationMarkers.current.push(marker);
    }
  }, [stations]);

  useEffect(() => {
    if (selected.current) {
      selected.current.remove();
      selected.current = null;
    }
    if (value?.latitude == null || value?.longitude == null || !mapRef.current) return;

    selected.current = new maplibregl.Marker({color: '#1f5f99'})
      .setLngLat([value.longitude, value.latitude])
      .addTo(mapRef.current);

    if (single) {
      mapRef.current.flyTo({center: [value.longitude, value.latitude], zoom: 13});
    }
  }, [value, single]);

  return (
    <div className="map-wrap">
      <div ref={el} className="map" style={{height}} />
      <div className="map-legend" aria-label="Обозначения карты">
        <span><i className="legend-station">С</i> Станция</span>
        {!single && <span><i className="legend-incident" /> Инцидент</span>}
      </div>
    </div>
  );
}
