import { useEffect, useRef, useState } from 'react';
import { TomTomConfig } from '@tomtom-org/maps-sdk/core';
import { TomTomMap as TTMap } from '@tomtom-org/maps-sdk/map';
import type { FeatureCollection, LineString } from 'geojson';
import type { GeoJSONSource } from 'maplibre-gl';
import { Marker, setWorkerUrl } from 'maplibre-gl';
import { bezierSpline, distance as turfDistance, lineString } from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '../context/ThemeContext';
// Vite's `?worker&url` query resolves to the built worker chunk's URL as a
// plain string at build time.
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// maplibre-gl v6 is ESM-only and ships its worker as a separate file
// (maplibre-gl-worker.mjs) that inside a bundler needs one explicit
// setWorkerUrl() call — import.meta.url doesn't reliably resolve to it.
// v5's dedicated CSP bundle (maplibre-gl-csp-worker.js) no longer exists in
// v6 at all; pointing at it produces exactly the "timed out waiting for the
// worker" failure this map was hitting. `?worker&url` (not plain `?url`) is
// required too — the worker imports a sibling maplibre-gl-shared.mjs, and
// `?url` alone emits the file without that sibling bundled in.
setWorkerUrl(mapLibreWorkerUrl);

// Mock fleet data for the dispatcher's fleet-wide overview — swap for live
// data from the backend (see /src/context/MapDataContext, once that exists)
// once the API is wired up. The crew "Live Navigation" view no longer uses
// this mock data; it renders from real ambulance/emergency/hospital records
// passed in via the `crewFocus` prop instead (see Dashboard.tsx).
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

// Status colors matched to StatusBadge.tsx's Tailwind classes
const AMBULANCE_COLOR: Record<AmbulanceStatus, string> = {
  available: '#22c55e', // green-500
  'en-route': '#3b82f6', // blue-500
  dispatched: '#f59e0b', // amber-500
};

// A TomTom-hosted standard style ID — see @tomtom-org/maps-sdk/map's
// `standardStyleIDs`. We only ever use these three: the light/dark pair
// (theme-driven) and satellite (the "Satellite" toggle).
type BaseStyle = 'standardLight' | 'standardDark' | 'satellite';

export interface CrewFocusPoint {
  lat: number;
  lng: number;
  /** Bold line in the map label bubble, e.g. "Incident Location" or the hospital name. */
  title: string;
  /** Muted line under the title, e.g. an address or "2.1 km away". */
  subtitle?: string;
}

export interface CrewFocus {
  ambulance: CrewFocusPoint;
  /** The active leg's target — the scene before pickup, the hospital after. */
  destination: CrewFocusPoint & { kind: 'incident' | 'hospital' };
}

interface TomTomMapProps {
  height?: string;
  showFilters?: boolean;
  variant?: 'crew' | 'dispatcher';
  /** Top-left "Map / Satellite" pill toggle, as seen on the crew navigation view. */
  showStyleToggle?: boolean;
  /**
   * Real ambulance → incident/hospital focus for the crew "Live Navigation"
   * view. When set (variant="crew"), the map centers on these two points,
   * draws a route between them, and renders labeled pins instead of the
   * dispatcher's fleet-wide mock layers.
   */
  crewFocus?: CrewFocus;
}

/** Builds a road-like curve between two points via a slight midpoint offset, matching
 * the gentle zig-zag of a real routed path rather than a straight "as the crow flies" line. */
function buildRouteLine(from: [number, number], to: [number, number]): FeatureCollection<LineString> {
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  // Perpendicular offset, scaled to ~18% of the leg length, alternated per
  // call site by the sign of dx so multiple route legs don't mirror exactly.
  const offset: [number, number] = [mid[0] - dy * 0.18, mid[1] + dx * 0.18];
  const raw = lineString([from, offset, to]);
  try {
    const curved = bezierSpline(raw, { sharpness: 0.9 });
    return { type: 'FeatureCollection', features: [curved] };
  } catch {
    return { type: 'FeatureCollection', features: [raw] };
  }
}

