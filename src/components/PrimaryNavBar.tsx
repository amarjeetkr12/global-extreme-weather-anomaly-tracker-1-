import React from 'react';
import { PrimaryTabId } from '../types.ts';
import {
  Globe,
  TrendingUp,
  Activity,
  Database,
  Bell,
  ShieldCheck,
  FileSpreadsheet,
  Satellite,
  BrainCircuit,
} from 'lucide-react';

interface PrimaryNavBarProps {
  activeTab: PrimaryTabId;
  onSelectTab: (tab: PrimaryTabId) => void;
  counts?: {
    eventsCount: number;
    anomaliesCount: number;
    advisoriesCount: number;
    sourcesOnline: number;
    totalSources: number;
    datasetsCount?: number;
    nowcastCount?: number;
  };
}

export const PrimaryNavBar: React.FC<PrimaryNavBarProps> = ({
  activeTab,
  onSelectTab,
  counts,
}) => {
  const tabs: Array<{
    id: PrimaryTabId;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    {
      id: 'GLOBAL_SPATIAL_MAP',
      label: '1. GLOBAL MAP',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'LIVE_EARTH_OBSERVATION',
      label: '2. SATELLITE OBS & NOWCAST',
      icon: <Satellite className="w-4 h-4" />,
      badge: counts?.nowcastCount !== undefined ? `${counts.nowcastCount} Nowcast` : 'Orbit',
      badgeColor: 'bg-cyan-100 text-cyan-900',
    },
    {
      id: 'LIVE_INTELLIGENCE',
      label: '3. MULTI-SOURCE FUSION',
      icon: <BrainCircuit className="w-4 h-4" />,
      badge: 'Fusion',
      badgeColor: 'bg-purple-100 text-purple-900',
    },
    {
      id: 'FORECAST_TRAJECTORY_RISK',
      label: '4. FORECAST & RISK',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: '7-Day',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'SPATIO_TEMPORAL_EVENTS',
      label: '5. TRACKED EVENTS',
      icon: <Activity className="w-4 h-4" />,
      badge: counts?.eventsCount ?? 0,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'ANOMALY_REGISTRY',
      label: '6. ANOMALY REGISTRY',
      icon: <Database className="w-4 h-4" />,
      badge: counts?.anomaliesCount ?? 0,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'ADVISORY_FEED',
      label: '7. ADVISORIES & CAP',
      icon: <Bell className="w-4 h-4" />,
      badge: counts?.advisoriesCount ?? 0,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'DIAGNOSTICS_QUALITY',
      label: '8. DIAGNOSTICS & WMO',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: counts ? `${counts.sourcesOnline}/${counts.totalSources}` : 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'DATASET_MANAGEMENT',
      label: '9. DATASETS & EXCEL',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: counts?.datasetsCount !== undefined ? `${counts.datasetsCount} Datasets` : 'Editable',
      badgeColor: 'bg-indigo-100 text-indigo-900',
    },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 shadow-2xs sticky top-0 z-30" id="primary-navigation-bar">
      <div className="max-w-7xl mx-auto flex items-center overflow-x-auto no-scrollbar gap-1 py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={isActive ? 'text-blue-300' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : (tab.badgeColor || 'bg-slate-100 text-slate-700')
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
