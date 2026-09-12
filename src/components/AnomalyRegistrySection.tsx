import React, { useState } from 'react';
import { WeatherAnomaly, OperationalFilterState } from '../types.ts';
import { Database, Download, Filter, MapPin, CheckCircle2, AlertTriangle, ArrowUpDown, Search, ShieldCheck } from 'lucide-react';

interface AnomalyRegistrySectionProps {
  anomalies: WeatherAnomaly[];
  filters: OperationalFilterState;
  onSelectCoordinate: (lat: number, lon: number) => void;
}

export const AnomalyRegistrySection: React.FC<AnomalyRegistrySectionProps> = ({
  anomalies,
  filters,
  onSelectCoordinate,
}) => {
  const [sortField, setSortField] = useState<'SCORE' | 'LEAD' | 'LOCATION'>('SCORE');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Apply filters
  const filteredAnomalies = anomalies.filter((a) => {
    // Search
    if (filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const matchLoc = (a.location_name || '').toLowerCase().includes(q);
      const matchId = (a.cell_id || '').toLowerCase().includes(q) || (a.anomaly_id || '').toLowerCase().includes(q);
      const matchType = (a.hazard_type || '').toLowerCase().includes(q);
      if (!matchLoc && !matchId && !matchType) return false;
    }

    // Lead Day
    if (filters.leadDay !== 'ALL') {
      if (a.forecast_lead_day?.toString() !== filters.leadDay) return false;
    }

    // Atmospheric Variable
    if (filters.atmosphericVariable !== 'ALL') {
      const hType = a.hazard_type || '';
      if (filters.atmosphericVariable === 'TEMPERATURE' && !hType.includes('HEAT') && !hType.includes('COLD')) return false;
      if (filters.atmosphericVariable === 'RAINFALL' && !hType.includes('PRECIPITATION')) return false;
      if (filters.atmosphericVariable === 'WIND' && !hType.includes('WIND')) return false;
      if (filters.atmosphericVariable === 'PRESSURE' && !hType.includes('PRESSURE')) return false;
      if (filters.atmosphericVariable === 'HEAT' && !hType.includes('HEAT')) return false;
    }

    // Risk Tier
    if (filters.hazardRiskTier !== 'ALL') {
      if (a.risk_level !== filters.hazardRiskTier) return false;
    }

    // Confidence
    if (filters.systemConfidence !== 'ALL') {
      const minConf = parseInt(filters.systemConfidence, 10);
      if (a.confidence_score < minConf) return false;
    }

    // Geographic Region
    if (filters.geographicScope === 'GLOBAL_ONLY' && a.region === 'INDIA') return false;
    if (filters.geographicScope.startsWith('INDIA_') && a.region !== 'INDIA') return false;

    return true;
  });

  // Sort
  const sorted = [...filteredAnomalies].sort((a, b) => {
    let diff = 0;
    if (sortField === 'SCORE') diff = b.anomaly_score - a.anomaly_score;
    else if (sortField === 'LEAD') diff = a.forecast_lead_day - b.forecast_lead_day;
    else diff = a.location_name.localeCompare(b.location_name);
    return sortAsc ? -diff : diff;
  });

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'AnomalyID',
      'Location',
      'Region',
      'Latitude',
      'Longitude',
      'HazardType',
      'LeadDay',
      'Observed',
      'Baseline',
      'Deviation',
      'ZScore',
      'RobustIQRRatio',
      'DualEvidencePassed',
      'RiskLevel',
      'Confidence',
      'Provenance',
    ];
    const rows = sorted.map((a) => [
      a.anomaly_id,
      `"${a.location_name}"`,
      a.region,
      a.lat,
      a.lon,
      a.hazard_type,
      a.forecast_lead_day,
      a.observed_value,
      a.baseline_value,
      (a.observed_value - a.baseline_value).toFixed(2),
      a.evidence.statistical_zscore.toFixed(2),
      a.evidence.robust_iqr_ratio.toFixed(2),
      a.evidence.dual_evidence_passed ? 'YES' : 'NO',
      a.risk_level,
      `${a.confidence_score}%`,
      a.provenance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `extreme_weather_anomalies_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="anomaly-registry-module">
      {/* Header & KPI Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Dual-Evidence Meteorological Anomaly Registry
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                  {sorted.length} Anomaly Records
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mathematical convergence: Parametric Gaussian Z-Score (|Z| ≥ 2.0) + Non-Parametric Robust IQR (1.5x)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xs self-start md:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Export Registry (.CSV)
          </button>
        </div>

        {/* Statistical KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Matched</span>
            <span className="text-xl font-extrabold text-slate-900">{sorted.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Dual-Evidence Passed</span>
            <span className="text-xl font-extrabold text-emerald-800">
              {sorted.filter((a) => a.evidence.dual_evidence_passed).length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
            <span className="text-[10px] uppercase font-bold text-purple-600 block">High Z-Score (|Z| ≥ 2.5)</span>
            <span className="text-xl font-extrabold text-purple-800">
              {sorted.filter((a) => Math.abs(a.evidence.statistical_zscore) >= 2.5).length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-red-50/60 border border-red-200">
            <span className="text-[10px] uppercase font-bold text-red-600 block">Severe / Critical</span>
            <span className="text-xl font-extrabold text-red-800">
              {sorted.filter((a) => a.risk_level === 'CRITICAL' || a.risk_level === 'SEVERE').length}
            </span>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Sort by:</span>
            <button
              type="button"
              onClick={() => {
                if (sortField === 'SCORE') setSortAsc(!sortAsc);
                else { setSortField('SCORE'); setSortAsc(false); }
              }}
              className={`font-semibold cursor-pointer ${sortField === 'SCORE' ? 'text-blue-600' : 'text-slate-600'}`}
            >
              Severity Score {sortField === 'SCORE' && (sortAsc ? '↑' : '↓')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (sortField === 'LEAD') setSortAsc(!sortAsc);
                else { setSortField('LEAD'); setSortAsc(true); }
              }}
              className={`font-semibold cursor-pointer ${sortField === 'LEAD' ? 'text-blue-600' : 'text-slate-600'}`}
            >
              Lead Day {sortField === 'LEAD' && (sortAsc ? '↑' : '↓')}
            </button>
          </div>

          <span className="text-[11px] font-mono">
            Showing {sorted.length} records
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No anomaly records match the operational filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Location / Station</th>
                  <th className="px-3 py-3">Hazard Type</th>
                  <th className="px-3 py-3">Lead Day</th>
                  <th className="px-3 py-3">Observed vs Normal</th>
                  <th className="px-3 py-3">Z-Score (|Z|≥2.0)</th>
                  <th className="px-3 py-3">Robust IQR</th>
                  <th className="px-3 py-3">Risk Level</th>
                  <th className="px-3 py-3">Confidence</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((a) => (
                  <tr key={a.anomaly_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-bold">
                        {a.location_name}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {a.lat.toFixed(2)}°N, {a.lon.toFixed(2)}°E • {a.region}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {a.hazard_type.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px]">
                        +{a.forecast_lead_day}d
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]">
                      <span className="font-bold text-slate-900">{a.observed_value.toFixed(1)}{a.unit}</span>
                      <span className="text-slate-400 block text-[10px]">Normal: {a.baseline_value.toFixed(1)}{a.unit}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-purple-700">
                        Z={a.evidence.statistical_zscore > 0 ? `+${a.evidence.statistical_zscore.toFixed(2)}` : a.evidence.statistical_zscore.toFixed(2)}σ
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                      {a.evidence.robust_iqr_ratio.toFixed(2)}x IQR
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          a.risk_level === 'SEVERE' ? 'bg-rose-100 text-rose-800' :
                          a.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {a.risk_level}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-emerald-700">
                      {a.confidence_score}%
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onSelectCoordinate(a.lat, a.lon)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View on Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
