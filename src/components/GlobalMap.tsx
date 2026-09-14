import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  GridCell,
  WeatherAnomaly,
  CycloneEvent,
  TsunamiEvent,
  TrackedWeatherEvent,
  WeatherData,
} from '../types.ts';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Waves,
  Wind,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Radio,
  Activity,
  Flame,
  CloudRain,
  Maximize2,
  Minimize2,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Filter,
  Satellite,
} from 'lucide-react';

interface GlobalMapProps {
  cells: GridCell[];
  anomalies: WeatherAnomaly[];
  cyclones: CycloneEvent[];
  tsunamis: TsunamiEvent[];
  events: TrackedWeatherEvent[];
  selectedCell: GridCell | null;
  onSelectCell: (cell: GridCell) => void;
  activeRegionFilter: 'ALL' | 'GLOBAL' | 'INDIA';
  onRegionChange?: (region: 'ALL' | 'GLOBAL' | 'INDIA') => void;
  onRefreshData?: () => Promise<void> | void;
  isRefreshing?: boolean;
  weather?: WeatherData | null;
  realtimeStreamActive?: boolean;
  focusLocation?: { lat: number; lon: number; label: string } | null;
}

export const GlobalMap: React.FC<GlobalMapProps> = ({
  cells,
  anomalies,
  cyclones,
  tsunamis,
  events,
  selectedCell,
  onSelectCell,
  activeRegionFilter,
  onRegionChange,
  onRefreshData,
  isRefreshing = false,
  weather,
  realtimeStreamActive = false,
  focusLocation = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const anomalyLayerRef = useRef<L.LayerGroup | null>(null);
  const cycloneLayerRef = useRef<L.LayerGroup | null>(null);
  const tsunamiLayerRef = useRef<L.LayerGroup | null>(null);
  const eventLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedHighlightRef = useRef<L.CircleMarker | null>(null);
  const liveRadarLayerRef = useRef<L.TileLayer | null>(null);
  const liveSatelliteLayerRef = useRef<L.TileLayer | null>(null);

  // Map sizing
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Layer Visibility
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [showCyclones, setShowCyclones] = useState<boolean>(true);
  const [showTsunamis, setShowTsunamis] = useState<boolean>(true);
  const [showEvents, setShowEvents] = useState<boolean>(true);

  // Upcoming Weather Stream Mode
  const [streamLayerMode, setStreamLayerMode] = useState<'ALL' | 'HEAT' | 'RAIN' | 'WIND' | 'CYCLONE'>('ALL');

  // Upcoming Prediction Timeline Slider (Day 0 to Day 7)
  const [timeMode, setTimeMode] = useState<'PAST' | 'PRESENT' | 'FUTURE'>('PRESENT');
  const [forecastLeadDay, setForecastLeadDay] = useState<number>(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x or 2x

  // Automatic Live Stream Update Engine
  const [isAutoUpdateActive, setIsAutoUpdateActive] = useState<boolean>(true);
  const [updateIntervalSec, setUpdateIntervalSec] = useState<number>(30);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [satelliteLayerActive, setSatelliteLayerActive] = useState<boolean>(false);
  const [radarLayerActive, setRadarLayerActive] = useState<boolean>(false);
  const [lastLayerRefresh, setLastLayerRefresh] = useState<string | null>(null);

  // Cursor coordinates
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Sub-region quick focus
  const [indiaSubRegion, setIndiaSubRegion] = useState<'FULL' | 'NORTH' | 'WEST' | 'SOUTH' | 'EAST'>('FULL');
  const [isDrawerDismissed, setIsDrawerDismissed] = useState<boolean>(false);
  const nearbyRadiusKm = 500;

  const distanceKm = (lat: number, lon: number, target: { lat: number; lon: number }) => {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const dLat = toRadians(lat - target.lat);
    const dLon = toRadians(lon - target.lon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(target.lat)) * Math.cos(toRadians(lat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isNearby = (lat: number, lon: number) => !focusLocation || distanceKm(lat, lon, focusLocation) <= nearbyRadiusKm;

  // Reset drawer dismissal when selected cell changes
  useEffect(() => {
    setIsDrawerDismissed(false);
  }, [selectedCell]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 16,
      zoomControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelDebounceTime: 30,
      wheelPxPerZoomLevel: 90,
      zoomAnimation: true,
      fadeAnimation: true,
      worldCopyJump: true,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 0.8,
    });

    // Satellite imagery keeps weather activity readable while the reference layer
    // preserves the world map's country outlines and place labels.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community • Open-Meteo & IMD Telemetry',
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 19,
      pane: 'overlayPane',
    }).addTo(map);

    // Near-real-time NASA satellite imagery and precipitation radar overlays.
    // Refreshing these layers keeps the map live without recreating weather markers.
    const installSatelliteLayer = () => {
      const observationDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const nextLayer = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${observationDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        {
          attribution: '&copy; NASA Worldview / GIBS (near-real-time satellite)',
          maxZoom: 9,
          opacity: 0.5,
          pane: 'overlayPane',
        }
      ).addTo(map);
      liveSatelliteLayerRef.current?.removeFrom(map);
      liveSatelliteLayerRef.current = nextLayer;
      setSatelliteLayerActive(true);
      setLastLayerRefresh(new Date().toISOString());
    };

    const refreshRadarLayer = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!response.ok) return;
        const weatherMaps = (await response.json()) as { radar?: { past?: Array<{ path: string }> } };
        const latestRadar = weatherMaps.radar?.past?.at(-1);
        if (!latestRadar || !mapInstanceRef.current) return;

        const nextLayer = L.tileLayer(
          `https://tilecache.rainviewer.com${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`,
          {
            attribution: '&copy; RainViewer live weather radar',
            maxZoom: 10,
            opacity: 0.55,
            pane: 'overlayPane',
          }
        ).addTo(mapInstanceRef.current);
        liveRadarLayerRef.current?.removeFrom(mapInstanceRef.current);
        liveRadarLayerRef.current = nextLayer;
        setRadarLayerActive(true);
        setLastLayerRefresh(new Date().toISOString());
      } catch {
        // The satellite basemap remains available when a public radar feed is offline.
      }
    };

    installSatelliteLayer();
    void refreshRadarLayer();
    const liveLayerRefreshTimer = window.setInterval(() => {
      installSatelliteLayer();
      void refreshRadarLayer();
    }, 10 * 60 * 1000);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    gridLayerRef.current = L.layerGroup().addTo(map);
    anomalyLayerRef.current = L.layerGroup().addTo(map);
    cycloneLayerRef.current = L.layerGroup().addTo(map);
    tsunamiLayerRef.current = L.layerGroup().addTo(map);
    eventLayerRef.current = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Math.round(e.latlng.lat * 100) / 100,
        lon: Math.round(e.latlng.lng * 100) / 100,
      });
    });

    map.on('mouseout', () => setCursorCoords(null));

    mapInstanceRef.current = map;

    return () => {
      window.clearInterval(liveLayerRefreshTimer);
      liveRadarLayerRef.current = null;
      liveSatelliteLayerRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Invalidate map size when expanded/collapsed
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Sync Regional Pan/Zoom with activeRegionFilter
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeRegionFilter === 'INDIA') {
      map.flyTo([22.5, 82.0], 5, { duration: 1.2 });
    } else if (activeRegionFilter === 'GLOBAL') {
      map.flyTo([20, 0], 2, { duration: 1.2 });
    }
  }, [activeRegionFilter]);

  useEffect(() => {
    if (!focusLocation || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([focusLocation.lat, focusLocation.lon], 6, { duration: 1.2 });
  }, [focusLocation]);

  // Pan to India sub-regions
  const flyToIndiaSubRegion = (region: 'FULL' | 'NORTH' | 'WEST' | 'SOUTH' | 'EAST') => {
    setIndiaSubRegion(region);
    onRegionChange?.('INDIA');
    const map = mapInstanceRef.current;
    if (!map) return;

    switch (region) {
      case 'NORTH':
        map.flyTo([29.5, 77.2], 6, { duration: 1.0 });
        break;
      case 'WEST':
        map.flyTo([21.2, 72.8], 6, { duration: 1.0 });
        break;
      case 'SOUTH':
        map.flyTo([13.0, 78.5], 6, { duration: 1.0 });
        break;
      case 'EAST':
        map.flyTo([22.5, 87.5], 6, { duration: 1.0 });
        break;
      case 'FULL':
      default:
        map.flyTo([22.5, 82.0], 5, { duration: 1.0 });
        break;
    }
  };

  const flyToWorldwide = () => {
    onRegionChange?.('GLOBAL');
    mapInstanceRef.current?.flyTo([20, 0], 2, { duration: 1.2 });
  };

  // --- AUTOMATED LIVE STREAMING ENGINE ("automatically live update hote rahe") ---
  const triggerLiveSync = useCallback(async () => {
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      setLastSyncedTime(new Date().toLocaleTimeString());
      setSyncToastMessage(`⚡ Weather Stream Synchronized: Live Open-Meteo & IMD observations updated (${new Date().toLocaleTimeString()})`);
      setTimeout(() => setSyncToastMessage(null), 4000);
    } catch (e: any) {
      console.warn('Auto sync error:', e);
    }
  }, [onRefreshData]);

  // Automated countdown ticker
  useEffect(() => {
    if (!isAutoUpdateActive) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setTimeout(() => {
            triggerLiveSync();
          }, 0);
          return updateIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoUpdateActive, updateIntervalSec, triggerLiveSync]);

  // Reset timer on interval change
  const handleIntervalChange = (newInterval: number) => {
    setUpdateIntervalSec(newInterval);
    setSecondsRemaining(newInterval);
  };

  // --- UPCOMING PREDICTION TIMELINE PLAYER (Day 0 -> Day 7) ---
  useEffect(() => {
    if (!isTimelinePlaying) return;

    const stepMs = playbackSpeed === 2 ? 900 : 1600;
    const interval = setInterval(() => {
      setForecastLeadDay((prev) => (prev >= 7 ? 0 : prev + 1));
    }, stepMs);

    return () => clearInterval(interval);
  }, [isTimelinePlaying, playbackSpeed]);

  // Keep the map honest about what the available feeds can represent: historical
  // event records, live observations, or forecast lead times.
  const filteredAnomalies = React.useMemo(() => {
    return anomalies.filter((a) => {
      if (timeMode === 'PAST' && new Date(a.timestamp).getTime() > Date.now()) {
        return false;
      }
      if (timeMode === 'PRESENT' && a.forecast_lead_day > 1) {
        return false;
      }
      if (timeMode === 'FUTURE' && a.forecast_lead_day < 1) {
        return false;
      }

      // When scrubbing the future timeline, show the selected forecast lead day.
      if (timeMode === 'FUTURE' && forecastLeadDay > 0 && a.forecast_lead_day !== forecastLeadDay) {
        return false;
      }

      // Filter by Stream Mode
      if (streamLayerMode === 'HEAT' && a.hazard_type !== 'HEATWAVE' && a.hazard_type !== 'COLDWAVE') return false;
      if (streamLayerMode === 'RAIN' && a.hazard_type !== 'EXTREME_PRECIPITATION') return false;
      if (streamLayerMode === 'WIND' && a.hazard_type !== 'HIGH_WIND') return false;
      if (streamLayerMode === 'CYCLONE' && a.hazard_type !== 'CYCLONE') return false;

      return true;
    });
  }, [anomalies, forecastLeadDay, streamLayerMode, timeMode]);

  // Render Grid Cells (India High-Res Nodes vs Global Cells)
  useEffect(() => {
    const layer = gridLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showGrid) return;

    cells.filter((cell) => isNearby(cell.lat, cell.lon)).forEach((cell) => {
      const isIndia = cell.region === 'INDIA';

      if (isIndia) {
        // High-Resolution India Digital Map City Marker
        const marker = L.circleMarker([cell.lat, cell.lon], {
          radius: 6,
          color: '#047857',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.9,
        });

        marker.bindTooltip(
          `<div style="font-family: system-ui; min-width: 140px; padding: 2px;">
            <div style="font-weight: 800; font-size: 12px; color: #065f46; display: flex; align-items: center; gap: 4px;">
              <span>🇮🇳</span> ${cell.node_name || cell.cell_id}
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              Coord: ${cell.lat}°N, ${cell.lon}°E
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #0284c7; margin-top: 4px;">
              ⚡ Click for Live Telemetry & 7-Day Stream
            </div>
          </div>`,
          { direction: 'top', offset: [0, -6] }
        );

        marker.on('click', () => {
          onSelectCell(cell);
        });

        marker.addTo(layer);
      } else {
        // Standard Global Grid Cell
        const marker = L.circleMarker([cell.lat, cell.lon], {
          radius: 3,
          color: '#2563eb',
          weight: 1,
          fillColor: '#60a5fa',
          fillOpacity: 0.45,
        });

        marker.bindTooltip(
          `<div style="font-family: system-ui; font-size: 11px;">
            <strong>🌍 Cell: ${cell.cell_id}</strong><br/>
            Lat: ${cell.lat}°, Lon: ${cell.lon}°<br/>
            <span style="color:#2563eb;">Click to inspect weather stream</span>
          </div>`,
          { direction: 'top', offset: [0, -4] }
        );

        marker.on('click', () => {
          onSelectCell(cell);
        });

        marker.addTo(layer);
      }
    });
  }, [cells, showGrid, onSelectCell, focusLocation]);

  // Render Extreme Anomalies Layer (Responsive to Timeline & Stream Mode)
  useEffect(() => {
    const layer = anomalyLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showAnomalies) return;

    filteredAnomalies.filter((anom) => isNearby(anom.lat, anom.lon)).forEach((anom) => {
      const color =
        anom.hazard_type === 'HEATWAVE' ? '#ef4444' :
        anom.hazard_type === 'COLDWAVE' ? '#06b6d4' :
        anom.hazard_type === 'EXTREME_PRECIPITATION' ? '#3b82f6' : '#f59e0b';

      const radius = anom.risk_level === 'CRITICAL' ? 10 : anom.risk_level === 'SEVERE' ? 8 : 6;

      const circle = L.circleMarker([anom.lat, anom.lon], {
        radius,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92,
      });

      circle.bindTooltip(
        `<div style="font-family: system-ui; font-size:12px; min-width:190px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:${color}; font-size: 13px;">${anom.hazard_type.replace('_', ' ')}</strong>
            <span style="font-size:10px; font-weight:bold; background:${color}; color:#fff; padding:1px 6px; border-radius:999px;">
              ${anom.risk_level}
            </span>
          </div>
          <div style="margin-top: 4px; font-weight: 700; color: #1e293b;">${anom.location_name}</div>
          <div style="font-size:11px; color:#475569; margin-top:2px;">
            Predicted: <strong>${anom.observed_value}${anom.unit}</strong> (Norm: ${anom.baseline_value}${anom.unit})
          </div>
          <div style="font-size:11px; color:#475569;">
            Anomaly Score: <strong>${anom.anomaly_score}/100</strong>
          </div>
          <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid #e2e8f0; font-size:10px; color:#0284c7; font-weight:700;">
            📅 Prediction Lead: Day +${anom.forecast_lead_day} (${anom.forecast_lead_day * 24}h Out)
          </div>
        </div>`
      );

      circle.addTo(layer);

      // Add a subtle pulsating radar ring for CRITICAL anomalies
      if (anom.risk_level === 'CRITICAL' || anom.risk_level === 'SEVERE') {
        L.circle([anom.lat, anom.lon], {
          radius: 90000,
          color: color,
          weight: 1,
          opacity: 0.5,
          fillColor: color,
          fillOpacity: 0.12,
        }).addTo(layer);
      }
    });
  }, [filteredAnomalies, showAnomalies, focusLocation]);

  // Render Cyclones Layer
  useEffect(() => {
    const layer = cycloneLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showCyclones) return;

    cyclones.filter((cyc) => isNearby(cyc.current_lat, cyc.current_lon)).forEach((cyc) => {
      const marker = L.circleMarker([cyc.current_lat, cyc.current_lon], {
        radius: 12,
        color: '#b91c1c',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.9,
      });

      marker.bindTooltip(
        `<div style="font-family: system-ui; font-size:12px; min-width:210px;">
          <strong style="color:#b91c1c; font-size:13px;">🌀 Cyclone ${cyc.name}</strong><br/>
          <strong>Basin:</strong> ${cyc.basin} (${cyc.type})<br/>
          <strong>Max Wind:</strong> <span style="color:#b91c1c; font-weight:800;">${cyc.max_wind_kmh} km/h</span><br/>
          <strong>Pressure:</strong> ${cyc.central_pressure_mb} hPa<br/>
          <strong>Track Heading:</strong> ${cyc.movement_direction} at ${cyc.movement_speed_kmh} km/h<br/>
          <span style="font-size:10px; color:#64748b;">Source: ${cyc.provenance}</span>
        </div>`
      );
      marker.addTo(layer);

      if (cyc.observed_track.length > 1) {
        const obsCoords: [number, number][] = cyc.observed_track.map((pt) => [pt.lat, pt.lon]);
        L.polyline(obsCoords, { color: '#dc2626', weight: 3, opacity: 0.8 }).addTo(layer);
      }

      if (cyc.forecast_track.length > 0) {
        const fcstCoords: [number, number][] = [
          [cyc.current_lat, cyc.current_lon],
          ...cyc.forecast_track.map((pt) => [pt.lat, pt.lon] as [number, number]),
        ];
        L.polyline(fcstCoords, { color: '#b91c1c', weight: 2.5, dashArray: '6, 6', opacity: 0.9 }).addTo(layer);
      }
    });
  }, [cyclones, showCyclones, focusLocation]);

  // Render Tsunamis Layer
  useEffect(() => {
    const layer = tsunamiLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showTsunamis) return;

    tsunamis.forEach((tsu) => {
      if (!isNearby(tsu.event_lat, tsu.event_lon)) return;
      const marker = L.circleMarker([tsu.event_lat, tsu.event_lon], {
        radius: 9,
        color: '#0284c7',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.85,
      });

      marker.bindTooltip(
        `<div style="font-family: system-ui; font-size:12px; min-width:190px;">
          <strong style="color:#0369a1;">🌊 ${tsu.title}</strong><br/>
          <strong>Seismic Magnitude:</strong> M ${tsu.source_earthquake.magnitude}<br/>
          <strong>Alert Level:</strong> ${tsu.alert_level}<br/>
          <strong>Threat Zones:</strong> ${tsu.coastal_threat_zones.join(', ')}
        </div>`
      );
      marker.addTo(layer);

      const quake = L.circleMarker([tsu.source_earthquake.lat, tsu.source_earthquake.lon], {
        radius: Math.max(6, Math.min(14, tsu.source_earthquake.magnitude * 2)),
        color: '#7c2d12',
        weight: 2,
        fillColor: '#fb923c',
        fillOpacity: 0.9,
      });
      quake.bindTooltip(`<strong>Earthquake M${tsu.source_earthquake.magnitude}</strong><br/>${tsu.source_earthquake.place}<br/>Depth: ${tsu.source_earthquake.depth_km} km`);
      quake.addTo(layer);
    });
  }, [tsunamis, showTsunamis, focusLocation]);

  // Render Spatio-Temporal Events
  useEffect(() => {
    const layer = eventLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showEvents) return;

    events.filter((evt) => isNearby(evt.center_lat, evt.center_lon)).forEach((evt) => {
      const circle = L.circle([evt.center_lat, evt.center_lon], {
        radius: Math.max(160000, evt.affected_cells.length * 85000),
        color: '#7c3aed',
        weight: 1.5,
        fillColor: '#a78bfa',
        fillOpacity: 0.15,
        dashArray: '4, 4',
      });

      circle.bindTooltip(
        `<div style="font-family: system-ui; font-size:11px;">
          <strong style="color:#6d28d9;">📍 Tracked Event: ${evt.event_id}</strong><br/>
          Hazard: <strong>${evt.hazard_type}</strong> | Risk: <strong>${evt.risk_level}</strong><br/>
          Confidence: ${evt.confidence_score}% | Trend: ${evt.intensity_trend}
        </div>`
      );
      circle.addTo(layer);
    });
  }, [events, showEvents, focusLocation]);

  // Selected cell highlight & pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedHighlightRef.current) {
      selectedHighlightRef.current.remove();
      selectedHighlightRef.current = null;
    }

    if (selectedCell) {
      const isIndia = selectedCell.region === 'INDIA';
      const marker = L.circleMarker([selectedCell.lat, selectedCell.lon], {
        radius: isIndia ? 10 : 8,
        color: '#2563eb',
        weight: 3,
        fillColor: '#60a5fa',
        fillOpacity: 0.9,
      }).addTo(map);

      selectedHighlightRef.current = marker;
      map.panTo([selectedCell.lat, selectedCell.lon], { animate: true });
    }
  }, [selectedCell]);

  return (
    <div
      className={`relative w-full ${
        isExpanded ? 'h-[740px]' : 'h-[550px]'
      } bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/80 shadow-md transition-all duration-300 flex flex-col`}
      id="global-map-container"
    >
      {/* 1. TOP OPERATIONAL STREAM CONTROLLER BAR */}
      <div className="z-500 bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-2.5 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Stream Status & Geographic Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  realtimeStreamActive || isAutoUpdateActive ? 'bg-emerald-400' : 'bg-amber-400'
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  realtimeStreamActive || isAutoUpdateActive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Live Stream: {isAutoUpdateActive ? 'Auto-Sync' : 'Paused'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-700/80 text-[10px] font-bold uppercase tracking-wide">
            <Satellite className={`w-3.5 h-3.5 ${satelliteLayerActive ? 'text-cyan-300' : 'text-slate-500'}`} />
            <span className={satelliteLayerActive ? 'text-cyan-200' : 'text-slate-500'}>
              Satellite {satelliteLayerActive ? 'LIVE' : 'CONNECTING'}
            </span>
            <span className="text-slate-600">/</span>
            <span className={radarLayerActive ? 'text-amber-300' : 'text-slate-500'}>
              Radar {radarLayerActive ? 'LIVE' : 'WAIT'}
            </span>
            {lastLayerRefresh && (
              <span className="text-slate-500 font-mono normal-case tracking-normal">
                {new Date(lastLayerRefresh).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Quick Region Switcher */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={flyToWorldwide}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeRegionFilter === 'GLOBAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Worldwide
            </button>

            <button
              type="button"
              onClick={() => flyToIndiaSubRegion('FULL')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeRegionFilter === 'INDIA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🇮🇳</span>
              India Map
            </button>
          </div>

          {/* India Regional Zoom Presets (visible when in India mode) */}
          {activeRegionFilter === 'INDIA' && (
            <div className="hidden sm:flex items-center gap-1 bg-emerald-950/60 p-0.5 rounded-xl border border-emerald-800/80 text-[11px]">
              <button
                type="button"
                onClick={() => flyToIndiaSubRegion('NORTH')}
                className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all ${
                  indiaSubRegion === 'NORTH' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                North
              </button>
              <button
                type="button"
                onClick={() => flyToIndiaSubRegion('WEST')}
                className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all ${
                  indiaSubRegion === 'WEST' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                West Coast
              </button>
              <button
                type="button"
                onClick={() => flyToIndiaSubRegion('SOUTH')}
                className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all ${
                  indiaSubRegion === 'SOUTH' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                South
              </button>
              <button
                type="button"
                onClick={() => flyToIndiaSubRegion('EAST')}
                className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all ${
                  indiaSubRegion === 'EAST' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                East &amp; Bay
              </button>
            </div>
          )}
        </div>

        {/* Right: Auto-Refresh Stream Controller & Manual Force Sync */}
        <div className="flex items-center gap-2">
          {/* Auto-Update Switch & Interval */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setIsAutoUpdateActive(!isAutoUpdateActive)}
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                isAutoUpdateActive ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
              title="Toggle automatic background stream refresh"
            >
              Auto: {isAutoUpdateActive ? 'ON' : 'OFF'}
            </button>

            {isAutoUpdateActive && (
              <>
                <select
                  value={updateIntervalSec}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="bg-slate-900 text-slate-200 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-slate-700 focus:outline-none"
                >
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={120}>2m</option>
                </select>
                <span className="text-[10px] text-slate-400 font-mono" title="Countdown to next stream fetch">
                  ({secondsRemaining}s)
                </span>
              </>
            )}
          </div>

          {/* Force Sync Button */}
          <button
            type="button"
            onClick={triggerLiveSync}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            title="Fetch latest Open-Meteo & IMD observations immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>

          {/* Fullscreen / Expand Height Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title={isExpanded ? 'Collapse Map' : 'Expand Map Height'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. ATMOSPHERIC STREAM LAYER MODES & TOGGLES */}
      <div className="z-500 bg-slate-950/80 backdrop-blur-md px-3 sm:px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-blue-400" />
            Stream Filter:
          </span>

          <button
            type="button"
            onClick={() => setStreamLayerMode('ALL')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              streamLayerMode === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300'
            }`}
          >
            Composite All
          </button>

          <button
            type="button"
            onClick={() => setStreamLayerMode('HEAT')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              streamLayerMode === 'HEAT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-800/70 hover:bg-slate-800 text-rose-300'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" />
            Heat &amp; Temp
          </button>

          <button
            type="button"
            onClick={() => setStreamLayerMode('RAIN')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              streamLayerMode === 'RAIN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800/70 hover:bg-slate-800 text-blue-300'
            }`}
          >
            <CloudRain className="w-3 h-3 text-blue-400" />
            Precipitation
          </button>

          <button
            type="button"
            onClick={() => setStreamLayerMode('WIND')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              streamLayerMode === 'WIND'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-800/70 hover:bg-slate-800 text-teal-300'
            }`}
          >
            <Wind className="w-3 h-3 text-teal-400" />
            High Wind
          </button>

          <button
            type="button"
            onClick={() => setStreamLayerMode('CYCLONE')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              streamLayerMode === 'CYCLONE'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-800/70 hover:bg-slate-800 text-red-300'
            }`}
          >
            <Wind className="w-3 h-3 text-red-400" />
            Cyclones
          </button>
        </div>

        {/* Layer Visibility Toggles */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              showGrid ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Nodes ({cells.length})
          </button>

          <button
            type="button"
            onClick={() => setShowAnomalies(!showAnomalies)}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              showAnomalies ? 'bg-rose-900/60 text-rose-300 border border-rose-700' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Anomalies ({filteredAnomalies.length})
          </button>

          <button
            type="button"
            onClick={() => setShowCyclones(!showCyclones)}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              showCyclones ? 'bg-red-900/60 text-red-300 border border-red-700' : 'bg-slate-800 text-slate-500'
            }`}
          >
            Cyclones ({cyclones.length})
          </button>
        </div>
      </div>

      {/* 3. LEAFLET MAP CANVAS */}
      <div className="relative flex-1 w-full min-h-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Sync Notification Toast */}
        {syncToastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-600 bg-emerald-950/95 text-emerald-200 border border-emerald-700 px-4 py-2 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <span>{syncToastMessage}</span>
          </div>
        )}

        {/* Floating Selected Node Quick Telemetry Drawer */}
        {selectedCell && !isDrawerDismissed && (
          <div className="absolute top-3 right-3 z-500 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 border border-slate-700 shadow-2xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{selectedCell.region === 'INDIA' ? '🇮🇳' : '🌍'}</span>
                  <h4 className="font-bold text-sm text-white">
                    {selectedCell.node_name || selectedCell.cell_id}
                  </h4>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Lat: {selectedCell.lat}°N, Lon: {selectedCell.lon}°E ({selectedCell.region})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerDismissed(true)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics from selected weather */}
            {weather && weather.cell_id === selectedCell.cell_id && weather.current ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Temperature</span>
                  <span className="text-base font-bold text-amber-400">
                    {weather.current.temperature}°C
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Wind Velocity</span>
                  <span className="text-base font-bold text-teal-400">
                    {weather.current.windSpeed ?? 0} km/h
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Precipitation</span>
                  <span className="text-base font-bold text-blue-400">
                    {weather.current.precipitation ?? 0} mm
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Humidity</span>
                  <span className="text-base font-bold text-indigo-400">
                    {weather.current.relativeHumidity ?? 0}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>Synchronizing live operational telemetry...</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {selectedCell.region === 'INDIA' ? '28 India Monitoring Nodes' : 'Global Synoptic Network'}
              </span>
              <a
                href="#weather-overview"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                7-Day Chart
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Bottom Coordinates & Live Cursor Status */}
        <div className="absolute bottom-3 left-3 z-500 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md flex items-center gap-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {cursorCoords ? (
                <>
                  <span className="font-bold text-white">
                    {cursorCoords.lat >= 0 ? `${cursorCoords.lat}° N` : `${Math.abs(cursorCoords.lat)}° S`}
                  </span>
                  {', '}
                  <span className="font-bold text-white">
                    {cursorCoords.lon >= 0 ? `${cursorCoords.lon}° E` : `${Math.abs(cursorCoords.lon)}° W`}
                  </span>
                </>
              ) : (
                <span className="text-slate-400">Hover map to stream coordinates</span>
              )}
            </span>
          </div>
          <div className="w-px h-3.5 bg-slate-700" />
          <span className="text-[11px] text-slate-400">
            India: <strong className="text-emerald-400">28 Nodes</strong> • Synoptic: <strong className="text-blue-400">703 Cells</strong>
          </span>
        </div>
      </div>

      {/* 4. PAST / PRESENT / FUTURE TIMELINE STREAM PLAYER */}
      <div className="z-500 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 border-t border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {/* Playback Controls & Status */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (timeMode !== 'FUTURE') {
                  setTimeMode('FUTURE');
                  setForecastLeadDay(1);
                  setIsTimelinePlaying(true);
                  return;
                }
                setIsTimelinePlaying(!isTimelinePlaying);
              }}
              className={`p-2 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${
                isTimelinePlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
              title={isTimelinePlaying ? 'Pause Forecast Stream' : 'Play Future Forecast Stream'}
            >
              {isTimelinePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsTimelinePlaying(false);
                setTimeMode('PRESENT');
                setForecastLeadDay(0);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Reset to Live Day 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">
                {timeMode === 'PAST'
                  ? 'Past: Recorded Event History'
                  : timeMode === 'PRESENT'
                    ? 'Present: Live Stream (Now)'
                    : `Future: Forecast Stream Day +${forecastLeadDay || 1} (${(forecastLeadDay || 1) * 24}h)`}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
                {filteredAnomalies.length} {timeMode === 'PAST' ? 'Recorded' : timeMode === 'PRESENT' ? 'Live' : 'Forecast'} Anomalies
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {timeMode === 'PAST'
                ? 'Previously ingested anomaly records with timestamps up to now'
                : timeMode === 'PRESENT'
                  ? 'Current Open-Meteo observations, active hazards and live telemetry'
                  : `Open-Meteo medium-range numerical forecast trajectory for Day +${forecastLeadDay || 1}`}
            </p>
          </div>
        </div>

        {/* Time mode and forecast day selector */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-center">
          {([
            { id: 'PAST', label: 'Past' },
            { id: 'PRESENT', label: 'Present' },
            { id: 'FUTURE', label: 'Future' },
          ] as const).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setIsTimelinePlaying(false);
                setTimeMode(mode.id);
                if (mode.id === 'PRESENT') setForecastLeadDay(0);
                if (mode.id === 'FUTURE' && forecastLeadDay === 0) setForecastLeadDay(1);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeMode === mode.id
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {mode.label}
            </button>
          ))}

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {[0, 1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isSelected = forecastLeadDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setIsTimelinePlaying(false);
                  setTimeMode(day === 0 ? 'PRESENT' : 'FUTURE');
                  setForecastLeadDay(day);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {day === 0 ? 'Now' : `+${day}d`}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
            className="ml-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer"
            title="Stream playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
};
