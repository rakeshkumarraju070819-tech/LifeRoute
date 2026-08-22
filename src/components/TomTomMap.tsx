import { useEffect, useRef, useState } from 'react';
import { TomTomConfig } from '@tomtom-org/maps-sdk/core';
import { TomTomMap as TTMap } from '@tomtom-org/maps-sdk/map';
import type { FeatureCollection, Point, LineString } from 'geojson';
import type { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Mock data — same entities the old MapPlaceholder rendered as SVG, now as
// real coordinates. Swap for live data from the backend (see
// /src/context/MapDataContext, once that exists) once the API is wired up.
const CENTER: [number, number] = [-74.006, 40.7128]; // NYC — matches the mock GPS in Dashboard.tsx

type AmbulanceStatus = 'available' | 'en-route' | 'dispatched';
type Ambulance = { id: string; lng: number; lat: number; status: AmbulanceStatus; label: string };
type Hospital = { id: string; lng: number; lat: number; label: string };
type Emergency = { id: string; lng: number; lat: number; severity: 'critical' | 'high' };

const AMBULANCES: Ambulance[] = [
  { id: 'AMB-042', lng: -74.01, lat: 40.716, status: 'en-route', label: 'AMB-042' },
  { id: 'AMB-017', lng: -74.0, lat: 40.7185, status: 'available', label: 'AMB-017' },
  { id: 'AMB-085', lng: -73.995, lat: 40.708, status: 'dispatched', label: 'AMB-085' },
  { id: 'AMB-031', lng: -74.015, lat: 40.705, status: 'available', label: 'AMB-031' },
];

const HOSPITALS: Hospital[] = [
  { id: 'H1', lng: -74.002, lat: 40.7135, label: 'City General' },
  { id: 'H2', lng: -73.99, lat: 40.719, label: 'St. Mary Medical' },
  { id: 'H3', lng: -74.012, lat: 40.722, label: 'Metro Health' },
];

const EMERGENCIES: Emergency[] = [
  { id: 'E1', lng: -74.008, lat: 40.7145, severity: 'critical' },
  { id: 'E2', lng: -73.997, lat: 40.7105, severity: 'high' },
];

// Recommended route: AMB-042 -> City General, matching "Via Oak St -> Medical
// Blvd" shown in the crew dashboard's Live Navigation panel.
const RECOMMENDED_ROUTE: [number, number][] = [
  [-74.01, 40.716],
  [-74.006, 40.715],
  [-74.002, 40.7135],
];

// Status colors matched to StatusBadge.tsx's Tailwind classes
const AMBULANCE_COLOR: Record<AmbulanceStatus, string> = {
  available: '#22c55e', // green-500
  'en-route': '#3b82f6', // blue-500
  dispatched: '#f59e0b', // amber-500
};

function pointFC<T extends { lng: number; lat: number }>(
  items: T[],
  props: (item: T) => Record<string, unknown>,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: items.map(item => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
      properties: props(item),
    })),
  };
}

const ROUTE_FC: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: RECOMMENDED_ROUTE }, properties: {} }],
};

const HOSPITALS_FC = pointFC(HOSPITALS, h => ({ label: h.label }));
const EMERGENCIES_FC = pointFC(EMERGENCIES, e => ({ severity: e.severity }));

function ambulancesFC(visible: Ambulance[]) {
  return pointFC(visible, a => ({ label: a.label, status: a.status, color: AMBULANCE_COLOR[a.status] }));
}

interface TomTomMapProps {
  height?: string;
  showFilters?: boolean;
  variant?: 'crew' | 'dispatcher';
}