const AMBULANCE_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l1.5-3h3L13 12h5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="16" r="1.6" fill="#fff"/><circle cx="17" cy="16" r="1.6" fill="#fff"/><path d="M3 12v3h1M20 12l-2-4h-4v4h6z" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const INCIDENT_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2 2 20h20L12 2z" fill="#fff"/><rect x="11" y="9" width="2" height="6" fill="var(--color-critical)"/><rect x="11" y="16" width="2" height="2" fill="var(--color-critical)"/></svg>';

/**
 * A round icon-badge marker element — a hospital "H", an ambulance glyph, or a
 * warning-triangle for an incident/emergency — used in place of a plain
 * color dot so ambulance / hospital / emergency pins are distinguishable by
 * shape+icon, not just by color, on both the crew and dispatcher map variants.
 * `background` lets callers color-code within a kind (e.g. an ambulance's
 * live status, or an emergency's severity) while keeping the icon fixed.
 */
function createPinElement(kind: 'incident' | 'hospital' | 'ambulance', background?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.width = kind === 'ambulance' ? '34px' : '30px';
  el.style.height = kind === 'ambulance' ? '34px' : '30px';
  el.style.borderRadius = '999px';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
  el.style.border = '2px solid #fff';

  if (kind === 'incident') {
    el.style.background = background ?? 'var(--color-critical)';
    el.innerHTML = INCIDENT_SVG;
  } else if (kind === 'hospital') {
    el.style.background = background ?? 'var(--color-positive)';
    el.innerHTML = '<span style="color:#fff;font-weight:800;font-size:14px;font-family:var(--font-sans)">H</span>';
  } else {
    el.style.background = background ?? 'var(--color-operational)';
    el.innerHTML = AMBULANCE_SVG;
  }
  return el;
}

function createLabelElement(title: string, subtitle: string | undefined, accent: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.background = 'var(--color-surface-panel-raised)';
  wrap.style.border = `1px solid ${accent}`;
  wrap.style.borderRadius = '10px';
  wrap.style.padding = '6px 10px';
  wrap.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
  wrap.style.fontFamily = 'var(--font-sans)';
  wrap.style.whiteSpace = 'nowrap';
  wrap.style.pointerEvents = 'none';
  wrap.innerHTML = `
    <div style="color:${accent};font-weight:700;font-size:11px;line-height:1.3">${title}</div>
    ${subtitle ? `<div style="color:var(--color-text-secondary);font-size:10px;line-height:1.3">${subtitle}</div>` : ''}
  `;
  return wrap;
}

