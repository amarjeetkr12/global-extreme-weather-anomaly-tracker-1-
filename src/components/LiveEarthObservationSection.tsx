import React, { useState, useEffect, useMemo } from 'react';
import {
  SatelliteObservation,
  NowcastEvent,
  SatelliteProductType,
} from '../types.ts';
import {
  Satellite,
  Radio,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Clock,
  MapPin,
  Zap,
  CloudRain,
  Thermometer,
  Wind,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Waves,
} from 'lucide-react';

interface LiveEarthObservationSectionProps {
  onSelectCoordinate?: (lat: number, lon: number) => void;
}

export const LiveEarthObservationSection: React.FC<LiveEarthObservationSectionProps> = ({
  onSelectCoordinate,
}) => {
  const [observations, setObservations] = useState<SatelliteObservation[]>([]);
  const [nowcasts, setNowcasts] = useState<NowcastEvent[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filters
  const [selectedSatellite, setSelectedSatellite] = useState<string>('ALL');
  const [selectedVariable, setSelectedVariable] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [activePlatformModal, setActivePlatformModal] = useState<any | null>(null);

  // Timeline / Frame Animation Scrubber
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const frames = useMemo(() => {
    return [
      { label: 'T - 45 min', deltaMin: 45 },
      { label: 'T - 30 min', deltaMin: 30 },
      { label: 'T - 15 min', deltaMin: 15 },
      { label: 'T - 0 min (Live)', deltaMin: 0 },
    ];
  }, []);

  // Fetch satellite observations & nowcasts
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [obsRes, nowcastRes, platRes] = await Promise.all([
        fetch('/api/satellite/observations'),
        fetch('/api/satellite/nowcasting'),
        fetch('/api/satellite/platforms'),
      ]);

      if (obsRes.ok) {
        const obsData = await obsRes.json();
        setObservations(obsData.observations || []);
        setLastUpdated(obsData.observation_time || new Date().toISOString());
      }

      if (nowcastRes.ok) {
        const nowcastData = await nowcastRes.json();
        setNowcasts(nowcastData.nowcasts || []);
      }

      if (platRes.ok) {
        const platData = await platRes.json();
        setPlatforms(platData.platforms || []);
      }
    } catch (err) {
      console.error('Error fetching satellite observations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Frame Player Animation Interval
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
      }, 1400 / playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, frames.length]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/satellite/refresh', { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Manual satellite refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered observations
  const filteredObservations = useMemo(() => {
    return observations.filter((obs) => {
      if (selectedSatellite !== 'ALL' && obs.satellite !== selectedSatellite) return false;
      if (selectedVariable !== 'ALL' && obs.variable !== selectedVariable) return false;
      if (selectedRegion !== 'ALL') {
        const r = selectedRegion.toLowerCase();
        if (!obs.region.toLowerCase().includes(r)) return false;
      }
      return true;
    });
  }, [observations, selectedSatellite, selectedVariable, selectedRegion]);

  const uniqueSatellites = useMemo(() => {
    const set = new Set(observations.map((o) => o.satellite));
    return Array.from(set);
  }, [observations]);

  return (
    <div className="space-y-6" id="live-earth-observation-section">
      {/* Header Banner with Scientific Disclaimer & Satellite Orbit Status */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-600/90 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5" />
                SATELLITE OBSERVATION LAYER
              </span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                Geostationary ABI / SEVIRI / AHI Streams Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Real-Time Earth Observation &amp; Satellite Nowcasting
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Multi-spectral Earth-observation ingestion pipeline integrating NOAA GOES-16/18 ABI, EUMETSAT Meteosat-9 (IODC 45.5°E) &amp; Meteosat-11 (0° Prime), JMA Himawari-9 AHI, and NASA/JAXA GPM IMERG microwave-calibrated precipitation tensors.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Ingesting Satellite Passes...' : 'Sync Satellite Passes'}
            </button>
          </div>
        </div>

        {/* Prominent Scientific Disclaimer Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-amber-300/90 bg-amber-950/20 p-3 rounded-xl border border-amber-800/30">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-normal">
            <strong className="text-amber-200">Scientific Disclaimer:</strong> Satellite observations and model outputs are used for monitoring and decision-support. This system does not replace official meteorological or tsunami warnings and does not guarantee future event occurrence.
          </p>
        </div>
      </div>

      {/* Rapid 0-6h Nowcasting Alert Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                High-Frequency Satellite Nowcasting (0-6 Hours)
              </h3>
              <p className="text-xs text-slate-500">
                Detects rapid cloud convective cooling (&gt;6°C/hr), thunderstorm development, and instantaneous GPM rainfall bursts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
              NOWCAST (0-6h)
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              vs. Medium-Range (+1 to +7d)
            </span>
          </div>
        </div>

        {nowcasts.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            No rapid convective triggers detected in the current geostationary scanning cycle.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nowcasts.map((nowcast) => {
              const isCritical = nowcast.severity === 'CRITICAL';
              return (
                <div
                  key={nowcast.nowcast_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-rose-50/50 border-rose-300'
                      : 'bg-amber-50/50 border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          isCritical ? 'bg-rose-700 text-white' : 'bg-amber-700 text-white'
                        }`}
                      >
                        {nowcast.lead_time}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {nowcast.location_name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      {nowcast.satellite_platform}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 mb-2 leading-relaxed">
                    {nowcast.action_advisory}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-slate-200/60">
                    <div className="bg-white/70 p-1.5 rounded">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Cloud Top IR</span>
                      <span className="font-extrabold text-slate-800">{nowcast.cloud_top_temp_c}°C</span>
                    </div>
                    <div className="bg-white/70 p-1.5 rounded">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Cooling Rate</span>
                      <span className="font-extrabold text-rose-700">{nowcast.cooling_rate_c_per_hour}°C/h</span>
                    </div>
                    <div className="bg-white/70 p-1.5 rounded">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">GPM Rain Burst</span>
                      <span className="font-extrabold text-blue-700">{nowcast.estimated_rain_rate_mm_hr} mm/h</span>
                    </div>
                  </div>

                  {onSelectCoordinate && (
                    <button
                      type="button"
                      onClick={() => onSelectCoordinate(nowcast.latitude, nowcast.longitude)}
                      className="mt-2.5 text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      Locate coordinates on Global Spatial Map ({nowcast.latitude.toFixed(2)}°, {nowcast.longitude.toFixed(2)}°)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Observation Frame Player & Multi-Pass Animation Scrubber */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Geostationary Orbital Multi-Frame Player
              </h3>
              <p className="text-xs text-slate-500">
                Simulated 15-minute radiometer scanning cycle for atmospheric convective tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isPlaying ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause Cycle' : 'Play Loop'}
            </button>

            {/* Speed Toggle */}
            <button
              type="button"
              onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              {playbackSpeed}x Speed
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={() => setCurrentFrameIndex(frames.length - 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              title="Jump to Live"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Frame Scrubber */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {frames.map((frame, idx) => {
            const isSelected = currentFrameIndex === idx;
            return (
              <button
                key={frame.label}
                type="button"
                onClick={() => {
                  setCurrentFrameIndex(idx);
                  setIsPlaying(false);
                }}
                className={`py-2 px-3 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="block text-[10px] opacity-80 uppercase font-semibold">Frame {idx + 1}</span>
                <span>{frame.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Observation Explorer: Satellite Filter Tabs & Product Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Calibrated Satellite Observations ({filteredObservations.length})
            </h3>
            <p className="text-xs text-slate-500">
              Filtered by active orbital constellation, variable product, and geographical coverage zone.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Satellite Platform Filter */}
            <select
              value={selectedSatellite}
              onChange={(e) => setSelectedSatellite(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Satellite Platforms</option>
              {uniqueSatellites.map((sat) => (
                <option key={sat} value={sat}>
                  {sat}
                </option>
              ))}
            </select>

            {/* Variable / Product Filter */}
            <select
              value={selectedVariable}
              onChange={(e) => setSelectedVariable(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Product Variables</option>
              <option value="INFRARED_BRIGHTNESS_TEMP">Clean IR Brightness Temp (Band 13)</option>
              <option value="CLOUD_TOP_HEIGHT">Cloud Top Height (km)</option>
              <option value="PRECIPITATION_RATE">GPM IMERG Rain Rate (mm/h)</option>
              <option value="SEA_SURFACE_TEMP">Sea Surface Temp (°C)</option>
              <option value="TOTAL_PRECIPITABLE_WATER">Total Precipitable Water (TPW)</option>
            </select>

            {/* Geographical Region */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Geographical Basins</option>
              <option value="India">India &amp; South Asia</option>
              <option value="Bay of Bengal">Bay of Bengal</option>
              <option value="Arabian Sea">Arabian Sea</option>
              <option value="Western Pacific">Western Pacific</option>
              <option value="Atlantic">Atlantic Basin</option>
              <option value="Europe">Europe / Mediterranean</option>
            </select>
          </div>
        </div>

        {/* Observation Cards Grid */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            Loading satellite Earth-observation telemetry...
          </div>
        ) : filteredObservations.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            No satellite observations match the selected filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredObservations.map((obs) => {
              const isDeepConvective = obs.value <= -48;
              const isModerateConvective = obs.value <= -30 && obs.value > -48;

              return (
                <div
                  key={obs.observation_id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-all bg-white hover:shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 tracking-wider">
                        {obs.provenance_label}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        {obs.region}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const plat = platforms.find((p) => p.id === obs.satellite);
                        if (plat) setActivePlatformModal(plat);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      {obs.satellite}
                    </button>
                  </div>

                  {/* Primary Measurement Metric */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                      {obs.variable === 'INFRARED_BRIGHTNESS_TEMP'
                        ? 'IR Brightness Temp'
                        : obs.variable.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        isDeepConvective
                          ? 'text-purple-700'
                          : isModerateConvective
                          ? 'text-blue-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {obs.value} {obs.unit}
                    </span>
                  </div>

                  {/* Physical Interpretation */}
                  {obs.interpretation && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 p-2 rounded-lg border border-blue-100/60">
                      {obs.interpretation}
                    </p>
                  )}

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Nadir Resolution</span>
                      <span className="font-semibold text-slate-700">{obs.resolution}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Quality Flag</span>
                      <span className="font-semibold text-emerald-700">{obs.quality_flag} ({obs.processing_status})</span>
                    </div>
                  </div>

                  {/* Action Link to Map */}
                  {onSelectCoordinate && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">
                        Lat: {obs.latitude.toFixed(2)}°, Lon: {obs.longitude.toFixed(2)}°
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectCoordinate(obs.latitude, obs.longitude)}
                        className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        Inspect Node
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Satellite Platform Specifications Modal */}
      {activePlatformModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                  {activePlatformModal.agency}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {activePlatformModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePlatformModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1.5">
                <p>
                  <strong className="text-slate-800">Orbit Type:</strong> {activePlatformModal.orbit_type}
                  {activePlatformModal.subsatellite_longitude !== undefined && ` (${activePlatformModal.subsatellite_longitude}° Subsatellite Longitude)`}
                </p>
                <p>
                  <strong className="text-slate-800">Coverage Region:</strong> {activePlatformModal.coverage_region}
                </p>
                <p>
                  <strong className="text-slate-800">Nominal Resolution:</strong> {activePlatformModal.nominal_resolution}
                </p>
                <p>
                  <strong className="text-slate-800">Primary Radiometers:</strong> {activePlatformModal.primary_instruments?.join(', ')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-blue-900">Official Data Feed Endpoint</span>
                <p className="font-mono text-[11px] text-blue-800 break-all">
                  {activePlatformModal.official_endpoint}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActivePlatformModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
