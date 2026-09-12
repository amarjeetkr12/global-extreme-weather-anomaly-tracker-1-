import React, { useState } from 'react';
import { AlertFeedItem, OperationalFilterState } from '../types.ts';
import { BellRing, ShieldAlert, MapPin, Copy, Check, ExternalLink, Filter, Info } from 'lucide-react';

interface AdvisoryFeedSectionProps {
  alerts: AlertFeedItem[];
  filters: OperationalFilterState;
  onSelectCoordinate: (lat: number, lon: number) => void;
}

export const AdvisoryFeedSection: React.FC<AdvisoryFeedSectionProps> = ({
  alerts,
  filters,
  onSelectCoordinate,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((alt) => {
    // Search
    if (filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const matchLoc = alt.location.toLowerCase().includes(q);
      const matchTitle = alt.title.toLowerCase().includes(q);
      const matchProv = alt.provenance.toLowerCase().includes(q);
      if (!matchLoc && !matchTitle && !matchProv) return false;
    }

    // Lead Day
    if (filters.leadDay !== 'ALL') {
      if (alt.lead_day.toString() !== filters.leadDay) return false;
    }

    // Risk Tier
    if (filters.hazardRiskTier !== 'ALL') {
      if (alt.risk_level !== filters.hazardRiskTier) return false;
    }

    // Atmospheric Variable
    if (filters.atmosphericVariable !== 'ALL') {
      if (filters.atmosphericVariable === 'TEMPERATURE' && !alt.hazard_type.includes('HEAT') && !alt.hazard_type.includes('COLD')) return false;
      if (filters.atmosphericVariable === 'RAINFALL' && !alt.hazard_type.includes('PRECIPITATION')) return false;
      if (filters.atmosphericVariable === 'WIND' && !alt.hazard_type.includes('WIND') && !alt.hazard_type.includes('CYCLONE')) return false;
      if (filters.atmosphericVariable === 'PRESSURE' && !alt.hazard_type.includes('PRESSURE')) return false;
      if (filters.atmosphericVariable === 'HEAT' && !alt.hazard_type.includes('HEAT')) return false;
    }

    // Confidence
    if (filters.systemConfidence !== 'ALL') {
      const minConf = parseInt(filters.systemConfidence, 10);
      if (alt.confidence_score < minConf) return false;
    }

    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6" id="advisory-feed-module">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Official Meteorological Advisory Feed
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                {filteredAlerts.length} Bulletins
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Harmonized warning bulletins attributed across IMD, NOAA, JTWC, GDACS, and USGS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
            Protocol: CAP-v1.2 XML / JSON
          </span>
        </div>
      </div>

      {/* Advisory Feed Grid */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-2 text-slate-500 text-xs">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">No active meteorological advisories matching the current filter.</p>
          <p>Change your operational filters to widen the scope.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alt) => (
            <div
              key={alt.alert_id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {alt.provenance}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Lead +{alt.lead_day}d
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {alt.title}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                      alt.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                      alt.risk_level === 'SEVERE' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      alt.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {alt.risk_level}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-semibold">{alt.location}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({alt.lat.toFixed(2)}°N, {alt.lon.toFixed(2)}°E)
                  </span>
                </div>

                {/* Protective Directive */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-slate-900 text-[11px]">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    Actionable Safety Directive:
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    {alt.action_summary}
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCoordinate(alt.lat, alt.lon)}
                  className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  View Station
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(alt.alert_id, `[${alt.provenance}] ${alt.title} - Location: ${alt.location}. Directive: ${alt.action_summary}`)}
                  className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === alt.alert_id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      Copy Bulletin
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
