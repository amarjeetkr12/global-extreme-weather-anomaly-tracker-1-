import React from 'react';
import { TrackedWeatherEvent, AlertFeedItem } from '../types.ts';
import { Activity, BellRing, Compass, ShieldAlert, ArrowUpRight, History } from 'lucide-react';

interface EventAlertSectionProps {
  events: TrackedWeatherEvent[];
  alerts: AlertFeedItem[];
  onSelectCoordinate: (lat: number, lon: number) => void;
  onInspectEvent?: (event: TrackedWeatherEvent) => void;
}

export const EventAlertSection: React.FC<EventAlertSectionProps> = ({
  events,
  alerts,
  onSelectCoordinate,
  onInspectEvent,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="events-alerts-section">
      {/* 1. Spatio-Temporal Tracked Events Table (2 Cols) */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tracked Spatio-Temporal Anomalies</h3>
              <p className="text-xs text-slate-500">Continuous meteorological clusters grouped across space & lead time</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {events.length} System{events.length === 1 ? '' : 's'} Active
          </span>
        </div>

        {events.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
            No extreme cluster events currently meeting persistence thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Event ID</th>
                  <th className="px-3 py-2.5">Hazard Type</th>
                  <th className="px-3 py-2.5">Region</th>
                  <th className="px-3 py-2.5">Risk Level</th>
                  <th className="px-3 py-2.5">Confidence</th>
                  <th className="px-3 py-2.5">Lead Day</th>
                  <th className="px-3 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt, idx) => (
                  <tr key={`${evt.event_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-3 font-mono font-semibold text-slate-800">
                      {evt.event_id}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-slate-900">{evt.hazard_type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400 block">{evt.affected_cells.length} cells clustered</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        evt.region === 'INDIA' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                      }`}>
                        {evt.region}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        evt.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        evt.risk_level === 'SEVERE' ? 'bg-rose-100 text-rose-800' :
                        evt.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {evt.risk_level} ({evt.risk_score}/100)
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {evt.confidence_score}%
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600">
                      Day +{evt.forecast_lead_day}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCoordinate(evt.center_lat, evt.center_lon)}
                          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                        >
                          Locate <ArrowUpRight className="w-3 h-3" />
                        </button>
                        {onInspectEvent && (
                          <button
                            type="button"
                            onClick={() => onInspectEvent(evt)}
                            className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                            title="View Evolution History Timeline"
                          >
                            <History className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Alert Feed & Official Provenance (1 Col) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Alert Stream</h3>
              <p className="text-xs text-slate-500">Live operational & decision support feeds</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {alerts.length} Feeds
          </span>
        </div>

        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
              No active operational alerts.
            </div>
          ) : (
            alerts.map((alt, idx) => (
              <div
                key={`${alt.alert_id}-${idx}`}
                onClick={() => onSelectCoordinate(alt.lat, alt.lon)}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{alt.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-600">
                    Day +{alt.lead_day}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{alt.action_summary}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="font-semibold text-purple-700">[{alt.data_category}]</span>
                  <span>{alt.location}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
