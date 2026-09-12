import React, { useState, useEffect } from 'react';
import {
  Dataset,
  DatasetVersionDiffResult,
  DatasetDiffItem,
} from '../types.ts';
import {
  GitCompare,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface DatasetVersionComparePanelProps {
  activeDataset: Dataset;
  onRestoreVersion?: (version: number) => void;
  onTriggerUploadNew?: () => void;
  onSelectCoordinate?: (lat: number, lon: number) => void;
}

export const DatasetVersionComparePanel: React.FC<DatasetVersionComparePanelProps> = ({
  activeDataset,
  onRestoreVersion,
  onTriggerUploadNew,
  onSelectCoordinate,
}) => {
  const versions = activeDataset.versions || [];
  const latestVersionNum = activeDataset.current_version;

  // Default compare: if > 1 version, compare current against previous; otherwise compare current with current
  const [versionA, setVersionA] = useState<number>(() => {
    return latestVersionNum > 1 ? latestVersionNum - 1 : 1;
  });
  const [versionB, setVersionB] = useState<number>(() => latestVersionNum);
  const [diffResult, setDiffResult] = useState<DatasetVersionDiffResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeDiffFilter, setActiveDiffFilter] = useState<'ALL' | 'CHANGES_ONLY' | 'ADDED' | 'UPDATED' | 'REMOVED'>('CHANGES_ONLY');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep versions in sync when active dataset changes
  useEffect(() => {
    const cur = activeDataset.current_version;
    setVersionB(cur);
    setVersionA(cur > 1 ? cur - 1 : 1);
  }, [activeDataset.id, activeDataset.current_version]);

  // Fetch comparison diff
  const loadComparison = async (vA: number, vB: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/datasets/${activeDataset.id}/compare-versions?versionA=${vA}&versionB=${vB}`);
      if (res.ok) {
        const json = await res.json();
        setDiffResult(json.diff);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to compare versions');
      }
    } catch (e: any) {
      setErrorMsg('Comparison error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeDataset.id && versionA && versionB) {
      loadComparison(versionA, versionB);
    }
  }, [activeDataset.id, versionA, versionB]);

  // Filtered diff items
  const filteredItems = React.useMemo(() => {
    if (!diffResult) return [];
    return diffResult.diff_items.filter((item) => {
      // Filter by type
      if (activeDiffFilter === 'CHANGES_ONLY' && item.type === 'UNCHANGED') return false;
      if (activeDiffFilter === 'ADDED' && item.type !== 'ADDED') return false;
      if (activeDiffFilter === 'UPDATED' && item.type !== 'UPDATED') return false;
      if (activeDiffFilter === 'REMOVED' && item.type !== 'REMOVED') return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLoc = (item.location || '').toLowerCase().includes(q);
        const matchesDate = (item.forecast_date || '').includes(q);
        return matchesLoc || matchesDate;
      }
      return true;
    });
  }, [diffResult, activeDiffFilter, searchQuery]);

  return (
    <div className="space-y-5" id="dataset-version-compare-panel">
      {/* Comparison Selector Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Differential Version Comparison</h3>
                <p className="text-[11px] text-slate-300">
                  Inspect record-level additions, value alterations, and removals across lifecycle releases
                </p>
              </div>
            </div>
          </div>

          {/* Version Picker Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 font-medium">Base (vA):</span>
              <select
                value={versionA}
                onChange={(e) => setVersionA(parseInt(e.target.value, 10))}
                className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({new Date(v.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-purple-400 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 font-medium">Target (vB):</span>
              <select
                value={versionB}
                onChange={(e) => setVersionB(parseInt(e.target.value, 10))}
                className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} {v.version === latestVersionNum ? '(Current Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadComparison(versionA, versionB)}
              disabled={isLoading}
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all cursor-pointer"
              title="Re-run Diff Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Informative banner if only 1 version exists */}
        {versions.length <= 1 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-purple-950/30 p-3 rounded-xl border border-purple-900/50">
            <div className="flex items-center gap-2 text-purple-200">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Baseline Version v1 Active:</strong> Upload an incremental update or revised Excel dataset to trigger differential change detection.
              </span>
            </div>
            {onTriggerUploadNew && (
              <button
                type="button"
                onClick={onTriggerUploadNew}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shrink-0 cursor-pointer shadow-xs"
              >
                Upload v2 Now
              </button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-purple-600 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Comparing Version {versionA} against Version {versionB}...
        </div>
      )}

      {/* Diff Results Overview */}
      {diffResult && !isLoading && (
        <div className="space-y-4">
          {/* Summary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setActiveDiffFilter('ADDED')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeDiffFilter === 'ADDED'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white hover:bg-emerald-50/50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Added Records</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  +NEW
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                +{diffResult.summary.added}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Introduced in v{versionB}</p>
            </div>

            <div
              onClick={() => setActiveDiffFilter('UPDATED')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeDiffFilter === 'UPDATED'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white hover:bg-amber-50/50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Updated Records</span>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[9px] font-bold">
                  DATA CHANGED
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-800 mt-1">
                ~{diffResult.summary.updated}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{diffResult.changed_values_count} altered fields</p>
            </div>

            <div
              onClick={() => setActiveDiffFilter('REMOVED')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeDiffFilter === 'REMOVED'
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-white hover:bg-rose-50/50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Removed Records</span>
                <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                  -DROPPED
                </span>
              </div>
              <div className="text-2xl font-bold text-rose-800 mt-1">
                -{diffResult.summary.removed}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Missing from v{versionB}</p>
            </div>

            <div
              onClick={() => setActiveDiffFilter('ALL')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeDiffFilter === 'ALL'
                  ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Unchanged Records</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                  IDENTICAL
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                ={diffResult.summary.unchanged}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Exact matched observations</p>
            </div>
          </div>

          {/* New Locations and Dates Discovered */}
          {(diffResult.new_locations.length > 0 || diffResult.new_dates.length > 0) && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1.5">
                {diffResult.new_locations.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-purple-900 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" />
                      New Geographical Locations Detected ({diffResult.new_locations.length}):
                    </span>
                    {diffResult.new_locations.map((loc) => (
                      <span key={loc} className="px-2 py-0.5 rounded-md bg-purple-200/80 text-purple-900 font-semibold text-[11px]">
                        {loc}
                      </span>
                    ))}
                  </div>
                )}
                {diffResult.new_dates.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-purple-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      New Forecast Dates Detected ({diffResult.new_dates.length}):
                    </span>
                    {diffResult.new_dates.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded-md bg-purple-200/80 text-purple-900 font-semibold text-[11px]">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {versionA !== activeDataset.current_version && onRestoreVersion && (
                <button
                  type="button"
                  onClick={() => onRestoreVersion(versionA)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  Roll Back to v{versionA}
                </button>
              )}
            </div>
          )}

          {/* Table Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveDiffFilter('CHANGES_ONLY')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeDiffFilter === 'CHANGES_ONLY'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Changes Only ({diffResult.summary.added + diffResult.summary.updated + diffResult.summary.removed})
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffFilter('UPDATED')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeDiffFilter === 'UPDATED'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Updated (~{diffResult.summary.updated})
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffFilter('ADDED')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeDiffFilter === 'ADDED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Added (+{diffResult.summary.added})
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffFilter('REMOVED')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeDiffFilter === 'REMOVED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Removed (-{diffResult.summary.removed})
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeDiffFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Records ({diffResult.diff_items.length})
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter by location or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Differential Detailed Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Diff Status</th>
                    <th className="py-3 px-3">Location & Coordinates</th>
                    <th className="py-3 px-3">Date / Day</th>
                    <th className="py-3 px-3">Changed Values & Physical Metrics (vA → vB)</th>
                    <th className="py-3 px-3 text-right">Anomaly Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        {versionA === versionB
                          ? 'Base and Target versions are identical (v' + versionA + '). Select different versions above to view differentials.'
                          : 'No differential records found for this filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const isAdded = item.type === 'ADDED';
                      const isUpdated = item.type === 'UPDATED';
                      const isRemoved = item.type === 'REMOVED';
                      const isUnchanged = item.type === 'UNCHANGED';

                      const newRec = item.new_record;
                      const oldRec = item.old_record;
                      const recForCoords = newRec || oldRec;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isAdded
                              ? 'bg-emerald-50/20'
                              : isUpdated
                              ? 'bg-amber-50/20'
                              : isRemoved
                              ? 'bg-rose-50/20'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isAdded
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isUpdated
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                    : isRemoved
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isAdded && '+ ADDED'}
                                {isUpdated && '~ UPDATED'}
                                {isRemoved && '- REMOVED'}
                                {isUnchanged && '= UNCHANGED'}
                              </span>

                              {isUpdated && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
                                  DATA CHANGED
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{item.location}</div>
                            {recForCoords && (
                              <button
                                type="button"
                                onClick={() => onSelectCoordinate?.(recForCoords.latitude, recForCoords.longitude)}
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                              >
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {recForCoords.latitude}°N, {recForCoords.longitude}°E
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{item.forecast_date}</div>
                            <span className="inline-block px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[9px] font-bold mt-0.5">
                              Day +{item.forecast_day}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {isUpdated && item.changed_fields && item.changed_fields.length > 0 ? (
                              <div className="space-y-1.5">
                                {item.changed_fields.map((cf, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="inline-flex items-center gap-1.5 bg-amber-100/70 border border-amber-200 px-2 py-1 rounded-lg text-xs font-semibold mr-2 mb-1"
                                  >
                                    <span className="text-slate-600 font-bold uppercase text-[10px]">{cf.field}:</span>
                                    <span className="line-through text-slate-500 font-normal">{String(cf.old_val)}</span>
                                    <ArrowRight className="w-3 h-3 text-amber-700 shrink-0" />
                                    <span className="text-amber-900 font-bold">{String(cf.new_val)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : isAdded && newRec ? (
                              <div className="text-xs text-slate-700 flex items-center gap-3">
                                <span>Temp: <strong>{newRec.temperature}°C</strong></span>
                                <span>Rain: <strong>{newRec.rainfall}mm</strong></span>
                                <span>Wind: <strong>{newRec.wind_speed}km/h</strong></span>
                              </div>
                            ) : isRemoved && oldRec ? (
                              <div className="text-xs text-slate-400 line-through flex items-center gap-3">
                                <span>Temp: {oldRec.temperature}°C</span>
                                <span>Rain: {oldRec.rainfall}mm</span>
                                <span>Wind: {oldRec.wind_speed}km/h</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Values matched exactly between v{versionA} and v{versionB}</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {newRec ? (
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    newRec.risk_level === 'CRITICAL'
                                      ? 'bg-rose-600 text-white'
                                      : newRec.risk_level === 'SEVERE'
                                      ? 'bg-rose-100 text-rose-800'
                                      : newRec.risk_level === 'HIGH'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {newRec.risk_level}
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  Anom: {newRec.temperature_anomaly > 0 ? `+${newRec.temperature_anomaly}` : newRec.temperature_anomaly}°C
                                </div>
                              </div>
                            ) : oldRec ? (
                              <span className="text-slate-400 text-xs line-through">{oldRec.risk_level}</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
