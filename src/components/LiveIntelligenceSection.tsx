import React, { useState, useEffect, useMemo } from 'react';
import {
  FusedEvidenceRecord,
  FourWayComparisonRecord,
  MultiSourceHazardCategory,
} from '../types.ts';
import {
  ShieldAlert,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Satellite,
  FileSpreadsheet,
  Globe,
  Sliders,
  Filter,
  ChevronRight,
  Info,
  RefreshCw,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LiveIntelligenceSectionProps {
  onSelectCoordinate?: (lat: number, lon: number) => void;
}

export const LiveIntelligenceSection: React.FC<LiveIntelligenceSectionProps> = ({
  onSelectCoordinate,
}) => {
  const [fusedRecords, setFusedRecords] = useState<FusedEvidenceRecord[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<FourWayComparisonRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'FUSED_HAZARDS' | 'FOUR_WAY_COMPARISON'>('FUSED_HAZARDS');

  // Filters
  const [selectedHazard, setSelectedHazard] = useState<string>('ALL');
  const [selectedAgreement, setSelectedAgreement] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [activeRecordModal, setActiveRecordModal] = useState<FusedEvidenceRecord | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [unifiedRes, compRes] = await Promise.all([
        fetch('/api/intelligence/unified'),
        fetch('/api/intelligence/comparison-4way'),
      ]);

      if (unifiedRes.ok) {
        const data = await unifiedRes.json();
        setFusedRecords(data.fused_records || []);
      }

      if (compRes.ok) {
        const data = await compRes.json();
        setComparisonMatrix(data.matrix || []);
      }
    } catch (err) {
      console.error('Error fetching unified intelligence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered fused hazards
  const filteredRecords = useMemo(() => {
    return fusedRecords.filter((rec) => {
      if (selectedHazard !== 'ALL' && rec.hazard_type !== selectedHazard) return false;
      if (selectedAgreement !== 'ALL' && rec.agreement_status !== selectedAgreement) return false;
      if (selectedRegion !== 'ALL') {
        const r = selectedRegion.toLowerCase();
        if (!rec.region.toLowerCase().includes(r) && !rec.target_name.toLowerCase().includes(r)) {
          return false;
        }
      }
      return true;
    });
  }, [fusedRecords, selectedHazard, selectedAgreement, selectedRegion]);

  const hazardStats = useMemo(() => {
    const highAgreement = fusedRecords.filter((r) => r.agreement_status === 'HIGH_AGREEMENT').length;
    const disagreement = fusedRecords.filter((r) => r.agreement_status === 'DISAGREEMENT').length;
    const criticalRisks = fusedRecords.filter((r) => r.risk_level === 'CRITICAL' || r.risk_level === 'SEVERE').length;
    return { highAgreement, disagreement, criticalRisks, total: fusedRecords.length };
  }, [fusedRecords]);

  return (
    <div className="space-y-6" id="live-intelligence-section">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-purple-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5" />
                MULTI-SOURCE FUSION ENGINE
              </span>
              <span className="bg-slate-800 text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                Strict Hierarchy Weighting Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Live Multi-Source Risk Intelligence &amp; Cross-Verification
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Fuses official meteorological warnings (RSMC/IMD/JTWC), direct weather observations, geostationary satellite radiometry (ABI/SEVIRI/AHI), numerical weather prediction models (GFS/ECMWF), and dual-evidence statistical anomaly tensors.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('FUSED_HAZARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'FUSED_HAZARDS'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fused Hazards ({fusedRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('FOUR_WAY_COMPARISON')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'FOUR_WAY_COMPARISON'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4-Way Matrix ({comparisonMatrix.length})
              </button>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer border border-slate-700"
              title="Refresh Fused Evidence"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scientific Disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-amber-300/90 bg-amber-950/20 p-3 rounded-xl border border-amber-800/30">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-normal">
            <strong className="text-amber-200">Scientific Disclaimer:</strong> Satellite observations and model outputs are used for monitoring and decision-support. This system does not replace official meteorological or tsunami warnings and does not guarantee future event occurrence.
          </p>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] font-bold text-slate-500 uppercase">Fused Hazard Threats</span>
          <span className="text-2xl font-extrabold text-slate-900">{hazardStats.total}</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">Across 10 WMO categories</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] font-bold text-emerald-700 uppercase">Cross-Verified High Agreement</span>
          <span className="text-2xl font-extrabold text-emerald-700">{hazardStats.highAgreement}</span>
          <span className="block text-[10px] text-emerald-600 mt-0.5">Multi-source alignment (Confidence &gt; 80%)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] font-bold text-amber-700 uppercase">Model Disagreement / Uncertain</span>
          <span className="text-2xl font-extrabold text-amber-700">{hazardStats.disagreement}</span>
          <span className="block text-[10px] text-amber-600 mt-0.5">Reduced confidence flags active</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="block text-[11px] font-bold text-rose-700 uppercase">Severe / Critical Threats</span>
          <span className="text-2xl font-extrabold text-rose-700">{hazardStats.criticalRisks}</span>
          <span className="block text-[10px] text-rose-600 mt-0.5">High immediate priority</span>
        </div>
      </div>

      {/* Source Precedence Hierarchy Explainer Card */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Layers className="w-4 h-4 text-purple-600" />
          <span>Scientific Fusion Precedence Hierarchy &amp; Confidence Calculation</span>
        </div>
        <p className="text-slate-600 leading-relaxed text-[11px]">
          Conflicting signals resolve via weighted scientific hierarchy: Official RSMC warnings override numerical forecasts; satellite observation radiometry confirms or refutes convective initiation. When satellite measurements refute numerical model storm forecasts, system automatically marks <strong>"Model disagreement / uncertain forecast"</strong> and reduces composite confidence below 50%.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
            <span className="block text-[10px] font-extrabold text-purple-900 uppercase">Tier 1 (1.00)</span>
            <span className="text-[11px] font-bold text-slate-800">Official Warnings</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
            <span className="block text-[10px] font-extrabold text-blue-900 uppercase">Tier 2 (0.85)</span>
            <span className="text-[11px] font-bold text-slate-800">Direct In-Situ Obs</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
            <span className="block text-[10px] font-extrabold text-indigo-900 uppercase">Tier 3 (0.70)</span>
            <span className="text-[11px] font-bold text-slate-800">Satellite Radiometry</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
            <span className="block text-[10px] font-extrabold text-slate-900 uppercase">Tier 4 (0.50)</span>
            <span className="text-[11px] font-bold text-slate-800">Numerical NWP</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
            <span className="block text-[10px] font-extrabold text-emerald-900 uppercase">Tier 5 (0.30)</span>
            <span className="text-[11px] font-bold text-slate-800">Model Anomaly AI</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
            <span className="block text-[10px] font-extrabold text-slate-600 uppercase">Tier 6 (0.15)</span>
            <span className="text-[11px] font-bold text-slate-700">Sample / User Data</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'FUSED_HAZARDS' ? (
        /* Fused Hazards View */
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Fused Multi-Source Hazard Feed ({filteredRecords.length})
              </h3>
              <p className="text-xs text-slate-500">
                Cross-referenced hazard events scored with multi-evidence breakdown.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Hazard Type Filter */}
              <select
                value={selectedHazard}
                onChange={(e) => setSelectedHazard(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Hazard Categories (10)</option>
                <option value="HEAVY_RAIN">Heavy Rain</option>
                <option value="EXTREME_TEMP">Extreme Temp</option>
                <option value="STRONG_WIND">Strong Wind</option>
                <option value="SEVERE_STORM">Severe Storm</option>
                <option value="CYCLONE">Cyclone</option>
                <option value="FLOOD_RISK">Flood Risk</option>
                <option value="HEATWAVE">Heatwave</option>
                <option value="COLD_WAVE">Cold Wave</option>
                <option value="DROUGHT_DEFICIT">Drought Deficit</option>
                <option value="TSUNAMI_RISK">Tsunami Risk</option>
              </select>

              {/* Agreement Status Filter */}
              <select
                value={selectedAgreement}
                onChange={(e) => setSelectedAgreement(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Agreement Statuses</option>
                <option value="HIGH_AGREEMENT">High Agreement</option>
                <option value="MODERATE_AGREEMENT">Moderate Agreement</option>
                <option value="DISAGREEMENT">Model Disagreement</option>
                <option value="SINGLE_SOURCE">Single Source</option>
              </select>

              {/* Region Filter */}
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Basins / Regions</option>
                <option value="India">India / South Asia</option>
                <option value="Bay of Bengal">Bay of Bengal</option>
                <option value="Arabian Sea">Arabian Sea</option>
                <option value="Pacific">Pacific Ocean</option>
                <option value="Atlantic">Atlantic Ocean</option>
                <option value="Europe">Europe</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
              Synthesizing cross-source evidence records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No hazard records match the selected filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((rec) => {
                const isDisagreement = rec.agreement_status === 'DISAGREEMENT';
                const isHighAgreement = rec.agreement_status === 'HIGH_AGREEMENT';

                return (
                  <div
                    key={rec.fusion_id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isDisagreement
                        ? 'bg-amber-50/40 border-amber-300'
                        : rec.risk_level === 'CRITICAL'
                        ? 'bg-rose-50/30 border-rose-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                            {rec.hazard_type.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              rec.risk_level === 'CRITICAL'
                                ? 'bg-rose-700 text-white'
                                : rec.risk_level === 'SEVERE'
                                ? 'bg-orange-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {rec.risk_level}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {rec.forecast_window}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {rec.target_name} ({rec.region})
                        </h4>
                      </div>

                      {/* Confidence Score Pill */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Confidence</span>
                        <span
                          className={`text-sm font-extrabold ${
                            rec.confidence_score >= 80
                              ? 'text-emerald-700'
                              : rec.confidence_score >= 50
                              ? 'text-blue-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {rec.confidence_score}%
                        </span>
                      </div>
                    </div>

                    {/* Agreement Status Banner */}
                    <div
                      className={`p-2 rounded-lg text-xs flex items-start gap-2 border ${
                        isDisagreement
                          ? 'bg-amber-100/80 border-amber-300 text-amber-900 font-semibold'
                          : isHighAgreement
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {isDisagreement ? (
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {isDisagreement ? 'MODEL DISAGREEMENT / UNCERTAIN FORECAST' : rec.agreement_status.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[11px] leading-relaxed mt-0.5">{rec.agreement_message}</p>
                      </div>
                    </div>

                    {/* Multi-Source Breakdown List */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Cross-Verifying Sources ({rec.sources_breakdown.length})
                      </span>
                      {rec.sources_breakdown.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                              {src.category}
                            </span>
                            <span className="text-slate-700 truncate font-medium text-[11px]">
                              {src.source_name}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              src.status === 'CONFIRMING'
                                ? 'text-emerald-700 bg-emerald-50'
                                : src.status === 'CONTRADICTING'
                                ? 'text-rose-700 bg-rose-50'
                                : 'text-slate-600 bg-slate-100'
                            }`}
                          >
                            {src.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveRecordModal(rec)}
                        className="font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Source Breakdown
                      </button>

                      {onSelectCoordinate && (
                        <button
                          type="button"
                          onClick={() => onSelectCoordinate(rec.latitude, rec.longitude)}
                          className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                        >
                          Locate ({rec.latitude.toFixed(1)}°, {rec.longitude.toFixed(1)}°)
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 4-Way Comparison Matrix View */
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              4-Way Intelligence Comparison Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Side-by-side empirical alignment: Excel Prototype / Ground-Truth vs Satellite Observation vs Live NWP Forecast vs Dual-Evidence Anomaly Engine.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                  <th className="p-3 rounded-tl-xl">Target Station</th>
                  <th className="p-3">Excel Historical Ground-Truth</th>
                  <th className="p-3">Satellite Observation Layer</th>
                  <th className="p-3">Live Numerical Forecast</th>
                  <th className="p-3">Model Anomaly Engine</th>
                  <th className="p-3 rounded-tr-xl">Synthesized Diagnosis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {comparisonMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {/* Target Station */}
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {row.location_name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {row.region} ({row.latitude.toFixed(1)}°, {row.longitude.toFixed(1)}°)
                      </span>
                    </td>

                    {/* Excel Ground Truth */}
                    <td className="p-3 bg-indigo-50/30">
                      {row.excel_historical ? (
                        <div className="space-y-0.5">
                          <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900">
                            {row.excel_historical.dataset_label}
                          </span>
                          <p className="text-slate-800 font-bold">{row.excel_historical.recorded_value}</p>
                          <p className="text-[10px] text-slate-500">{row.excel_historical.anomaly_type}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No prototype record</span>
                      )}
                    </td>

                    {/* Satellite Observation */}
                    <td className="p-3 bg-blue-50/30">
                      <div className="space-y-0.5">
                        <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">
                          {row.satellite_observation.satellite} ({row.satellite_observation.product})
                        </span>
                        <p className="text-slate-800 font-bold">{row.satellite_observation.value}</p>
                        <p className="text-[10px] text-slate-600 leading-tight">
                          {row.satellite_observation.interpretation}
                        </p>
                      </div>
                    </td>

                    {/* Live Numerical Forecast */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                          {row.live_forecast.model}
                        </span>
                        <p className="text-slate-800 font-bold">{row.live_forecast.predicted_value}</p>
                        <p className="text-[10px] text-slate-500">
                          Normal: {row.live_forecast.climatological_normal}
                        </p>
                      </div>
                    </td>

                    {/* Model-Derived Anomaly */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            row.model_anomaly.tier === 'SEVERE'
                              ? 'bg-orange-100 text-orange-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {row.model_anomaly.tier}
                        </span>
                        <p className="text-slate-800 font-bold">
                          Z: {row.model_anomaly.z_score}, IQR: {row.model_anomaly.iqr_deviation}
                        </p>
                      </div>
                    </td>

                    {/* Diagnosis */}
                    <td className="p-3">
                      <span
                        className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded mb-1 ${
                          row.agreement === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.agreement}
                      </span>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        {row.diagnosis}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deep-Dive Modal for Fused Record */}
      {activeRecordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                  {activeRecordModal.hazard_type.replace(/_/g, ' ')} • {activeRecordModal.risk_level}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {activeRecordModal.target_name} ({activeRecordModal.region})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecordModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Composite Probability:</span>
                  <span className="font-bold text-slate-900">{activeRecordModal.probability_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Cross-Source Confidence:</span>
                  <span className="font-bold text-purple-700">{activeRecordModal.confidence_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Agreement Verdict:</span>
                  <span className="font-bold text-slate-800">{activeRecordModal.agreement_status}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Source Evidence Breakdown
                </h4>
                {activeRecordModal.sources_breakdown.map((src, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200 space-y-1 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{src.source_name}</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        Weight {src.weight.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{src.value}</p>
                    <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                      <span>Status: {src.status}</span>
                      <span>Tier: {src.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveRecordModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
