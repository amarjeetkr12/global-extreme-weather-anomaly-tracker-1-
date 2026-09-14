import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { PrimaryNavBar } from './components/PrimaryNavBar.tsx';
import { OperationalFiltersSidebar } from './components/OperationalFiltersSidebar.tsx';
import { GlobalMap } from './components/GlobalMap.tsx';
import { WeatherOverview } from './components/WeatherOverview.tsx';
import { HazardPanels } from './components/HazardPanels.tsx';
import { ForecastTrajectorySection } from './components/ForecastTrajectorySection.tsx';
import { SpatioTemporalEventsSection } from './components/SpatioTemporalEventsSection.tsx';
import { AnomalyRegistrySection } from './components/AnomalyRegistrySection.tsx';
import { AdvisoryFeedSection } from './components/AdvisoryFeedSection.tsx';
import { DataSourcePanel } from './components/DataSourcePanel.tsx';
import { PrototypeDatasetViewer } from './components/PrototypeDatasetViewer.tsx';
import { EventTimelineModal } from './components/EventTimelineModal.tsx';
import { DatasetManagementSection } from './components/DatasetManagementSection.tsx';
import { ExecutiveAiBriefingCard } from './components/ExecutiveAiBriefingCard.tsx';
import { LiveEarthObservationSection } from './components/LiveEarthObservationSection.tsx';
import { LiveIntelligenceSection } from './components/LiveIntelligenceSection.tsx';
import { OperationalDisclaimerFooter } from './components/OperationalDisclaimerFooter.tsx';
import {
  GridCell,
  WeatherData,
  WeatherAnomaly,
  CycloneEvent,
  TsunamiEvent,
  TrackedWeatherEvent,
  AlertFeedItem,
  DataSourceStatus,
  SystemStats,
  PrimaryTabId,
  OperationalFilterState,
  ExecutiveAiBriefing,
} from './types.ts';
import { NormalizedWeatherRecord } from '../server/excelDatasetAdapter.ts';
import { ShieldAlert, Wifi, RefreshCw, SlidersHorizontal } from 'lucide-react';