export default function TomTomMap({
  height = 'h-80',
  showFilters = false,
  variant = 'dispatcher',
  showStyleToggle = false,
  crewFocus,
}: TomTomMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof TTMap> | null>(null);
  const markersRef = useRef<Marker[]>([]);
  // Dispatcher variant's icon markers, grouped by filter key (each hospital /
  // ambulance / emergency renders as a Marker now instead of a GL circle-layer
  // feature, so filter toggling hides/shows marker elements directly — see
  // the filter effect below — rather than swapping a GeoJSON source's data).
  const dispatcherMarkersRef = useRef<Record<'hospitals' | 'ambulances' | 'emergencies', Marker[]>>({
    hospitals: [],
    ambulances: [],
    emergencies: [],
  });
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ ambulances: true, emergencies: true, hospitals: true, traffic: true });
  // Mirrors `filters` for sync reads inside the map-init effect (which only
  // re-runs on variant/crewFocus change, not on every filter toggle) — see
  // its use when first laying down dispatcher markers, below.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [mapMode, setMapMode] = useState<'map' | 'satellite'>('map');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing-key' | 'error'>('loading');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const toggle = (k: keyof typeof filters) => setFilters(f => ({ ...f, [k]: !f[k] }));

  const baseStyle: BaseStyle =
    mapMode === 'satellite' ? 'satellite' : theme === 'dark' ? 'standardDark' : 'standardLight';

  // Fetch /api/tomtom/config with a couple of quick retries. `npm run
  // dev:full` starts Vite and the Express API concurrently, so on a fresh
  // page load the very first request can land before the backend has
  // finished booting (ECONNREFUSED via the Vite proxy). Retrying a few
  // times over ~1.2s absorbs that startup race without a full page reload.
  async function fetchTomTomConfig(retries = 3, delayMs = 400): Promise<{ configured: boolean; apiKey?: string }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // cache: 'no-store' prevents the browser returning a 304 with an
        // empty body — we always need the JSON payload containing the API key.
        const response = await fetch('/api/tomtom/config', { cache: 'no-store' });
        if (response.ok) {
          const text = await response.text();
          // Guard against an empty body (e.g. a misconfigured proxy 304)
          if (!text) throw new Error('/api/tomtom/config returned an empty body');
          return JSON.parse(text) as { configured: boolean; apiKey?: string };
        }
        throw new Error(`/api/tomtom/config responded ${response.status}`);
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw new Error('unreachable');
  }

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const initialCenter: [number, number] = crewFocus
      ? [(crewFocus.ambulance.lng + crewFocus.destination.lng) / 2, (crewFocus.ambulance.lat + crewFocus.destination.lat) / 2]
      : CENTER;

    const initializeMap = async () => {
      let config: { configured: boolean; apiKey?: string };
      try {
        config = await fetchTomTomConfig();
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrorDetail(
            err instanceof Error
              ? `Could not reach the API server (${err.message}). Is "npm run dev:server" (or "dev:full") running on port 8787?`
              : 'Could not reach the API server.',
          );
        }
        return;
      }

      if (cancelled) return;

      if (!config.apiKey) {
        setStatus('missing-key');
        return;
      }

      TomTomConfig.instance.put({ apiKey: config.apiKey });

      let map: InstanceType<typeof TTMap>;
      try {
        map = new TTMap({
          style: baseStyle,
          mapLibre: { container: containerRef.current!, center: initialCenter, zoom: crewFocus ? 13.5 : 13 },
        });
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrorDetail(err instanceof Error ? err.message : 'Failed to initialize the map.');
        }
        return;
      }
      mapRef.current = map;

      map.mapLibreMap.on('load', () => {
        if (cancelled) return;
        const gl = map.mapLibreMap;

        try {
          if (variant === 'crew' && crewFocus) {
            const from: [number, number] = [crewFocus.ambulance.lng, crewFocus.ambulance.lat];
            const to: [number, number] = [crewFocus.destination.lng, crewFocus.destination.lat];
            const routeFc = buildRouteLine(from, to);
            const accent = crewFocus.destination.kind === 'incident' ? '#e5484d' : '#8b5cf6';

            gl.addSource('crew-route', { type: 'geojson', data: routeFc });
            gl.addLayer({
              id: 'crew-route-line',
              type: 'line',
              source: 'crew-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': accent, 'line-width': 4 },
            });

            // Destination pin (red teardrop for the incident scene, green "H" for the hospital)
            const destEl = createPinElement(crewFocus.destination.kind);
            new Marker({ element: destEl, anchor: 'bottom' }).setLngLat(to).addTo(gl);
            const destLabelEl = createLabelElement(crewFocus.destination.title, crewFocus.destination.subtitle, accent);
            new Marker({ element: destLabelEl, anchor: 'bottom', offset: [0, -38] }).setLngLat(to).addTo(gl);

            // Ambulance marker with its own label bubble
            const ambEl = createPinElement('ambulance');
            new Marker({ element: ambEl, anchor: 'center' }).setLngLat(from).addTo(gl);
            const ambLabelEl = createLabelElement(crewFocus.ambulance.title, crewFocus.ambulance.subtitle, '#8b5cf6');
            new Marker({ element: ambLabelEl, anchor: 'top', offset: [0, 20] }).setLngLat(from).addTo(gl);

            markersRef.current = [];

            const bounds: [[number, number], [number, number]] = [
              [Math.min(from[0], to[0]) - 0.01, Math.min(from[1], to[1]) - 0.01],
              [Math.max(from[0], to[0]) + 0.01, Math.max(from[1], to[1]) + 0.01],
            ];
            gl.fitBounds(bounds, { padding: 60, duration: 0 });
          } else {
            // Dispatcher fleet-wide overview (mock data — see header comment).
            // Icon markers (hospital "H" / ambulance glyph / warning triangle)
            // instead of plain color-coded circle-layer dots, so the three
            // kinds read apart by shape at a glance, not just by color.
            const dispatcherMarkers: Record<'hospitals' | 'ambulances' | 'emergencies', Marker[]> = {
              hospitals: [],
              ambulances: [],
              emergencies: [],
            };

            for (const h of HOSPITALS) {
              const el = createPinElement('hospital');
              const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat([h.lng, h.lat]).addTo(gl);
              const labelEl = createLabelElement(h.label, undefined, '#22c55e');
              const label = new Marker({ element: labelEl, anchor: 'bottom', offset: [0, -32] }).setLngLat([h.lng, h.lat]).addTo(gl);
              dispatcherMarkers.hospitals.push(marker, label);
            }

            for (const a of AMBULANCES) {
              const el = createPinElement('ambulance', AMBULANCE_COLOR[a.status]);
              const marker = new Marker({ element: el, anchor: 'center' }).setLngLat([a.lng, a.lat]).addTo(gl);
              const labelEl = createLabelElement(a.label, undefined, AMBULANCE_COLOR[a.status]);
              const label = new Marker({ element: labelEl, anchor: 'top', offset: [0, 18] }).setLngLat([a.lng, a.lat]).addTo(gl);
              dispatcherMarkers.ambulances.push(marker, label);
            }

            for (const e of EMERGENCIES) {
              const color = e.severity === 'critical' ? '#ef4444' : '#f59e0b';
              const el = createPinElement('incident', color);
              const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat([e.lng, e.lat]).addTo(gl);
              dispatcherMarkers.emergencies.push(marker);
            }

            dispatcherMarkersRef.current = dispatcherMarkers;
            // Apply whatever filter state is current at init time (in case
            // the panel was toggled before the map finished loading).
            (Object.keys(dispatcherMarkers) as Array<keyof typeof dispatcherMarkers>).forEach(k => {
              const visible = filtersRef.current[k];
              dispatcherMarkers[k].forEach(m => (m.getElement().style.display = visible ? '' : 'none'));
            });
          }

          setStatus('ready');
        } catch (err) {
          if (!cancelled) {
            setStatus('error');
            setErrorDetail(err instanceof Error ? err.message : 'Failed to render map layers.');
          }
        }
      });

      map.mapLibreMap.on('error', (e) => {
        if (!cancelled) {
          setStatus('error');
          // MapLibre reports bad/expired API keys and tile-fetch failures
          // through this event, not a thrown exception — surface the real
          // message instead of letting it look like a missing key.
          setErrorDetail(e.error?.message || 'The map failed to load tiles. Check that the TomTom key is valid.');
        }
      });
    };

    initializeMap().catch(err => {
      if (!cancelled) {
        setStatus('error');
        setErrorDetail(err instanceof Error ? err.message : 'Unexpected error while loading the map.');
      }
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      Object.values(dispatcherMarkersRef.current).forEach(group => group.forEach(m => m.remove()));
      dispatcherMarkersRef.current = { hospitals: [], ambulances: [], emergencies: [] };
      mapRef.current?.mapLibreMap.remove();
      mapRef.current = null;
    };
    // Deliberately re-init only on variant change or a new crew focus target
    // (ambulance id / destination), not on every GPS tick — see the
    // dedicated effect below for cheap in-place marker/route updates, and
    // the style effect below for theme/map-mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, crewFocus?.destination.title, crewFocus?.destination.kind]);

  // Theme or Map/Satellite toggle changed — swap the base style in place
  // rather than tearing down the whole map (keeps markers/routes/camera).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    map.setStyle(baseStyle, { keepState: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseStyle]);

  // Crew focus moved (e.g. the ambulance's GPS ticked) — reposition the
  // existing route/markers instead of a full re-init.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || variant !== 'crew' || !crewFocus) return;
    const gl = map.mapLibreMap;
    const from: [number, number] = [crewFocus.ambulance.lng, crewFocus.ambulance.lat];
    const to: [number, number] = [crewFocus.destination.lng, crewFocus.destination.lat];
    const routeSrc = gl.getSource('crew-route');
    if (routeSrc && 'setData' in routeSrc) (routeSrc as GeoJSONSource).setData(buildRouteLine(from, to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewFocus?.ambulance.lat, crewFocus?.ambulance.lng, status]);

  // Dispatcher filter toggles: show/hide each group's marker elements
  // in place (cheaper than removing + re-adding, and avoids re-triggering
  // the map-init effect since this doesn't touch mapRef/dispatcherMarkersRef).
  useEffect(() => {
    if (!mapRef.current || status !== 'ready' || variant !== 'dispatcher') return;
    const groups = dispatcherMarkersRef.current;
    (Object.keys(groups) as Array<keyof typeof groups>).forEach(k => {
      const visible = filters[k];
      groups[k].forEach(m => (m.getElement().style.display = visible ? '' : 'none'));
    });
  }, [filters, status, variant]);

  // If height looks like a CSS value (contains 'px', '%', 'vh', etc.) use it directly;
  // otherwise treat it as a Tailwind shorthand and convert the common cases.
  const heightStyle = /^\d/.test(height) || height.includes('px') || height.includes('%') || height.includes('vh')
    ? height
    : height === 'h-80' ? '320px' : height === 'h-96' ? '384px' : '320px';

  if (status === 'missing-key') {
    return (
      <div
        className="relative bg-surface-panel rounded-lg overflow-hidden border border-hairline flex flex-col items-center justify-center text-center p-6"
        style={{ height: heightStyle }}
      >
        <p className="text-warning text-sm font-semibold mb-2">TomTom API key not configured</p>
        <p className="text-secondary text-xs max-w-sm">
          The API server responded but reported no key set. Add{' '}
          <code className="text-primary font-mono">TOMTOM_API_KEY=your_key</code> to{' '}
          <code className="text-primary font-mono">.env</code> at the project root, then restart the API server (
          <code className="text-primary font-mono">npm run dev:server</code>). Get a free key at{' '}
          <a href="https://my.tomtom.com" target="_blank" rel="noreferrer" className="underline text-warning">
            my.tomtom.com
          </a>
          .
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="relative bg-surface-panel rounded-lg overflow-hidden border border-critical/50 flex flex-col items-center justify-center text-center p-6"
        style={{ height: heightStyle }}
      >
        <p className="text-critical text-sm font-semibold mb-2">Map failed to load</p>
        <p className="text-secondary text-xs max-w-sm font-mono">{errorDetail}</p>
        <p className="text-tertiary text-xs max-w-sm mt-2">
          A key that's set but invalid, expired, or restricted to the wrong domain in the TomTom dashboard shows up
          here — not as "not configured".
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-hairline" style={{ height: heightStyle }}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-panel z-20">
          <span className="text-secondary text-xs font-mono animate-pulse">Loading map…</span>
        </div>
      )}

      {showStyleToggle && (
        <div className="absolute top-3 left-3 z-10 flex bg-surface-panel-raised border border-hairline-strong rounded-full p-0.5 shadow-lg">
          {(['map', 'satellite'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMapMode(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                mapMode === m ? 'bg-operational text-white' : 'text-secondary hover:text-primary'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
          {(Object.keys(filters) as Array<keyof typeof filters>).map(k => (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize transition-colors ${
                filters[k] ? 'bg-operational text-white' : 'bg-surface-sunken text-secondary'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {variant === 'crew' && crewFocus ? (
        <div className="absolute bottom-3 left-3 flex gap-3 z-10 bg-surface-panel-raised/90 backdrop-blur px-2 py-1 rounded-lg border border-hairline">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-operational" /><span className="text-[10px] text-secondary">Ambulance</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: crewFocus.destination.kind === 'incident' ? 'var(--color-critical)' : 'var(--color-positive)' }} /><span className="text-[10px] text-secondary">{crewFocus.destination.kind === 'incident' ? 'Incident' : 'Hospital'}</span></div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 max-w-[220px] z-10 bg-surface-panel-raised/90 backdrop-blur px-2 py-1 rounded-lg border border-hairline">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-secondary">Available</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-secondary">En Route</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-secondary">Dispatched</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-secondary">Emergency</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-secondary">Hospital</span></div>
        </div>
      )}
    </div>
  );
}

/** Great-circle distance in kilometers between two lat/lng points (used by the crew dashboard's stat bar). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return turfDistance([a.lng, a.lat], [b.lng, b.lat], { units: 'kilometers' });
}