export default function TomTomMap({ height = 'h-80', showFilters = false, variant = 'dispatcher' }: TomTomMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof TTMap> | null>(null);
  const [filters, setFilters] = useState({ ambulances: true, emergencies: true, hospitals: true, traffic: true });
    const [status, setStatus] = useState<'loading' | 'ready' | 'missing-key' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
  const toggle = (k: keyof typeof filters) => setFilters(f => ({ ...f, [k]: !f[k] }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const initializeMap = async () => {
      const response = await fetch('/api/tomtom/config');
      if (!response.ok) throw new Error('TomTom configuration unavailable');
      const config = (await response.json()) as { apiKey?: string };
      if (cancelled) return;
      if (!config.apiKey) {
        setStatus('missing-key');
        return;
      }

      if (cancelled) return;

      TomTomConfig.instance.put({ apiKey: config.apiKey });

      const map = new TTMap({
        mapLibre: { container, center: CENTER, zoom: 13 },
      });
      mapRef.current = map;

      const handleMapLoad = () => {
        if (cancelled) return;
        const gl = map.mapLibreMap;
        if (gl.getSource('hospitals')) return;

      // Recommended route (crew view only)
      if (variant === 'crew') {
        gl.addSource('route', { type: 'geojson', data: ROUTE_FC });
        gl.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-dasharray': [2, 1.5] },
        });
      }

      // Hospitals
      gl.addSource('hospitals', { type: 'geojson', data: HOSPITALS_FC });
      gl.addLayer({
        id: 'hospitals-dot',
        type: 'circle',
        source: 'hospitals',
        paint: { 'circle-radius': 9, 'circle-color': '#ef4444', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
      });
      gl.addLayer({
        id: 'hospitals-label',
        type: 'symbol',
        source: 'hospitals',
        layout: { 'text-field': ['get', 'label'], 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-size': 11, 'text-optional': true },
        paint: { 'text-color': '#fecaca', 'text-halo-color': '#0d1530', 'text-halo-width': 1.2 },
      });

      // Ambulances
      gl.addSource('ambulances', { type: 'geojson', data: ambulancesFC(AMBULANCES) });
      gl.addLayer({
        id: 'ambulances-dot',
        type: 'circle',
        source: 'ambulances',
        paint: { 'circle-radius': 8, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
      });
      gl.addLayer({
        id: 'ambulances-label',
        type: 'symbol',
        source: 'ambulances',
        layout: { 'text-field': ['get', 'label'], 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-size': 10, 'text-optional': true },
        paint: { 'text-color': '#cbd5e1', 'text-halo-color': '#0d1530', 'text-halo-width': 1.2 },
      });

      // Emergencies
      gl.addSource('emergencies', { type: 'geojson', data: EMERGENCIES_FC });
      gl.addLayer({
        id: 'emergencies-dot',
        type: 'circle',
        source: 'emergencies',
        paint: {
          'circle-radius': 10,
          'circle-color': ['match', ['get', 'severity'], 'critical', '#ef4444', '#f59e0b'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

        setStatus('ready');
      };
      map.mapLibreMap.on('load', handleMapLoad);
      map.mapLibreMap.on('styledata', handleMapLoad);
      if (map.mapLibreMap.loaded()) handleMapLoad();
      map.mapLibreMap.on('error', event => {
        const message = event.error?.message || 'TomTom map resources failed to load.';
        console.error('TomTom map error:', message);
        if (!cancelled) {
          setErrorMessage(message);
          setStatus('error');
        }
      });
    };

    initializeMap().catch(error => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : 'TomTom map initialization failed.';
        console.error('TomTom initialization error:', message);
        setErrorMessage(message);
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
      mapRef.current?.mapLibreMap.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // Filter toggles: swap each source's data between the full set and empty
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    const gl = map.mapLibreMap;
    const empty: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };

    const hospitalsSrc = gl.getSource('hospitals');
    if (hospitalsSrc && 'setData' in hospitalsSrc) (hospitalsSrc as GeoJSONSource).setData(filters.hospitals ? HOSPITALS_FC : empty);

    const ambulancesSrc = gl.getSource('ambulances');
    if (ambulancesSrc && 'setData' in ambulancesSrc)
      (ambulancesSrc as GeoJSONSource).setData(filters.ambulances ? ambulancesFC(AMBULANCES) : empty);

    const emergenciesSrc = gl.getSource('emergencies');
    if (emergenciesSrc && 'setData' in emergenciesSrc)
      (emergenciesSrc as GeoJSONSource).setData(filters.emergencies ? EMERGENCIES_FC : empty);
  }, [filters, status]);

  const heightStyle = height === 'h-80' ? '320px' : height;

  if (status === 'missing-key') {
    return (
      <div
        className="relative bg-[#1a2035] rounded-lg overflow-hidden border border-slate-700 flex flex-col items-center justify-center text-center p-6"
        style={{ height: heightStyle }}
      >
        <p className="text-amber-400 text-sm font-semibold mb-2">TomTom API key not configured</p>
        <p className="text-slate-400 text-xs max-w-sm">
          Add <code className="text-slate-300 font-mono">TOMTOM_API_KEY=your_key</code> to a{' '}
          <code className="text-slate-300 font-mono">.env</code> file at the project root, then restart the API server.
          Get a free key at{' '}
          <a href="https://my.tomtom.com" target="_blank" rel="noreferrer" className="underline text-amber-300">
            my.tomtom.com
          </a>
          .
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="relative bg-[#1a2035] rounded-lg overflow-hidden border border-red-500/30 flex flex-col items-center justify-center text-center p-6" style={{ height: heightStyle }}>
        <p className="text-red-400 text-sm font-semibold mb-2">TomTom map failed to load</p>
        <p className="text-slate-400 text-xs max-w-sm">{errorMessage || 'Check the API key permissions and browser network access.'}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700" style={{ height: heightStyle }}>
      <div id={`tomtom-map-${variant}`} ref={containerRef} className="absolute inset-0 w-full h-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a2035] z-20">
          <span className="text-slate-400 text-xs font-mono animate-pulse">Loading map…</span>
        </div>
      )}

      {showFilters && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
          {(Object.keys(filters) as Array<keyof typeof filters>).map(k => (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize transition-colors ${
                filters[k] ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex gap-3 z-10 bg-[#0d1530]/85 backdrop-blur px-2 py-1 rounded-lg">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-slate-300">Available</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-slate-300">En Route</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-slate-300">Emergency</span></div>
      </div>
    </div>
  );
}