const DEFAULT_FILTERS: OperationalFilterState = {
  searchQuery: '',
  leadDay: 'ALL',
  atmosphericVariable: 'ALL',
  hazardRiskTier: 'ALL',
  multiModelAgreement: 'ALL',
  systemConfidence: 'ALL',
  geographicScope: 'ALL',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<PrimaryTabId>('GLOBAL_SPATIAL_MAP');
  const [filters, setFilters] = useState<OperationalFilterState>(DEFAULT_FILTERS);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  const [cells, setCells] = useState<GridCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [anomalies, setAnomalies] = useState<WeatherAnomaly[]>([]);
  const [cyclones, setCyclones] = useState<CycloneEvent[]>([]);
  const [tsunamis, setTsunamis] = useState<TsunamiEvent[]>([]);
  const [events, setEvents] = useState<TrackedWeatherEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertFeedItem[]>([]);
  const [sources, setSources] = useState<DataSourceStatus[]>([]);
  const [prototypeRecords, setPrototypeRecords] = useState<NormalizedWeatherRecord[]>([]);
  const [datasetsCount, setDatasetsCount] = useState<number>(2);
  const [nowcastCount, setNowcastCount] = useState<number>(0);
  const [stats, setStats] = useState<SystemStats | null>(null);

  const [inspectedEvent, setInspectedEvent] = useState<TrackedWeatherEvent | null>(null);

  const [activeRegionFilter, setActiveRegionFilter] = useState<'ALL' | 'GLOBAL' | 'INDIA'>('ALL');
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [realtimeStreamActive, setRealtimeStreamActive] = useState<boolean>(false);
  const [lastSystemSync, setLastSystemSync] = useState<string | null>(null);
  const systemDataRequestActive = useRef(false);

  // AI Synoptic Briefing State
  const [aiBriefing, setAiBriefing] = useState<ExecutiveAiBriefing | null>(null);
  const [isAiBriefingLoading, setIsAiBriefingLoading] = useState<boolean>(false);

  const loadAiBriefing = useCallback(async () => {
    setIsAiBriefingLoading(true);
    try {
      const res = await fetch(`/api/ai/briefing?region=${activeRegionFilter}`);
      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          setAiBriefing(data.briefing);
        }
      }
    } catch (err) {
      console.warn('AI briefing fetch warning:', err);
    } finally {
      setIsAiBriefingLoading(false);
    }
  }, [activeRegionFilter]);

  // 1. Fetch System Core Data
  const loadSystemData = useCallback(async () => {
    if (systemDataRequestActive.current) return;
    systemDataRequestActive.current = true;

    try {
      // Grid
      const gridRes = await fetch(`/api/grid?region=${activeRegionFilter}`);
      if (gridRes.ok) {
        const gridJson = await gridRes.json();
        setCells(gridJson.cells);
        setApiConnected(true);
      }

      // Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        setStats(statsJson);
      }

      // Anomalies
      const anomRes = await fetch(`/api/anomalies?region=${activeRegionFilter}`);
      if (anomRes.ok) {
        const anomJson = await anomRes.json();
        setAnomalies(anomJson.anomalies);
      }

      // Cyclones
      const cycRes = await fetch('/api/cyclones');
      if (cycRes.ok) {
        const cycJson = await cycRes.json();
        setCyclones(cycJson.cyclones);
      }

      // Tsunamis
      const tsuRes = await fetch('/api/tsunamis');
      if (tsuRes.ok) {
        const tsuJson = await tsuRes.json();
        setTsunamis(tsuJson.tsunamis);
      }

      // Events
      const evtRes = await fetch(`/api/events?region=${activeRegionFilter}`);
      if (evtRes.ok) {
        const evtJson = await evtRes.json();
        setEvents(evtJson.events);
      }

      // Alerts
      const altRes = await fetch('/api/alerts');
      if (altRes.ok) {
        const altJson = await altRes.json();
        setAlerts(altJson.alerts);
      }

      // Sources
      const srcRes = await fetch('/api/data-sources');
      if (srcRes.ok) {
        const srcJson = await srcRes.json();
        setSources(srcJson.sources);
      }

      // Prototype Datasets (Dataset A & Dataset B)
      const protoRes = await fetch('/api/datasets/prototype');
      if (protoRes.ok) {
        const protoJson = await protoRes.json();
        setPrototypeRecords(protoJson.records);
      }

      // Active Datasets Count
      const dsRes = await fetch('/api/datasets?include_archived=false');
      if (dsRes.ok) {
        const dsJson = await dsRes.json();
        setDatasetsCount(dsJson.datasets?.length ?? 2);
      }

      // Satellite Nowcasting Count
      const nowcastRes = await fetch('/api/satellite/nowcasting');
      if (nowcastRes.ok) {
        const nowcastJson = await nowcastRes.json();
        setNowcastCount(nowcastJson.count ?? 0);
      }
      setLastSystemSync(new Date().toISOString());
    } catch (e: any) {
      console.warn('System data fetch warning:', e.message);
      setApiConnected(false);
    } finally {
      systemDataRequestActive.current = false;
    }
  }, [activeRegionFilter]);

  // 2. Real-time Server-Sent Events (SSE) Stream Integration
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setRealtimeStreamActive(true);
      };

      eventSource.addEventListener('pipeline_update', () => {
        loadSystemData();
      });

      eventSource.addEventListener('dataset_update', () => {
        loadSystemData();
      });

      eventSource.addEventListener('cyclone_update', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.cyclones) setCyclones(data.cyclones);
        } catch (_) {}
      });

      eventSource.addEventListener('tsunami_update', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.tsunamis) setTsunamis(data.tsunamis);
        } catch (_) {}
      });

      eventSource.onerror = () => {
        setRealtimeStreamActive(false);
      };
    } catch (err) {
      console.warn('SSE connection failed, relying on scheduled polling');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadSystemData]);

  // Initial load & automatic 30-second background sync fallback
  useEffect(() => {
    void loadSystemData();
    const interval = setInterval(() => void loadSystemData(), 30 * 1000);
    return () => clearInterval(interval);
  }, [loadSystemData]);

  // Keep AI synthesis fresh without slowing the higher-frequency telemetry loop.
  useEffect(() => {
    void loadAiBriefing();
    const interval = setInterval(() => void loadAiBriefing(), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAiBriefing]);

  // 3. Fetch Detailed Weather For Selected Cell
  const fetchWeatherForCell = async (cell: GridCell) => {
    setSelectedCell(cell);
    setIsWeatherLoading(true);
    try {
      const res = await fetch(
        `/api/weather?lat=${cell.lat}&lon=${cell.lon}&cell_id=${cell.cell_id}&name=${encodeURIComponent(
          cell.node_name || cell.cell_id
        )}`
      );
      if (res.ok) {
        const json = await res.json();
        setWeather(json.weather);
      }
    } catch (e: any) {
      console.error('Weather load error:', e);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // Initial select: Focus on New Delhi node for first-class India visibility
  useEffect(() => {
    if (cells.length > 0 && !selectedCell) {
      const delhi = cells.find((c) => c.region === 'INDIA') || cells[0];
      fetchWeatherForCell(delhi);
    }
  }, [cells, selectedCell]);

  // Synchronize Station/City Search to active selected cell
  useEffect(() => {
    if (filters.searchQuery.trim().length >= 3 && cells.length > 0) {
      const match = cells.find(
        (c) =>
          c.node_name?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          c.cell_id.toLowerCase() === filters.searchQuery.toLowerCase()
      );
      if (match && match.cell_id !== selectedCell?.cell_id) {
        fetchWeatherForCell(match);
      }
    }
  }, [filters.searchQuery, cells, selectedCell]);

  useEffect(() => {
    const query = filters.searchQuery.trim();
    if (query.length < 3) {
      setFocusLocation(null);
      return;
    }

    const matchedCell = cells.find((cell) =>
      cell.node_name?.toLowerCase().includes(query.toLowerCase()) || cell.cell_id.toLowerCase() === query.toLowerCase()
    );
    if (matchedCell) {
      setFocusLocation({ lat: matchedCell.lat, lon: matchedCell.lon, label: matchedCell.node_name || matchedCell.cell_id });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
        const result = results[0];
        if (result) {
          setFocusLocation({ lat: Number(result.lat), lon: Number(result.lon), label: result.display_name });
        }
      } catch {
        // Keep the last map view when geocoding is unavailable.
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters.searchQuery, cells]);

  // Manual Pipeline Run
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/pipeline/run', { method: 'POST' });
      await Promise.all([loadSystemData(), loadAiBriefing()]);
      if (selectedCell) {
        await fetchWeatherForCell(selectedCell);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectCoordinate = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/grid/nearest?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const json = await res.json();
        if (json.nearest_cell) {
          fetchWeatherForCell(json.nearest_cell);
          setActiveTab('GLOBAL_SPATIAL_MAP');
        }
      }
    } catch (e) {
      console.error('Coordinate lookup failed', e);
    }
  };

  // Synchronized Filter Calculation for KPI and Counter Badges
  const filteredGridCells = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    const hasCellMatch = query !== '' && cells.some(
      (c) => c.node_name?.toLowerCase().includes(query) || c.cell_id.toLowerCase().includes(query)
    );

    return cells.filter((c) => {
      // Search
      if (hasCellMatch) {
        const matchName = c.node_name?.toLowerCase().includes(query);
        const matchId = c.cell_id.toLowerCase().includes(query);
        if (!matchName && !matchId) return false;
      }

      // Geographic Scope
      if (filters.geographicScope === 'GLOBAL_ONLY') {
        if (c.region === 'INDIA') return false;
      } else if (filters.geographicScope === 'INDIA_NORTH') {
        if (c.region !== 'INDIA' || c.lat < 24) return false;
      } else if (filters.geographicScope === 'INDIA_SOUTH') {
        if (c.region !== 'INDIA' || c.lat > 16) return false;
      } else if (filters.geographicScope === 'INDIA_EAST') {
        if (c.region !== 'INDIA' || c.lon < 84 || c.lat < 18) return false;
      } else if (filters.geographicScope === 'INDIA_WEST') {
        if (c.region !== 'INDIA' || c.lon > 75 || c.lat < 18 || c.lat > 24) return false;
      } else if (filters.geographicScope === 'INDIA_CENTRAL') {
        if (c.region !== 'INDIA' || c.lat < 20 || c.lat > 26 || c.lon < 76 || c.lon > 82) return false;
      } else if (filters.geographicScope === 'INDIA_NORTHEAST') {
        if (c.region !== 'INDIA' || c.lon < 88 || c.lat < 23) return false;
      } else if (filters.geographicScope === 'INDIA_COASTAL') {
        if (c.region !== 'INDIA') return false;
        const coastalCities = ['Mumbai', 'Chennai', 'Kolkata', 'Kochi', 'Bhubaneswar', 'Visakhapatnam'];
        if (!coastalCities.some((city) => c.node_name?.includes(city))) return false;
      }

      return true;
    });
  }, [cells, filters]);

  const matchingCounts = useMemo(() => {
    const matchingAnoms = anomalies.filter((a) => {
      if (filters.leadDay !== 'ALL' && a.forecast_lead_day.toString() !== filters.leadDay) return false;
      if (filters.hazardRiskTier !== 'ALL' && a.risk_level !== filters.hazardRiskTier) return false;
      return true;
    });

    const matchingEvts = events.filter((e) => {
      if (filters.leadDay !== 'ALL' && e.forecast_lead_day.toString() !== filters.leadDay) return false;
      if (filters.hazardRiskTier !== 'ALL' && e.risk_level !== filters.hazardRiskTier) return false;
      return true;
    });

    const matchingAlts = alerts.filter((alt) => {
      if (filters.leadDay !== 'ALL' && alt.lead_day.toString() !== filters.leadDay) return false;
      if (filters.hazardRiskTier !== 'ALL' && alt.risk_level !== filters.hazardRiskTier) return false;
      return true;
    });

    return {
      cells: filteredGridCells.length,
      anomalies: matchingAnoms.length,
      events: matchingEvts.length,
      alerts: matchingAlts.length,
    };
  }, [filteredGridCells, anomalies, events, alerts, filters]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        stats={stats}
        activeRegionFilter={activeRegionFilter}
        onFilterChange={setActiveRegionFilter}
        apiConnected={apiConnected}
        lastSystemSync={lastSystemSync}
      />

      {/* 6 Authoritative Primary Navigation Tabs */}
      <PrimaryNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          eventsCount: events.length,
          anomaliesCount: anomalies.length,
          advisoriesCount: alerts.length,
          sourcesOnline: sources.filter((s) => s.status === 'ONLINE').length,
          totalSources: sources.length,
          datasetsCount: datasetsCount,
          nowcastCount: nowcastCount,
        }}
      />

      {/* Stream connection status banner */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              realtimeStreamActive ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <Wifi
              className={`w-3.5 h-3.5 ${
                realtimeStreamActive ? 'text-emerald-600 animate-pulse' : 'text-slate-400'
              }`}
            />
            {realtimeStreamActive
              ? 'Continuous SSE Stream: Connected'
              : 'Polling Sync Mode Active'}
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            Live API polling: Smart Hash Cache &amp; Backend Scheduler Active
          </span>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
            />
            Force Sync Now
          </button>
        </div>
      </div>

      {/* Main Layout: Left Operational Filters Sidebar + Right Active View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Operational Filters (Left Side) */}
          <div
            className={`w-full lg:w-72 xl:w-80 shrink-0 ${
              mobileFilterOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <OperationalFiltersSidebar
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              matchingCount={matchingCounts}
            />
          </div>

          {/* Right Primary Tab Content */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            {/* Real-time Executive AI Synoptic Briefing */}
            <ExecutiveAiBriefingCard
              briefing={aiBriefing}
              isLoading={isAiBriefingLoading}
              onRefresh={loadAiBriefing}
              selectedRegion={activeRegionFilter}
            />

            {/* 1. GLOBAL SPATIAL MAP */}
            {activeTab === 'GLOBAL_SPATIAL_MAP' && (
              <div className="space-y-6">
                <GlobalMap
                  cells={filteredGridCells}
                  anomalies={anomalies}
                  cyclones={cyclones}
                  tsunamis={tsunamis}
                  events={events}
                  selectedCell={selectedCell}
                  onSelectCell={fetchWeatherForCell}
                  activeRegionFilter={activeRegionFilter}
                  onRegionChange={(reg) => setActiveRegionFilter(reg)}
                  onRefreshData={handleManualRefresh}
                  isRefreshing={isRefreshing}
                  weather={weather}
                  realtimeStreamActive={realtimeStreamActive}
                  focusLocation={focusLocation}
                />

                {/* Selected Cell 7-Day Weather & Medium-Range Forecast */}
                <div id="weather-overview">
                  <WeatherOverview weather={weather} isLoading={isWeatherLoading} />
                </div>

                {/* Cyclone & Tsunami Live Modules */}
                <HazardPanels
                  cyclones={cyclones}
                  tsunamis={tsunamis}
                  anomalies={anomalies}
                  events={events}
                  onSelectCoordinate={handleSelectCoordinate}
                />
              </div>
            )}

            {/* 2. LIVE EARTH OBSERVATION LAYER & SATELLITE NOWCASTING */}
            {activeTab === 'LIVE_EARTH_OBSERVATION' && (
              <LiveEarthObservationSection onSelectCoordinate={handleSelectCoordinate} />
            )}

            {/* 3. MULTI-SOURCE FUSED RISK & 4-WAY COMPARISON */}
            {activeTab === 'LIVE_INTELLIGENCE' && (
              <LiveIntelligenceSection onSelectCoordinate={handleSelectCoordinate} />
            )}

            {/* 4. FORECAST TRAJECTORY & RISK */}
            {activeTab === 'FORECAST_TRAJECTORY_RISK' && (
              <ForecastTrajectorySection
                weather={weather}
                selectedCell={selectedCell}
                isLoading={isWeatherLoading}
                filters={filters}
                onSelectCell={fetchWeatherForCell}
              />
            )}

            {/* 3. SPATIO-TEMPORAL EVENTS */}
            {activeTab === 'SPATIO_TEMPORAL_EVENTS' && (
              <SpatioTemporalEventsSection
                events={events}
                filters={filters}
                onSelectCoordinate={handleSelectCoordinate}
                onInspectEvent={(evt) => setInspectedEvent(evt)}
              />
            )}

            {/* 4. ANOMALY REGISTRY */}
            {activeTab === 'ANOMALY_REGISTRY' && (
              <AnomalyRegistrySection
                anomalies={anomalies}
                filters={filters}
                onSelectCoordinate={handleSelectCoordinate}
              />
            )}

            {/* 5. ADVISORY FEED */}
            {activeTab === 'ADVISORY_FEED' && (
              <AdvisoryFeedSection
                alerts={alerts}
                filters={filters}
                onSelectCoordinate={handleSelectCoordinate}
              />
            )}

            {/* 6. DIAGNOSTICS & QUALITY */}
            {activeTab === 'DIAGNOSTICS_QUALITY' && (
              <div className="space-y-6">
                {/* Authoritative Meteorological Provenance */}
                <DataSourcePanel
                  sources={sources}
                  onRefresh={handleManualRefresh}
                  isRefreshing={isRefreshing}
                />

                {/* Prototype & Ground-Truth Dataset Inspection */}
                <PrototypeDatasetViewer
                  records={prototypeRecords}
                  onSelectCoordinate={handleSelectCoordinate}
                />
              </div>
            )}

            {/* 7. DATASET MANAGEMENT (CRUD & Living Repositories) */}
            {activeTab === 'DATASET_MANAGEMENT' && (
              <DatasetManagementSection
                onSelectCoordinate={handleSelectCoordinate}
                onDatasetUpdated={() => {
                  loadSystemData();
                }}
              />
            )}

            {/* Operational Governance, Scientific Integrity & Agency Portals */}
            <OperationalDisclaimerFooter />
          </div>
        </div>
      </main>

      {/* Evolution Timeline Modal */}
      {inspectedEvent && (
        <EventTimelineModal
          event={inspectedEvent}
          onClose={() => setInspectedEvent(null)}
        />
      )}
    </div>
  );
}
