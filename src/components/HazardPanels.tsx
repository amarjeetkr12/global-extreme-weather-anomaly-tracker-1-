import React from 'react';
import { CycloneEvent, TsunamiEvent, WeatherAnomaly, TrackedWeatherEvent } from '../types.ts';
import { Wind, Waves, AlertTriangle, Compass, ShieldAlert, CheckCircle2, ShieldQuestion } from 'lucide-react';

interface HazardPanelsProps {
  cyclones: CycloneEvent[];
  tsunamis: TsunamiEvent[];
  anomalies: WeatherAnomaly[];
  events: TrackedWeatherEvent[];
  onSelectCoordinate: (lat: number, lon: number) => void;
}

export const HazardPanels: React.FC<HazardPanelsProps> = ({
  cyclones,
  tsunamis,
  anomalies,
  events,
  onSelectCoordinate,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="hazard-intelligence-section">
      {/* 1. Cyclones / Hurricanes / Typhoons Module */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 min-h-[420px]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Tropical Cyclones / Hurricanes</h3>
                <span className="text-[9px] font-bold tracking-wider text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md">LIVE FEED</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">NOAA NHC · JTWC · IMD · GDACS</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
            cyclones.length > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {cyclones.length} Active System{cyclones.length === 1 ? '' : 's'}
          </span>
        </div>

        {cyclones.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 text-center">
            <div className="mb-3 rounded-full bg-white p-2.5 shadow-sm ring-1 ring-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No active cyclone systems</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Authoritative public feeds are being monitored continuously. The panel will update when a system is reported.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Monitoring online
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {cyclones.map((c) => (
              <div
                key={c.cyclone_id}
                onClick={() => onSelectCoordinate(c.current_lat, c.current_lon)}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">🌀 {c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-white text-rose-700 border border-rose-200">
                      {c.basin}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-rose-700">{c.intensity_category}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Position:</span>{' '}
                    <strong>{c.current_lat}°N, {c.current_lon}°E</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Wind:</span> <strong>{c.max_wind_kmh} km/h</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Heading:</span> <strong>{c.movement_direction} at {c.movement_speed_kmh} km/h</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-rose-100">
                  <span>Provenance: <strong>{c.provenance}</strong> ({c.data_category})</span>
                  <span className="text-blue-600 font-semibold hover:underline">Focus on Map →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Tsunami & Seismic Monitoring Module */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 min-h-[420px]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Tsunami & Oceanic Bulletins</h3>
                <span className="text-[9px] font-bold tracking-wider text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded-md">LIVE FEED</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">USGS Seismic · NOAA / PTWC Warning Centers</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {tsunamis.length} Event{tsunamis.length === 1 ? '' : 's'} Logged
          </span>
        </div>

        {tsunamis.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/30 px-6 text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-slate-800">No active tsunami warnings</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">No destructive oceanic displacement is currently registered by the monitored warning centers.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Feed monitored
              </span>
          </div>
        ) : (
          <div className="space-y-3">
            {tsunamis.slice(0, 3).map((t) => (
              <div
                key={t.tsunami_id}
                onClick={() => onSelectCoordinate(t.event_lat, t.event_lon)}
                className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 hover:bg-sky-50/70 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">🌊 {t.title}</div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    t.alert_level === 'WARNING' ? 'bg-red-100 text-red-800' :
                    t.alert_level === 'ADVISORY' ? 'bg-amber-100 text-amber-800' :
                    'bg-sky-100 text-sky-800'
                  }`}>
                    {t.alert_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Earthquake:</span>{' '}
                    <strong>M {t.source_earthquake.magnitude}</strong> (Depth: {t.source_earthquake.depth_km} km)
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span> <strong>{t.status}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-sky-100">
                  <span>Provenance: <strong>{t.provenance}</strong> [{t.data_category}]</span>
                  <span className="text-blue-600 font-semibold hover:underline">Focus on Map →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
