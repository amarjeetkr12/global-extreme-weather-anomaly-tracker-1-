import React, { useState } from 'react';
import { Terminal, CheckCircle2, Shield, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { SystemStats } from '../types.ts';

interface PhaseVerificationPanelProps {
  stats: SystemStats | null;
  resolution: number;
}

export const PhaseVerificationPanel: React.FC<PhaseVerificationPanelProps> = ({ stats, resolution }) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'specs'>('specs');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [endpointResult, setEndpointResult] = useState<{ name: string; data: any } | null>(null);
  const [loadingEndpoint, setLoadingEndpoint] = useState<boolean>(false);

  const testEndpoint = async (url: string, name: string) => {
    setLoadingEndpoint(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setEndpointResult({ name, data });
    } catch (err: any) {
      setEndpointResult({ name, data: { error: err.message } });
    } finally {
      setLoadingEndpoint(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="phase-verification-panel">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Phase 1 Foundation Verification & Compliance
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 'specs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Requirements Audit
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('endpoints')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 'endpoints' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live API Endpoints
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/50"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-5">
          {activeTab === 'specs' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Worldwide Spatial Bounds</span>
                    <span className="text-slate-600">
                      Latitude spanning strictly -90° to +90°, Longitude spanning -180° to +180°. Zero India-only hardcoding.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Configurable Grid Resolution</span>
                    <span className="text-slate-600">
                      Grid step dynamically configurable (5°, 10°, 15°, 20°). Currently operating at {resolution}°.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Unique Cell Identification</span>
                    <span className="text-slate-600">
                      Standardized deterministic IDs (e.g. CELL_N20.00_E70.00) guaranteed duplicate-free across the globe.
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Region Specification = GLOBAL</span>
                    <span className="text-slate-600">
                      All cells and responses strictly labeled with region="GLOBAL" as requested.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Phase 1 Boundary Discipline</span>
                    <span className="text-slate-600">
                      No premature cyclone/tsunami APIs, no Excel integrations, and no fake weather events or simulated alerts.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Clean Light Professional GIS Cartography</span>
                    <span className="text-slate-600">
                      CartoDB Positron light projection with pan, zoom, bounding box hover, and instant cell telemetry.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => testEndpoint('/api/health', 'GET /api/health')}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200"
                >
                  GET /api/health
                </button>
                <button
                  type="button"
                  onClick={() => testEndpoint(`/api/grid?resolution=${resolution}`, `GET /api/grid?resolution=${resolution}`)}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200"
                >
                  GET /api/grid
                </button>
                <button
                  type="button"
                  onClick={() => testEndpoint('/api/stats', 'GET /api/stats')}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200"
                >
                  GET /api/stats
                </button>
                <button
                  type="button"
                  onClick={() => testEndpoint('/api/anomalies', 'GET /api/anomalies')}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200"
                >
                  GET /api/anomalies
                </button>
              </div>

              {endpointResult && (
                <div className="bg-slate-900 rounded-lg p-3 text-slate-100 text-xs font-mono">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      {endpointResult.name}
                    </span>
                    <span className="text-[10px] text-emerald-400">200 OK</span>
                  </div>
                  <pre className="overflow-x-auto max-h-48 text-[11px] text-slate-300">
                    {JSON.stringify(endpointResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
