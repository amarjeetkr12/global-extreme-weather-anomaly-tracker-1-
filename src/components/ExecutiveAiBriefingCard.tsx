import React, { useState } from 'react';
import { ExecutiveAiBriefing } from '../types.ts';
import { Sparkles, RefreshCw, AlertTriangle, ShieldCheck, Wind, Flame, CloudRain, ChevronDown, ChevronUp, Radio } from 'lucide-react';

interface ExecutiveAiBriefingCardProps {
  briefing: ExecutiveAiBriefing | null;
  isLoading: boolean;
  onRefresh: () => void;
  selectedRegion: string;
}

export const ExecutiveAiBriefingCard: React.FC<ExecutiveAiBriefingCardProps> = ({
  briefing,
  isLoading,
  onRefresh,
  selectedRegion,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!briefing) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="h-4 w-48 bg-slate-800 rounded mb-2" />
            <div className="h-3 w-72 bg-slate-800/60 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const alertBadgeStyles = {
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    MODERATE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    LOW: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  }[briefing.alertLevel || 'LOW'];

  const getHazardIcon = (hazard: string) => {
    const h = hazard.toUpperCase();
    if (h.includes('HEAT')) return <Flame className="w-4 h-4 text-amber-400" />;
    if (h.includes('PRECIPITATION') || h.includes('RAIN')) return <CloudRain className="w-4 h-4 text-cyan-400" />;
    if (h.includes('WIND') || h.includes('CYCLONE')) return <Wind className="w-4 h-4 text-teal-400" />;
    return <AlertTriangle className="w-4 h-4 text-orange-400" />;
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-200">
      {/* Top Header Strip */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">
                Executive Synoptic AI Meteorological Briefing
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${alertBadgeStyles}`}>
                Threat Level: {briefing.alertLevel}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                {briefing.provider === 'GEMINI_AI' ? 'Gemini 2.5 Flash' : 'Physics Rule Engine (Harmonized)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Synthesis across 731 observation nodes, IMD radar, ECMWF/GFS NWP feeds & GDACS cyclone tracking
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Refresh AI briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isExpanded ? 'Collapse briefing' : 'Expand briefing'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Headline (Always Visible) */}
      <div className="px-5 py-3.5 bg-indigo-950/30 border-b border-slate-800/40 flex items-center justify-between">
        <p className="text-sm font-semibold text-indigo-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          {briefing.headline}
        </p>
        <span className="text-[11px] text-slate-500 whitespace-nowrap ml-2">
          {new Date(briefing.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Expandable Section */}
      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Synoptic Narrative */}
          <div className="text-xs leading-relaxed text-slate-300 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/50">
            {briefing.synopticOverview}
          </div>

          {/* Key Drivers */}
          {briefing.keyDrivers && briefing.keyDrivers.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                Atmospheric Dynamics & Forcing Mechanisms
              </span>
              <div className="flex flex-wrap gap-2">
                {briefing.keyDrivers.map((driver, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700/80 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {driver}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Priority Threat Zones Grid */}
          {briefing.priorityThreatZones && briefing.priorityThreatZones.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                Primary Threat Corridors & Priority Focus Areas
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {briefing.priorityThreatZones.map((zone, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        {getHazardIcon(zone.hazard)}
                        <span>{zone.region}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {zone.riskTier}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {zone.impactDescription}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                      <span>Hazard: {zone.hazard}</span>
                      <span className="text-cyan-400 font-semibold">Lead: +{zone.leadDay}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Civil Protection Advisories */}
          {briefing.civilProtectionAdvisories && briefing.civilProtectionAdvisories.length > 0 && (
            <div className="p-3.5 bg-emerald-950/20 rounded-xl border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Civil Defense & Operational Mitigation Directives</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.civilProtectionAdvisories.map((advisory, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{advisory}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
