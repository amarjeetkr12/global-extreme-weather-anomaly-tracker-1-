import React, { useState } from 'react';
import { NormalizedWeatherRecord } from '../../server/excelDatasetAdapter.ts';
import { Database, FileSpreadsheet, MapPin, Tag, ArrowUpRight, Search, Filter } from 'lucide-react';

interface PrototypeDatasetViewerProps {
  records: NormalizedWeatherRecord[];
  onSelectCoordinate: (lat: number, lon: number) => void;
}

export const PrototypeDatasetViewer: React.FC<PrototypeDatasetViewerProps> = ({
  records,
  onSelectCoordinate,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<'ALL' | 'DATASET_A' | 'DATASET_B'>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const filtered = records.filter((r) => {
    if (selectedDataset === 'DATASET_A' && !r.dataset_name.includes('Dataset A')) return false;
    if (selectedDataset === 'DATASET_B' && !r.dataset_name.includes('Dataset B')) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        r.location.toLowerCase().includes(q) ||
        (r.country && r.country.toLowerCase().includes(q)) ||
        (r.continent && r.continent.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4" id="prototype-dataset-viewer">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Prototype & Sample Datasets Ingestion</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                SAMPLE DATA • VALIDATION ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tolerant normalization adapter for Global Prototype (Dataset A) & India Sample (Dataset B)
            </p>
          </div>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDataset('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDataset === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDataset('DATASET_A')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDataset === 'DATASET_A' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Dataset A (Global)
            </button>
            <button
              type="button"
              onClick={() => setSelectedDataset('DATASET_B')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDataset === 'DATASET_B' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Dataset B (India)
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search prototype locations (e.g., Tokyo, Jaipur, London, Cairo)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} normalized records
        </span>
      </div>

      {/* Normalized Table */}
      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
            <tr>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Coordinates</th>
              <th className="px-3 py-2.5">Temp / Anom</th>
              <th className="px-3 py-2.5">Rainfall / Anom</th>
              <th className="px-3 py-2.5">Wind / Anom</th>
              <th className="px-3 py-2.5">Derived VPD</th>
              <th className="px-3 py-2.5">Provenance</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.record_id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-2.5 font-semibold text-slate-900">
                  {r.location}
                  {r.country && <span className="text-[10px] text-slate-400 block font-normal">{r.country}</span>}
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                  {r.latitude}°N, {r.longitude}°E
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-bold text-slate-800">{r.temperature}°C</span>
                  <span className={`text-[10px] ml-1.5 font-semibold ${
                    r.temperature_anomaly > 0 ? 'text-rose-600' : 'text-blue-600'
                  }`}>
                    {r.temperature_anomaly > 0 ? `+${r.temperature_anomaly}` : r.temperature_anomaly}°C
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-bold text-slate-800">{r.rainfall} mm</span>
                  <span className={`text-[10px] ml-1.5 font-semibold ${
                    r.rainfall_anomaly > 0 ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {r.rainfall_anomaly > 0 ? `+${r.rainfall_anomaly}` : r.rainfall_anomaly}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-bold text-slate-800">{r.wind_speed} km/h</span>
                  <span className={`text-[10px] ml-1.5 font-semibold ${
                    r.wind_anomaly > 0 ? 'text-teal-600' : 'text-slate-400'
                  }`}>
                    {r.wind_anomaly > 0 ? `+${r.wind_anomaly}` : r.wind_anomaly}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-600">
                  {r.vpd ? `${r.vpd} kPa` : 'N/A'}
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    {r.provenance}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectCoordinate(r.latitude, r.longitude)}
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 text-xs cursor-pointer"
                  >
                    Locate <ArrowUpRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
