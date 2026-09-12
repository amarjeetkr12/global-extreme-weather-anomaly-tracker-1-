import React from 'react';
import { TrackedWeatherEvent, OperationalFilterState } from '../types.ts';
import { Activity, Compass, ShieldAlert, History, MapPin, ArrowUpRight, TrendingUp, AlertTriangle, Layers } from 'lucide-react';

interface SpatioTemporalEventsSectionProps {
  events: TrackedWeatherEvent[];
  filters: OperationalFilterState;
  onSelectCoordinate: (lat: number, lon: number) => void;
  onInspectEvent: (event: TrackedWeatherEvent) => void;
}

export const SpatioTemporalEventsSection: React.FC<SpatioTemporalEventsSectionProps> = ({
  events,
  filters,
  onSelectCoordinate,
  onInspectEvent,
}) => {
  // Apply Operational Filters
  const filteredEvents = events.filter((evt) => {
    // Search
    if (filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchRegion = evt.region.toLowerCase().includes(q);
      const matchHazard = evt.hazard_type.toLowerCase().includes(q);
      if (!matchTitle && !matchRegion && !matchHazard) return false;
    }

    // Lead Day
    if (filters.leadDay !== 'ALL') {
      if (evt.forecast_lead_day.toString() !== filters.leadDay) return false;
    }

    // Hazard Risk Tier
    if (filters.hazardRiskTier !== 'ALL') {
      if (evt.risk_level !== filters.hazardRiskTier) return false;
    }

    // Atmospheric Variable
    if (filters.atmosphericVariable !== 'ALL') {
      if (filters.atmosphericVariable === 'TEMPERATURE' && !evt.hazard_type.includes('HEAT') && !evt.hazard_type.includes('COLD')) return false;
      if (filters.atmosphericVariable === 'RAINFALL' && !evt.hazard_type.includes('PRECIPITATION')) return false;
      if (filters.atmosphericVariable === 'WIND' && !evt.hazard_type.includes('WIND') && !evt.hazard_type.includes('CYCLONE')) return false;
      if (filters.atmosphericVariable === 'PRESSURE' && !evt.hazard_type.includes('PRESSURE')) return false;
      if (filters.atmosphericVariable === 'HEAT' && !evt.hazard_type.includes('HEAT')) return false;
    }

    // System Confidence
    if (filters.systemConfidence !== 'ALL') {
      const minConf = parseInt(filters.systemConfidence, 10);
      if (evt.confidence_score < minConf) return false;
    }

    // Geographic Scope
    if (filters.geographicScope === 'GLOBAL_ONLY' && evt.region === 'INDIA') return false;
    if (filters.geographicScope.startsWith('INDIA_') && evt.region !== 'INDIA') return false;

    return true;
  });

  return (
    <div className="space-y-6" id="spatio-temporal-events-module">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Spatio-Temporal Cluster Events
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">
                {filteredEvents.length} Active System{filteredEvents.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-cell contiguous anomaly systems tracked across spatial coordinates and temporal lead horizons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            Centroid Epsilon: 300 km
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            Persistence: ≥ 24 hrs
          </span>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-2 text-slate-500 text-xs">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">No tracked events match current operational filters.</p>
          <p>Try resetting filters or adjusting the lead horizon / hazard tier criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => (
            <div
              key={evt.event_id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 block font-bold">
                      {evt.event_id}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {evt.title}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      evt.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                      evt.risk_level === 'SEVERE' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      evt.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {evt.risk_level} ({evt.risk_score})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Centroid:</span>
                    <strong className="text-slate-800 font-mono">
                      {evt.center_lat.toFixed(2)}°N, {evt.center_lon.toFixed(2)}°E
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Clustered Cells:</span>
                    <strong className="text-slate-800">
                      {evt.affected_cells.length} Grid Nodes
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Lead Horizon:</span>
                    <strong className="text-blue-700">+{evt.forecast_lead_day} Day(s)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Confidence:</span>
                    <strong className="text-emerald-700">{evt.confidence_score}%</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                    Drift: <strong className="text-slate-700">{evt.movement_direction}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    Trend: <strong className="text-slate-700">{evt.intensity_trend}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCoordinate(evt.center_lat, evt.center_lon)}
                  className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Center on Map
                </button>

                <button
                  type="button"
                  onClick={() => onInspectEvent(evt)}
                  className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Inspect Spatio-Temporal Evolution Timeline"
                >
                  <History className="w-3.5 h-3.5" />
                  Timeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
