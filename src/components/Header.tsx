import React, { useEffect, useState } from 'react';
import { Globe2, Radio, Layers, Activity, Wind, Waves, AlertTriangle } from 'lucide-react';
import { SystemStats } from '../types.ts';

interface HeaderProps {
  stats: SystemStats | null;
  activeRegionFilter: 'ALL' | 'GLOBAL' | 'INDIA';
  onFilterChange: (region: 'ALL' | 'GLOBAL' | 'INDIA') => void;
  apiConnected: boolean;
  lastSystemSync: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  activeRegionFilter,
  onFilterChange,
  apiConnected,
  lastSystemSync,
}) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const clockTimer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs" id="app-header">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Globe2 className="w-3.5 h-3.5 text-blue-600" />
              WORLDWIDE + INDIA PLATFORM
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Smart India Hackathon 2026
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
              <Radio className={`w-3 h-3 ${apiConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
              {apiConnected ? 'Feeds Connected' : 'Connecting'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200">
              <Activity className="w-3 h-3 animate-pulse" />
              LIVE SYNC {lastSystemSync ? new Date(lastSystemSync).toLocaleTimeString() : 'STARTING'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-900 text-slate-100 border border-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {currentTime.toLocaleTimeString()}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
              🛰️ Multi-Spectral Satellite (GOES / Meteosat / Himawari / GPM)
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
            AI-Driven Spatio-Temporal Tracking of Extreme Weather Anomalies
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Earth-Observation Satellite Radiometry • Medium-Range Numerical Forecasts • Multi-Source Hazard Fusion • Cyclones & Tsunamis
          </p>
        </div>

        {/* Global vs India Region Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onFilterChange('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeRegionFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All (731)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('INDIA')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeRegionFilter === 'INDIA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              🇮🇳 India (28 Nodes)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('GLOBAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeRegionFilter === 'GLOBAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              🌍 Global (703 Cells)
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic KPI Bar */}
      {stats && (
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Global Cells</span>
            <span className="font-extrabold text-slate-800">{stats.global_cells_count}</span>
          </div>
          <div className="bg-emerald-50/60 px-3 py-1.5 rounded-lg border border-emerald-200">
            <span className="text-emerald-600 block text-[10px] uppercase font-bold">India Nodes</span>
            <span className="font-extrabold text-emerald-900">{stats.india_nodes_count}</span>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Tracked Events</span>
            <span className="font-extrabold text-slate-800">{stats.active_events_count}</span>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Cyclones</span>
            <span className="font-extrabold text-slate-800">{stats.active_cyclones_count}</span>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Tsunami Events</span>
            <span className="font-extrabold text-slate-800">{stats.active_tsunamis_count}</span>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Data Feeds Online</span>
            <span className="font-extrabold text-emerald-700">{stats.sources_online_count} / {stats.total_sources_count}</span>
          </div>
        </div>
      )}
    </header>
  );
};
