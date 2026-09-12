import React, { useState, useEffect, useMemo } from 'react';
import {
  TimeSeriesTrackedEvent,
  LiveTrackingStatus,
  EventEvolutionStage,
  HazardType,
  RiskLevel,
} from '../types.ts';
import {
  Activity,
  Radio,
  RefreshCw,
  Search,
  MapPin,
  Flame,
  CloudRain,
  Wind,
  Snowflake,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

interface TimeSeriesEventTrackerPanelProps {
  onSelectCoordinate?: (lat: number, lon: number) => void;
  onDatasetUpdated?: () => void;
}

export const TimeSeriesEventTrackerPanel: React.FC<TimeSeriesEventTrackerPanelProps> = ({
  onSelectCoordinate,
  onDatasetUpdated,
}) => {
  const [events, setEvents] = useState<TimeSeriesTrackedEvent[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveTrackingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [hazardFilter, setHazardFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});

  // Fetch events & live tracking status
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/time-series-events');
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || []);
        setLiveStatus(json.live_status || null);
      }
    } catch (e: any) {
      setErrorMsg('Failed to fetch time series events: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Trigger Live Telemetry Sync (Open-Meteo Operational Data)
  const handleSyncLive = async () => {
    setIsSyncingLive(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/time-series-events/sync-live', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setSuccessMsg(json.message || 'Live operational telemetry synchronized.');
        await fetchEvents();
        onDatasetUpdated?.();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to sync live telemetry');
      }
    } catch (e: any) {
      setErrorMsg('Sync error: ' + e.message);
    } finally {
      setIsSyncingLive(false);
    }
  };

  const toggleExpandEvent = (id: string) => {
    setExpandedEventIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper for stage colors & styling
  const getStageBadge = (stage: EventEvolutionStage) => {
    switch (stage) {
      case 'NORMAL':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: 'NORMAL',
        };
      case 'DEVELOPING':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'DEVELOPING',
        };
      case 'STRENGTHENING':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-200',
          dot: 'bg-amber-500',
          label: 'STRENGTHENING',
        };
      case 'PEAK':
        return {
          bg: 'bg-rose-600 text-white border-rose-700 font-black shadow-xs',
          dot: 'bg-white animate-ping',
          label: 'PEAK EXTREME',
        };
      case 'WEAKENING':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          label: 'WEAKENING',
        };
      case 'RESOLVED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'RESOLVED',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: stage,
        };
    }
  };

  // Helper for hazard icon
  const getHazardIcon = (hazard: string) => {
    switch (hazard) {
      case 'HEATWAVE':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'EXTREME_PRECIPITATION':
      case 'FLOOD':
        return <CloudRain className="w-4 h-4 text-blue-500" />;
      case 'HIGH_WIND':
      case 'CYCLONE':
        return <Wind className="w-4 h-4 text-teal-500" />;
      case 'COLDWAVE':
        return <Snowflake className="w-4 h-4 text-cyan-500" />;
      default:
        return <Activity className="w-4 h-4 text-amber-500" />;
    }
  };

  // Helper for provenance source styling
  const getSourceBadge = (source?: string, sourceType?: string) => {
    const srcStr = source || '';
    const srcType = sourceType || '';
    if (srcType === 'OPEN_METEO_API') {
      return {
        label: 'Open-Meteo Operational Telemetry',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    }
    if (srcStr.includes('Prototype') || srcType === 'EXCEL_PROTOTYPE') {
      return {
        label: 'Excel Prototype Feed',
        bg: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    }
    if (srcStr.includes('Sample') || srcType === 'EXCEL_SAMPLE') {
      return {
        label: 'Excel Sample Feed',
        bg: 'bg-blue-100 text-blue-800 border-blue-200',
      };
    }
    return {
      label: srcStr || 'Operator Ingestion',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Filter by hazard
      if (hazardFilter !== 'ALL' && evt.hazard_type !== hazardFilter) return false;

      // Filter by stage
      if (stageFilter !== 'ALL') {
        if (stageFilter === 'ACTIVE_ONLY') {
          if (evt.status === 'NORMAL' || evt.status === 'RESOLVED') return false;
        } else if (evt.status !== stageFilter) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLoc = (evt.location || '').toLowerCase().includes(q);
        const matchesId = (evt.event_id || '').toLowerCase().includes(q);
        const matchesHazard = (evt.hazard_type || '').toLowerCase().includes(q);
        return matchesLoc || matchesId || matchesHazard;
      }

      return true;
    });
  }, [events, hazardFilter, stageFilter, searchQuery]);

  const STAGES_PIPELINE: EventEvolutionStage[] = [
    'NORMAL',
    'DEVELOPING',
    'STRENGTHENING',
    'PEAK',
    'WEAKENING',
    'RESOLVED',
  ];

  return (
    <div className="space-y-5" id="time-series-event-tracker-panel">
      {/* Top Banner: Operational Tracker Status & Live Ingestion Trigger */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Live Time-Series Tracker & Event Evolution Architecture
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Meteorological Event Lifecycle & Anomaly Continuity
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Maintains time-series persistence across Excel baseline datasets, incremental versions, and live operational Open-Meteo feeds. Automatically traces events through mathematical progression stages from emergence to resolution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSyncLive}
              disabled={isSyncingLive}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Radio className={`w-4 h-4 ${isSyncingLive ? 'animate-pulse' : ''}`} />
              {isSyncingLive ? 'Ingesting Open-Meteo Telemetry...' : 'Sync Live Telemetry (Open-Meteo)'}
            </button>

            <button
              type="button"
              onClick={fetchEvents}
              disabled={isLoading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Refresh Event Registry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Monitored Locations</span>
            <span className="text-xl font-bold text-white mt-0.5 block">
              {liveStatus?.active_locations || liveStatus?.locations_under_monitoring || new Set(events.map((e) => e.location)).size}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Cross-dataset continuity
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tracked Events</span>
            <span className="text-xl font-bold text-blue-400 mt-0.5 block">
              {events.length}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {events.filter((e) => e.status !== 'NORMAL' && e.status !== 'RESOLVED').length} active evolutions
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Peak Extreme Events</span>
            <span className="text-xl font-bold text-rose-400 mt-0.5 block">
              {events.filter((e) => e.status === 'PEAK').length}
            </span>
            <span className="text-[10px] text-rose-300/80 mt-0.5 block">Critical threshold exceeded</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Last Operational Sync</span>
            <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
              {liveStatus?.last_sync_timestamp ? new Date(liveStatus.last_sync_timestamp).toLocaleTimeString() : 'Ready'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Open-Meteo + Excel feeds</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-700 font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search location, hazard, event ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Hazard:</span>
              <select
                value={hazardFilter}
                onChange={(e) => setHazardFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Hazards</option>
                <option value="HEATWAVE">Heatwave</option>
                <option value="EXTREME_PRECIPITATION">Extreme Rain</option>
                <option value="HIGH_WIND">High Wind</option>
                <option value="COLDWAVE">Coldwave</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Evolution Stage:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Stages</option>
                <option value="ACTIVE_ONLY">Active Only (Developing → Peak)</option>
                <option value="PEAK">Peak Only</option>
                <option value="DEVELOPING">Developing</option>
                <option value="STRENGTHENING">Strengthening</option>
                <option value="WEAKENING">Weakening</option>
                <option value="RESOLVED">Resolved</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>

            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
              {filteredEvents.length} events
            </span>
          </div>
        </div>

        {/* Pipeline Stage Legend */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-[10px]">
          <span className="font-bold text-slate-500 uppercase tracking-wider">Evolution Pipeline:</span>
          {STAGES_PIPELINE.map((stage, idx) => {
            const badge = getStageBadge(stage);
            return (
              <div key={stage} className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-md border font-bold ${badge.bg}`}>
                  {stage}
                </span>
                {idx < STAGES_PIPELINE.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-slate-400" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No tracked meteorological events match your filter</p>
            <p className="text-[11px] text-slate-400">
              Try adjusting the hazard or stage filters, or click "Sync Live Telemetry" to pull fresh Open-Meteo observations.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const stageStyle = getStageBadge(evt.status);
            const sourceInfo = getSourceBadge(evt.source, evt.source_type);
            const isExpanded = !!expandedEventIds[evt.event_id];
            const currentStageIdx = STAGES_PIPELINE.indexOf(evt.status);

            return (
              <div
                key={evt.event_id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                {/* Event Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1.5 rounded-xl bg-slate-100 flex items-center justify-center">
                        {getHazardIcon(evt.hazard_type)}
                      </div>
                      <span className="text-xs font-black text-slate-900 tracking-wide">{evt.event_id}</span>
                      <span className="text-xs font-bold text-slate-700">• {evt.location}</span>

                      {/* Hazard Type Badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 uppercase tracking-wider">
                        {evt.hazard_type.replace('_', ' ')}
                      </span>

                      {/* Current Evolution Stage Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1.5 ${stageStyle.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageStyle.dot}`} />
                          {stageStyle.label}
                        </span>
                      </div>

                      {/* Risk Level Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          evt.risk === 'CRITICAL'
                            ? 'bg-rose-600 text-white'
                            : evt.risk === 'SEVERE'
                            ? 'bg-rose-100 text-rose-800'
                            : evt.risk === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {evt.risk}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => onSelectCoordinate?.(evt.latitude, evt.longitude)}
                        className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {evt.latitude}°N, {evt.longitude}°E
                      </button>
                      <span>• Lead: Day +{evt.forecast_lead_day}</span>
                      <span>• Confidence: {Math.round(evt.confidence * 100)}%</span>
                      <span className="text-slate-400">• Updated: {new Date(evt.last_update).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Provenance Badge & Expand Toggle */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold border ${sourceInfo.bg}`}>
                      {sourceInfo.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExpandEvent(evt.event_id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{evt.history.length} Timeline Entries</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Core Quantitative Metrics & Visual Pipeline */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Physical Numbers Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Current Reading</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {evt.current_value} {evt.unit}
                      </div>
                      <span className="text-[10px] text-slate-400">{evt.affected_variable}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Historical Baseline</span>
                      <div className="text-lg font-bold text-slate-600 mt-0.5">
                        {evt.historical_baseline} {evt.unit}
                      </div>
                      <span className="text-[10px] text-slate-400">Climatological norm</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Physical Anomaly</span>
                      <div
                        className={`text-lg font-bold mt-0.5 ${
                          evt.anomaly_value >= 4.0
                            ? 'text-rose-600'
                            : evt.anomaly_value > 0
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {evt.anomaly_value > 0 ? `+${evt.anomaly_value}` : evt.anomaly_value} {evt.unit}
                      </div>
                      <span className="text-[10px] text-slate-400">Departure from normal</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Evolution Stage</span>
                      <div className="text-sm font-extrabold text-slate-800 mt-1 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${stageStyle.dot}`} />
                        {evt.status}
                      </div>
                      <span className="text-[10px] text-slate-400">Progress step {currentStageIdx + 1} of 6</span>
                    </div>
                  </div>

                  {/* Visual Stage Progress Stepper */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <span>Event Lifecycle Progression</span>
                      <span>Stage: {evt.status}</span>
                    </div>

                    <div className="grid grid-cols-6 gap-1">
                      {STAGES_PIPELINE.map((stage, sIdx) => {
                        const isCompleted = sIdx < currentStageIdx;
                        const isCurrent = sIdx === currentStageIdx;

                        return (
                          <div key={stage} className="space-y-1">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isCurrent
                                  ? stage === 'PEAK'
                                    ? 'bg-rose-600 shadow-xs'
                                    : 'bg-blue-600'
                                  : isCompleted
                                  ? 'bg-slate-400'
                                  : 'bg-slate-200'
                              }`}
                            />
                            <span
                              className={`block text-[9px] truncate text-center font-bold ${
                                isCurrent
                                  ? 'text-blue-700 font-extrabold'
                                  : isCompleted
                                  ? 'text-slate-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable Historical Evolution Timeline */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Complete Event Transition Timeline & Provenance Audit
                        </h4>
                        <span className="text-[10px] text-slate-400">Strict chronological order</span>
                      </div>

                      <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pl-1">
                        {evt.history.map((entry, hIdx) => {
                          const entryBadge = getStageBadge(entry.stage);
                          const entrySource = getSourceBadge(entry.source, entry.source_type);

                          return (
                            <div key={entry.entry_id || hIdx} className="relative flex items-start gap-3 pl-6">
                              <div
                                className={`w-3 h-3 rounded-full border-2 border-white absolute left-1.5 top-1.5 z-10 ${
                                  entry.stage === 'PEAK'
                                    ? 'bg-rose-600 ring-2 ring-rose-300'
                                    : entry.stage === 'DEVELOPING' || entry.stage === 'STRENGTHENING'
                                    ? 'bg-blue-600'
                                    : 'bg-slate-400'
                                }`}
                              />

                              <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.2 rounded-md font-bold text-[10px] ${entryBadge.bg}`}>
                                      {entry.stage}
                                    </span>
                                    <span className={`px-2 py-0.2 rounded-md text-[9px] font-semibold border ${entrySource.bg}`}>
                                      {entrySource.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-700 font-medium pt-0.5">
                                  {entry.details}
                                </p>

                                <div className="text-[10px] text-slate-500 flex items-center gap-3 pt-1 border-t border-slate-200/60 mt-1">
                                  {entry.temperature_val !== undefined && (
                                    <span>
                                      Temp: <strong>{entry.temperature_val}°C</strong> ({entry.temperature_anomaly && entry.temperature_anomaly > 0 ? '+' : ''}{entry.temperature_anomaly}°)
                                    </span>
                                  )}
                                  {entry.rainfall_val !== undefined && (
                                    <span>Rain: <strong>{entry.rainfall_val}mm</strong></span>
                                  )}
                                  {entry.wind_val !== undefined && (
                                    <span>Wind: <strong>{entry.wind_val}km/h</strong></span>
                                  )}
                                  <span>Risk: <strong>{entry.risk}</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
