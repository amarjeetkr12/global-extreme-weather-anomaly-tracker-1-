import React, { useState } from 'react';
import { GridCell } from '../types.ts';
import { Crosshair, ShieldCheck, CheckCircle2, Copy, Check, Info } from 'lucide-react';

interface CellInspectorProps {
  cell: GridCell | null;
  onClose: () => void;
}

export const CellInspector: React.FC<CellInspectorProps> = ({ cell, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [verifiedViaApi, setVerifiedViaApi] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!cell) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs h-full flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Crosshair className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No Cell Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          Click on any grid cell across the worldwide map to inspect its geospatial parameters and telemetry.
        </p>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(cell.cell_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyCellViaBackend = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/grid/cell/${cell.cell_id}`);
      if (res.ok) {
        setVerifiedViaApi(true);
      } else {
        setVerifiedViaApi(false);
      }
    } catch {
      setVerifiedViaApi(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between" id="cell-inspector-panel">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Global Cell Inspector</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100"
          >
            Clear
          </button>
        </div>

        {/* Cell ID & Copy */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-slate-500 block mb-1">Cell Identifier</label>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="font-mono text-xs font-semibold text-slate-900">{cell.cell_id}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-slate-400 hover:text-blue-600 ml-2 p-1 transition-colors"
              title="Copy ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Geospatial Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[11px] text-slate-500 block">Latitude Centroid</span>
            <span className="text-sm font-semibold font-mono text-slate-800">
              {cell.lat >= 0 ? `${cell.lat.toFixed(2)}° N` : `${Math.abs(cell.lat).toFixed(2)}° S`}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[11px] text-slate-500 block">Longitude Centroid</span>
            <span className="text-sm font-semibold font-mono text-slate-800">
              {cell.lon >= 0 ? `${cell.lon.toFixed(2)}° E` : `${Math.abs(cell.lon).toFixed(2)}° W`}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[11px] text-slate-500 block">Assigned Region</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 font-mono">
              {cell.region}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[11px] text-slate-500 block">Grid Step (Res)</span>
            <span className="text-sm font-semibold font-mono text-slate-800">{cell.resolution}°</span>
          </div>
        </div>

        {/* Bounding Box Coordinates */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-slate-500 block mb-1.5">Geographic Bounds</label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-400">North:</span>
              <span>{cell.bounds.north}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">South:</span>
              <span>{cell.bounds.south}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">West:</span>
              <span>{cell.bounds.west}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">East:</span>
              <span>{cell.bounds.east}°</span>
            </div>
          </div>
        </div>

        {/* Phase 1 Verification Status */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-emerald-900 block">Global Grid Standard</span>
              <span className="text-emerald-700 text-[11px]">
                Valid worldwide coordinates conforming to medium-range forecast models.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend API verification test */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={verifyCellViaBackend}
            disabled={verifying}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
          >
            {verifying ? (
              <span className="text-slate-500">Querying /api/grid...</span>
            ) : (
              <>
                <Info className="w-3.5 h-3.5 text-slate-500" />
                Verify Cell on Backend
              </>
            )}
          </button>

          {verifiedViaApi === true && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified 200 OK
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
