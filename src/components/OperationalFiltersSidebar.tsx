import React from 'react';
import { OperationalFilterState } from '../types.ts';
import { Search, SlidersHorizontal, RotateCcw, ShieldAlert, Sparkles, MapPin, Wind, Thermometer, CloudRain, Gauge, Activity } from 'lucide-react';

interface OperationalFiltersSidebarProps {
  filters: OperationalFilterState;
  onChange: (filters: OperationalFilterState) => void;
  onReset: () => void;
  matchingCount?: {
    cells: number;
    anomalies: number;
    events: number;
    alerts: number;
  };
}

export const OperationalFiltersSidebar: React.FC<OperationalFiltersSidebarProps> = ({
  filters,
  onChange,
  onReset,
  matchingCount,
}) => {
  const activeCount = [
    filters.searchQuery.trim() !== '',
    filters.leadDay !== 'ALL',
    filters.atmosphericVariable !== 'ALL',
    filters.hazardRiskTier !== 'ALL',
    filters.multiModelAgreement !== 'ALL',
    filters.systemConfidence !== 'ALL',
    filters.geographicScope !== 'ALL',
  ].filter(Boolean).length;

  const updateField = <K extends keyof OperationalFilterState>(key: K, val: OperationalFilterState[K]) => {
    onChange({
      ...filters,
      [key]: val,
    });
  };

  return (
    <aside className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-5" id="operational-filters-sidebar">
      {/* Header with Title and Reset */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Operational Filters</h2>
            <p className="text-[11px] text-slate-400">Synchronized Across All Views</p>
          </div>
        </div>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset all filters to default"
          >
            <RotateCcw className="w-3 h-3" />
            Reset ({activeCount})
          </button>
        ) : (
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100">
            Default
          </span>
        )}
      </div>

      {/* 1. Search Station / City */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          Search Station / City
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateField('searchQuery', e.target.value)}
            placeholder="Search city, state, or region..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => updateField('searchQuery', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400">Map will focus on the location and show hazards within 500 km.</p>
      </div>

      {/* 2. Forecast Lead Horizon */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Forecast Lead Horizon</span>
          <span className="text-[10px] text-slate-400 font-medium">Medium-Range</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => updateField('leadDay', 'ALL')}
            className={`py-1.5 rounded-lg border text-center transition-all ${
              filters.leadDay === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {(['1', '2', '3', '4', '5', '6', '7'] as const).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => updateField('leadDay', day)}
              className={`py-1.5 rounded-lg border text-center transition-all ${
                filters.leadDay === day
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              +{day}d
            </button>
          ))}
        </div>
      </div>

      {/* 3. Atmospheric Variable */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          Atmospheric Variable
        </label>
        <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
          {[
            { id: 'ALL', label: 'All Variables' },
            { id: 'TEMPERATURE', label: 'Temperature' },
            { id: 'RAINFALL', label: 'Rainfall / Precip' },
            { id: 'WIND', label: 'Wind & Gusts' },
            { id: 'HUMIDITY', label: 'Humidity & Dew' },
            { id: 'PRESSURE', label: 'Surface Pressure' },
            { id: 'HEAT', label: 'Heat Index / VPD' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => updateField('atmosphericVariable', v.id as any)}
              className={`px-2.5 py-1.5 rounded-lg border text-left truncate transition-all ${
                filters.atmosphericVariable === v.id
                  ? 'bg-amber-500 text-white border-amber-500 font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Hazard Risk Tier */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          Hazard Risk Tier
        </label>
        <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
          {[
            { id: 'ALL', label: 'All Tiers', color: 'bg-slate-100 text-slate-700' },
            { id: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' },
            { id: 'SEVERE', label: 'Severe', color: 'bg-rose-100 text-rose-800' },
            { id: 'HIGH', label: 'High', color: 'bg-amber-100 text-amber-800' },
            { id: 'MODERATE', label: 'Moderate', color: 'bg-blue-100 text-blue-800' },
            { id: 'LOW', label: 'Low', color: 'bg-emerald-100 text-emerald-800' },
          ].map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => updateField('hazardRiskTier', tier.id as any)}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                filters.hazardRiskTier === tier.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : `${tier.color} border-slate-200/60 hover:opacity-80`
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Geographic Scope / Indian Geographic Region */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          Geographic Region Focus
        </label>
        <select
          value={filters.geographicScope}
          onChange={(e) => updateField('geographicScope', e.target.value as any)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">All Coverage (Global + India 731)</option>
          <option value="GLOBAL_ONLY">🌍 Global Nodes Only (703)</option>
          <option value="INDIA_NORTH">🇮🇳 North India (Delhi, Jaipur, Srinagar, etc.)</option>
          <option value="INDIA_SOUTH">🇮🇳 South India (Chennai, Bangalore, Kochi, etc.)</option>
          <option value="INDIA_EAST">🇮🇳 East India (Kolkata, Patna, Bhubaneswar)</option>
          <option value="INDIA_WEST">🇮🇳 West India (Mumbai, Ahmedabad, Pune)</option>
          <option value="INDIA_CENTRAL">🇮🇳 Central India (Bhopal, Nagpur, Raipur)</option>
          <option value="INDIA_NORTHEAST">🇮🇳 Northeast India (Guwahati, Agartala)</option>
          <option value="INDIA_COASTAL">🌊 Coastal India (Cyclone Vulnerable)</option>
        </select>
      </div>

      {/* 6. Multi-Model Agreement & System Confidence */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Model Agreement</span>
          <select
            value={filters.multiModelAgreement}
            onChange={(e) => updateField('multiModelAgreement', e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All</option>
            <option value="HIGH">High (≥80%)</option>
            <option value="MODERATE">Mod (50-79%)</option>
            <option value="LOW">Low (&lt;50%)</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Min Confidence</span>
          <select
            value={filters.systemConfidence}
            onChange={(e) => updateField('systemConfidence', e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All</option>
            <option value="85">≥ 85% Strict</option>
            <option value="70">≥ 70% Balanced</option>
            <option value="50">≥ 50% Broad</option>
          </select>
        </div>
      </div>

      {/* Real-time Match Synchronization Count */}
      {matchingCount && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1 text-slate-600">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>Filter Matches:</span>
            <span className="text-emerald-700">{matchingCount.cells} Grid Cells</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[10px]">
            <span>{matchingCount.anomalies} Anomalies</span>
            <span>•</span>
            <span>{matchingCount.events} Events</span>
            <span>•</span>
            <span>{matchingCount.alerts} Advisories</span>
          </div>
        </div>
      )}
    </aside>
  );
};
