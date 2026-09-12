import React, { useState } from 'react';
import { Sliders, Search, RefreshCw, Globe, AlertCircle } from 'lucide-react';
import { GridCell } from '../types.ts';

interface GridControlsProps {
  resolution: number;
  onResolutionChange: (res: number) => void;
  onNearestCellFound: (cell: GridCell) => void;
  totalCells: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export const GridControls: React.FC<GridControlsProps> = ({
  resolution,
  onResolutionChange,
  onNearestCellFound,
  totalCells,
  isLoading,
  onRefresh,
}) => {
  const [searchLat, setSearchLat] = useState<string>('');
  const [searchLon, setSearchLon] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState<boolean>(false);

  const handleCoordinateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    const lat = parseFloat(searchLat);
    const lon = parseFloat(searchLon);

    if (isNaN(lat) || isNaN(lon)) {
      setSearchError('Please provide valid numerical coordinates.');
      return;
    }

    if (lat < -90 || lat > 90) {
      setSearchError('Latitude must be between -90° and +90°.');
      return;
    }

    if (lon < -180 || lon > 180) {
      setSearchError('Longitude must be between -180° and +180°.');
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/grid/nearest?lat=${lat}&lon=${lon}&resolution=${resolution}`);
      const data = await res.json();
      if (data.status === 'success' && data.nearest_cell) {
        onNearestCellFound(data.nearest_cell);
      } else {
        setSearchError('No matching cell found for coordinates.');
      }
    } catch {
      setSearchError('Failed to query backend grid service.');
    } finally {
      setSearching(false);
    }
  };

  const resolutionOptions = [
    { value: 5, label: '5° High Res', desc: '~2,592 cells' },
    { value: 10, label: '10° Medium-Range', desc: '~684 cells (Standard)' },
    { value: 15, label: '15° Synoptic', desc: '~312 cells' },
    { value: 20, label: '20° Global Fast', desc: '~180 cells' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="grid-controls-panel">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Global Grid Matrix Configuration</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
          title="Reload grid matrix from /api/grid"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          Sync
        </button>
      </div>

      {/* Resolution Selector */}
      <div className="mb-5">
        <label className="text-xs font-medium text-slate-700 block mb-2">
          Grid Spatial Resolution (Δ Lat/Lon Step)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {resolutionOptions.map((opt) => {
            const isSelected = resolution === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onResolutionChange(opt.value)}
                disabled={isLoading}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coordinates Locator Form */}
      <div>
        <label className="text-xs font-medium text-slate-700 flex items-center gap-1 mb-2">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          Locate Global Coordinate Cell
        </label>
        <form onSubmit={handleCoordinateSearch} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                placeholder="Lat (-90 to +90)"
                value={searchLat}
                onChange={(e) => setSearchLat(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="Lon (-180 to +180)"
                value={searchLon}
                onChange={(e) => setSearchLon(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={searching || !searchLat || !searchLon}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            {searching ? 'Querying /api/grid/nearest...' : 'Locate Cell On Map'}
          </button>

          {searchError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
