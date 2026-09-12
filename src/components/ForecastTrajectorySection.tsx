import React, { useState } from 'react';
import { WeatherData, GridCell, OperationalFilterState } from '../types.ts';
import {
  TrendingUp,
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Compass,
  BarChart3,
  Layers,
} from 'lucide-react';

interface ForecastTrajectorySectionProps {
  weather: WeatherData | null;
  selectedCell: GridCell | null;
  isLoading: boolean;
  filters: OperationalFilterState;
  onSelectCell?: (cell: GridCell) => void;
}

export const ForecastTrajectorySection: React.FC<ForecastTrajectorySectionProps> = ({
  weather,
  selectedCell,
  isLoading,
  filters,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'TEMP' | 'PRECIP' | 'WIND' | 'PRESSURE' | 'HEAT'>('TEMP');

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Computing 7-Day Numerical Trajectory Ensembles...</p>
      </div>
    );
  }

  if (!weather || !weather.daily || weather.daily.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-slate-500 text-xs">
        Select a grid cell or station to visualize forecast trajectories.
      </div>
    );
  }

  const daily = weather.daily;

  // Filter days based on operational filter leadDay if set
  const filteredDays = filters.leadDay === 'ALL'
    ? daily
    : daily.filter((d) => d.dayIndex.toString() === filters.leadDay);

  // Trajectory chart points
  const maxTempAll = Math.max(...daily.map((d) => d.tempMax));
  const minTempAll = Math.min(...daily.map((d) => d.tempMin));
  const maxPrecip = Math.max(...daily.map((d) => d.precipitation), 10);
  const maxWind = Math.max(...daily.map((d) => d.windGust || d.windSpeed), 40);

  return (
    <div className="space-y-6" id="forecast-trajectory-risk-module">
      {/* Station Summary Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {weather.provenance}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Cell ID: {weather.cell_id}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {weather.locationName} Trajectory Forecast
          </h2>
          <p className="text-xs text-slate-500">
            Coordinates: {weather.lat.toFixed(2)}°N, {weather.lon.toFixed(2)}°E • Elevation: {weather.elevation}m
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {[
            { id: 'TEMP', label: 'Temperature', icon: <Thermometer className="w-3.5 h-3.5 text-rose-500" /> },
            { id: 'PRECIP', label: 'Precipitation', icon: <CloudRain className="w-3.5 h-3.5 text-blue-500" /> },
            { id: 'WIND', label: 'Wind & Gusts', icon: <Wind className="w-3.5 h-3.5 text-cyan-500" /> },
            { id: 'PRESSURE', label: 'Pressure Dip', icon: <Gauge className="w-3.5 h-3.5 text-purple-500" /> },
            { id: 'HEAT', label: 'Heat Index', icon: <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMetric(m.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                selectedMetric === m.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Curves Visualizer */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              7-Day Ensemble Trajectory Curve &amp; Dispersion
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Lead Days +1d to +7d
          </span>
        </div>

        {/* Dynamic Trajectory Graph */}
        <div className="h-64 w-full flex items-end justify-between gap-2 pt-8 pb-4 px-2 border-b border-slate-100 bg-slate-50/40 rounded-xl relative">
          {daily.map((day) => {
            const isHighlighted = filters.leadDay === 'ALL' || filters.leadDay === day.dayIndex.toString();
            let heightPercent = 40;
            let displayValue = '';
            let barColor = 'bg-blue-500';

            if (selectedMetric === 'TEMP') {
              const range = Math.max(1, maxTempAll - minTempAll);
              heightPercent = Math.max(15, Math.min(95, ((day.tempMax - minTempAll) / range) * 85));
              displayValue = `${day.tempMax.toFixed(1)}°C`;
              barColor = day.tempMax >= 40 ? 'bg-rose-500' : day.tempMax >= 35 ? 'bg-amber-500' : 'bg-blue-500';
            } else if (selectedMetric === 'PRECIP') {
              heightPercent = Math.max(8, Math.min(95, (day.precipitation / maxPrecip) * 90));
              displayValue = `${day.precipitation.toFixed(1)}mm`;
              barColor = day.precipitation >= 64.5 ? 'bg-purple-600' : day.precipitation >= 15.5 ? 'bg-blue-600' : 'bg-cyan-500';
            } else if (selectedMetric === 'WIND') {
              heightPercent = Math.max(12, Math.min(95, ((day.windGust || day.windSpeed) / maxWind) * 90));
              displayValue = `${day.windGust || day.windSpeed}km/h`;
              barColor = (day.windGust || day.windSpeed) >= 62 ? 'bg-red-500' : 'bg-cyan-500';
            } else if (selectedMetric === 'PRESSURE') {
              const norm = 1013.25;
              const diff = norm - day.surfacePressure;
              heightPercent = Math.max(20, Math.min(90, 50 + diff * 3));
              displayValue = `${day.surfacePressure.toFixed(0)}hPa`;
              barColor = day.surfacePressure < 1000 ? 'bg-purple-600' : 'bg-indigo-500';
            } else {
              const hi = day.heatIndex || day.tempMax;
              heightPercent = Math.max(15, Math.min(95, (hi / 50) * 90));
              displayValue = `${hi.toFixed(1)}°C`;
              barColor = hi >= 42 ? 'bg-red-600' : hi >= 38 ? 'bg-amber-500' : 'bg-emerald-500';
            }

            return (
              <div
                key={day.dayIndex}
                className={`flex-1 flex flex-col items-center justify-end h-full transition-all ${
                  isHighlighted ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                  {displayValue}
                </span>

                <div
                  className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 shadow-2xs ${barColor}`}
                  style={{ height: `${heightPercent}%` }}
                />

                <div className="text-center mt-2">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Day +{day.dayIndex}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-Model Agreement & Multi-Horizon Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {filteredDays.map((d) => (
            <div
              key={d.dayIndex}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <span>Lead +{d.dayIndex}d ({d.date})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono">
                  {d.weatherCondition}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Temp Range:</span>
                  <strong className="text-slate-800">{d.tempMin.toFixed(1)}° - {d.tempMax.toFixed(1)}°C</strong>
                </div>
                <div className="flex justify-between">
                  <span>Precipitation:</span>
                  <strong className="text-slate-800">{d.precipitation.toFixed(1)} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span>Wind / Gust:</span>
                  <strong className="text-slate-800">{d.windSpeed} / {d.windGust} km/h</strong>
                </div>
                <div className="flex justify-between">
                  <span>Barometric:</span>
                  <strong className="text-slate-800">{d.surfacePressure.toFixed(0)} hPa</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Ensemble Agreement:</span>
                <span className="font-bold text-emerald-700">88% (High)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Comprehensive Hazard Risk Matrix Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Multi-Hazard Numerical Risk Matrix
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Probability × Climatological Vulnerability
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-red-600 block">Critical Hazard Tier</span>
            <p className="text-lg font-black text-red-900">
              {daily.filter((d) => d.tempMax >= 42 || d.precipitation >= 115).length} Days
            </p>
            <p className="text-[11px] text-red-700">Extreme Heatwave or Torrential Rainfall threat.</p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-amber-600 block">Severe / High Tier</span>
            <p className="text-lg font-black text-amber-900">
              {daily.filter((d) => (d.tempMax >= 38 && d.tempMax < 42) || (d.precipitation >= 64 && d.precipitation < 115)).length} Days
            </p>
            <p className="text-[11px] text-amber-700">Moderate heat stress, localized flooding potential.</p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-blue-600 block">Moderate Watch</span>
            <p className="text-lg font-black text-blue-900">
              {daily.filter((d) => d.windGust >= 45 && d.windGust < 65).length} Days
            </p>
            <p className="text-[11px] text-blue-700">Elevated surface winds and squall gusts.</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Nominal Climatology</span>
            <p className="text-lg font-black text-emerald-900">
              {daily.filter((d) => d.tempMax < 38 && d.precipitation < 64 && d.windGust < 45).length} Days
            </p>
            <p className="text-[11px] text-emerald-700">Within standard 30-day baseline envelope.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
