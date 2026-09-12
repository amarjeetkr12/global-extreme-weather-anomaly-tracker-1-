export type HazardType = 
  | 'HEATWAVE' 
  | 'COLDWAVE' 
  | 'EXTREME_PRECIPITATION' 
  | 'HIGH_WIND' 
  | 'CYCLONE' 
  | 'TSUNAMI' 
  | 'PRESSURE_ANOMALY';

export type UnifiedHazardType =
  | 'Heavy Rain'
  | 'Extreme Temperature'
  | 'Strong Wind'
  | 'Severe Storm'
  | 'Cyclone'
  | 'Flood Risk'
  | 'Heatwave'
  | 'Cold Wave'
  | 'Drought/precipitation deficit'
  | 'Tsunami Risk';

export type MultiSourceHazardCategory = UnifiedHazardType;

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';

export type DataProvenance = 
  | 'OPEN_METEO'
  | 'NOAA'
  | 'NHC'
  | 'JTWC'
  | 'IBTRACS'
  | 'IMD'
  | 'USGS'
  | 'PTWC'
  | 'GDACS'
  | 'NOAA_GOES'
  | 'EUMETSAT_METEOSAT'
  | 'JMA_HIMAWARI'
  | 'NASA_GPM'
  | 'NOAA_NESDIS'
  | 'MODEL_DERIVED'
  | 'EXCEL_PROTOTYPE'
  | 'EXCEL_SAMPLE'
  | 'CLIMATOLOGICAL_FALLBACK';

export type DataCategory = 
  | 'OBSERVED DATA' 
  | 'FORECAST DATA' 
  | 'MODEL-DERIVED DATA' 
  | 'OFFICIAL ALERT DATA' 
  | 'SATELLITE OBSERVATION'
  | 'SAMPLE DATA'
  | 'FALLBACK DATA';

export interface GridCellBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GridCell {
  cell_id: string;
  lat: number;
  lon: number;
  resolution: number;
  region: 'GLOBAL' | 'INDIA';
  node_name?: string;
  country?: string;
  continent?: string;
  bounds: GridCellBounds;
}

export interface DailyForecast {
  date: string;
  dayIndex: number; // 1 to 7
  tempMax: number;
  tempMin: number;
  tempMean: number;
  precipitation: number;
  windSpeed: number;
  windGust: number;
  relativeHumidity: number;
  surfacePressure: number;
  cloudCover: number;
  weatherCode: number;
  weatherCondition: string;
  heatIndex?: number;
  vpd?: number;
  windChill?: number;
}

export interface WeatherData {
  cell_id: string;
  lat: number;
  lon: number;
  locationName: string;
  timezone: string;
  elevation: number;
  current: {
    temperature: number;
    relativeHumidity: number;
    windSpeed: number;
    windDirection: number;
    surfacePressure: number;
    precipitation: number;
    weatherCode: number;
    weatherCondition: string;
    heatIndex: number;
    windChill: number;
    vpd: number;
    time: string;
  };
  daily: DailyForecast[];
  provenance: DataProvenance;
  dataCategory: DataCategory;
  lastUpdated: string;
  isCached?: boolean;
  cacheAgeMinutes?: number;
}

export interface AnomalyEvidence {
  statistical_zscore: number;
  robust_iqr_ratio: number;
  isolation_forest_score: number;
  climatological_deviation: number;
  persistence_days: number;
  spatial_agreement_ratio: number;
  dual_evidence_passed: boolean;
  evidence_summary?: string;
}

export interface WeatherAnomaly {
  anomaly_id: string;
  cell_id: string;
  lat: number;
  lon: number;
  region: string;
  location_name: string;
  hazard_type: HazardType;
  anomaly_score: number; // 0 - 100
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  risk_level: RiskLevel;
  confidence_score: number; // 0 - 100%
  forecast_lead_day: number; // 1 - 7
  evidence: AnomalyEvidence;
  affected_variable: string;
  observed_value: number;
  baseline_value: number;
  unit: string;
  provenance: DataProvenance;
  data_category: DataCategory;
  timestamp: string;
}

export interface CycloneTrackPoint {
  lat: number;
  lon: number;
  time: string;
  wind_speed_knots: number;
  pressure_mb?: number;
  category: string;
  type: 'OBSERVED' | 'FORECAST';
}

export interface CycloneEvent {
  cyclone_id: string;
  name: string;
  type: 'Cyclone' | 'Hurricane' | 'Typhoon' | 'Tropical Storm' | 'Tropical Depression';
  basin: 'North Indian' | 'North Atlantic' | 'Eastern Pacific' | 'Western Pacific' | 'South Pacific' | 'South Indian';
  current_lat: number;
  current_lon: number;
  max_wind_kmh: number;
  central_pressure_mb: number;
  movement_direction: string;
  movement_speed_kmh: number;
  intensity_category: string;
  status: 'ACTIVE' | 'WATCH' | 'MONITORING';
  observed_track: CycloneTrackPoint[];
  forecast_track: CycloneTrackPoint[];
  affected_regions: string[];
  risk_level: RiskLevel;
  confidence_score: number;
  provenance: DataProvenance;
  data_category: DataCategory;
  last_updated: string;
  advisory_summary: string;
}

export interface TsunamiEvent {
  tsunami_id: string;
  title: string;
  source_earthquake: {
    magnitude: number;
    depth_km: number;
    origin_time: string;
    lat: number;
    lon: number;
    place: string;
  };
  event_lat: number;
  event_lon: number;
  alert_level: 'WARNING' | 'ADVISORY' | 'WATCH' | 'INFORMATION' | 'NO_THREAT';
  status: 'OFFICIAL ALERT' | 'MONITORING' | 'RESOLVED';
  coastal_threat_zones: string[];
  max_wave_height_meters?: number;
  provenance: DataProvenance;
  data_category: DataCategory;
  is_official: boolean;
  issued_at: string;
  last_updated: string;
  details: string;
}

export interface EventHistoryPoint {
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence_score: number;
  status: string;
  affected_cell_count: number;
}

export interface TrackedWeatherEvent {
  event_id: string;
  title: string;
  hazard_type: HazardType;
  region: string;
  affected_cells: string[];
  center_lat: number;
  center_lon: number;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  risk_level: RiskLevel;
  risk_score: number; // 0 - 100 numeric
  confidence_score: number;
  confidence_reasoning?: string;
  forecast_lead_day: number;
  event_start: string;
  event_end: string;
  movement_direction: string;
  persistence_hours: number;
  intensity_trend: 'INCREASING' | 'STEADY' | 'DECREASING';
  provenance: DataProvenance;
  data_category: DataCategory;
  status: 'ACTIVE' | 'EMERGING' | 'PERSISTENT' | 'DISSIPATING';
  history?: EventHistoryPoint[];
}

export interface AlertFeedItem {
  alert_id: string;
  title: string;
  hazard_type: HazardType;
  location: string;
  lat: number;
  lon: number;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  risk_level: RiskLevel;
  confidence_score: number;
  time: string;
  is_official: boolean;
  provenance: DataProvenance;
  data_category: DataCategory;
  lead_day: number;
  action_summary: string;
}

export interface DataSourceStatus {
  source_id: string;
  name: string;
  data_type: string;
  coverage: 'GLOBAL' | 'REGIONAL' | 'OCEANIC';
  classification: 'OFFICIAL' | 'PUBLIC_API' | 'MODEL_DERIVED' | 'PROTOTYPE';
  status: 'ONLINE' | 'DELAYED' | 'UNAVAILABLE' | 'FALLBACK';
  last_successful_update: string;
  records_processed: number;
  error_message?: string;
  data_age_seconds?: number;
  is_stale?: boolean;
}

export interface SystemStats {
  status: string;
  region_coverage: string;
  global_cells_count: number;
  india_nodes_count: number;
  total_cells: number;
  active_events_count: number;
  extreme_anomalies_count: number;
  active_cyclones_count: number;
  active_tsunamis_count: number;
  high_risk_events_count: number;
  severe_events_count: number;
  sources_online_count: number;
  total_sources_count: number;
  engine_version: string;
  last_pipeline_run: string;
  connected_clients_count?: number;
}

export type PrimaryTabId =
  | 'GLOBAL_SPATIAL_MAP'
  | 'LIVE_EARTH_OBSERVATION'
  | 'LIVE_INTELLIGENCE'
  | 'FORECAST_TRAJECTORY_RISK'
  | 'SPATIO_TEMPORAL_EVENTS'
  | 'ANOMALY_REGISTRY'
  | 'ADVISORY_FEED'
  | 'DIAGNOSTICS_QUALITY'
  | 'DATASET_MANAGEMENT';

export type SatelliteProductType =
  | 'INFRARED_BRIGHTNESS_TEMP'
  | 'CLOUD_TOP_HEIGHT'
  | 'PRECIPITATION_RATE'
  | 'SEA_SURFACE_TEMP'
  | 'TOTAL_PRECIPITABLE_WATER'
  | 'CONVECTIVE_INDEX';

export interface SatelliteObservation {
  observation_id: string;
  source: string; // 'NOAA_NESDIS' | 'EUMETSAT' | 'JMA_HIMAWARI' | 'NASA_GPM' | 'NOAA_STAR'
  satellite: string; // 'GOES-16' | 'GOES-18' | 'Himawari-9' | 'Meteosat-9' | 'Meteosat-10' | 'Suomi-NPP' | 'GPM-Core'
  product: string;
  timestamp: string;
  observation_time: string;
  latitude: number;
  longitude: number;
  region: string;
  variable: SatelliteProductType;
  value: number;
  unit: string;
  resolution: string;
  quality_flag: 'VALID' | 'CALIBRATED' | 'SUSPECT' | 'DEGRADED';
  processing_status: 'L1B_CALIBRATED' | 'L2_DERIVED' | 'L3_GRIDDED' | 'NEAR_REAL_TIME';
  provenance_label: 'SATELLITE OBSERVATION';
  tile_url?: string;
  cloud_coverage_pct?: number;
  cooling_rate_c_hr?: number;
  interpretation?: string;
}

export interface NowcastEvent {
  nowcast_id: string;
  cell_id?: string;
  location_name: string;
  region: string;
  latitude: number;
  longitude: number;
  phenomenon:
    | 'RAPID_CONVECTIVE_INITIATION'
    | 'HEAVY_PRECIPITATION_BURST'
    | 'RAPID_CLOUD_COOLING'
    | 'STORM_DEVELOPMENT'
    | 'SATELLITE_THERMAL_ANOMALY';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  lead_time: 'NOWCAST (0-2h)' | 'NOWCAST (2-6h)';
  cloud_top_temp_c: number;
  cooling_rate_c_per_hour: number;
  estimated_rain_rate_mm_hr: number;
  satellite_platform: string;
  detected_at: string;
  valid_until: string;
  action_advisory: string;
  provenance_label: 'SATELLITE OBSERVATION';
}

export interface FusedEvidenceRecord {
  fusion_id: string;
  target_id: string;
  target_name: string;
  latitude: number;
  longitude: number;
  region: string;
  hazard_type: UnifiedHazardType;
  risk_level: RiskLevel;
  probability_score: number; // 0 - 100%
  confidence_score: number; // 0 - 100%
  agreement_status: 'STRONG_AGREEMENT' | 'MODERATE_AGREEMENT' | 'DISAGREEMENT';
  agreement_message: string;
  forecast_window: 'NOWCAST (0-6h)' | 'NEXT 24H' | 'DAY 2-3' | 'MEDIUM-RANGE (DAY 4-7)';
  sources_breakdown: Array<{
    source_priority: number;
    source_id: string;
    source_name: string;
    category: 'OFFICIAL WARNING' | 'DIRECT OBSERVATION' | 'SATELLITE OBSERVATION' | 'NUMERICAL FORECAST' | 'MODEL-DERIVED ANALYSIS' | 'SAMPLE DATA';
    weight: number;
    status: 'CONFIRMING' | 'NEUTRAL' | 'DIVERGENT' | 'UNAVAILABLE';
    value: string;
    timestamp: string;
  }>;
  last_updated_time: string;
}

export interface FourWayComparisonRecord {
  record_id: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  excel_historical: {
    temp: number;
    rainfall: number;
    wind: number;
    source: string;
  };
  satellite_observation: {
    ir_temp_c: number;
    precip_rate_mm_hr: number;
    sst_c?: number;
    platform: string;
    status: 'ONLINE' | 'LAST_KNOWN';
    timestamp: string;
  };
  live_forecast: {
    temp: number;
    rainfall: number;
    wind: number;
    model: string;
    timestamp: string;
  };
  model_derived_anomaly: {
    anomaly_detected: boolean;
    z_score: number;
    iqr_deviation: number;
    risk_tier: RiskLevel;
    confidence: number;
  };
  synthesis: {
    agreement: 'HIGH' | 'MODERATE' | 'DISCREPANCY';
    notes: string;
  };
}

export interface OperationalFilterState {
  searchQuery: string;
  leadDay: 'ALL' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
  atmosphericVariable: 'ALL' | 'TEMPERATURE' | 'RAINFALL' | 'WIND' | 'HUMIDITY' | 'PRESSURE' | 'HEAT';
  hazardRiskTier: 'ALL' | 'CRITICAL' | 'SEVERE' | 'HIGH' | 'MODERATE' | 'LOW';
  multiModelAgreement: 'ALL' | 'HIGH' | 'MODERATE' | 'LOW'; // HIGH >=80%, MODERATE 50-79%, LOW <50%
  systemConfidence: 'ALL' | '85' | '70' | '50';
  geographicScope:
    | 'ALL'
    | 'INDIA_NORTH'
    | 'INDIA_SOUTH'
    | 'INDIA_EAST'
    | 'INDIA_WEST'
    | 'INDIA_CENTRAL'
    | 'INDIA_NORTHEAST'
    | 'INDIA_COASTAL'
    | 'GLOBAL_ONLY';
}

export interface DataSourceTestResult {
  source_id: string;
  name: string;
  ping_ms: number;
  status: 'ONLINE' | 'DELAYED' | 'UNAVAILABLE';
  status_code: number;
  payload_size_bytes: number;
  protocol: string;
  endpoint: string;
  wmo_compliant: boolean;
  message: string;
  sample_data?: any;
  tested_at: string;
}

export interface ClassificationStandardThreshold {
  level: string;
  condition: string;
  actionOrColor: string;
}

export interface ClassificationStandardItem {
  id: string;
  category: 'HEATWAVE' | 'COLDWAVE' | 'RAINFALL' | 'CYCLONE' | 'TSUNAMI' | 'DUAL_EVIDENCE_ANOMALY';
  authority: string;
  title: string;
  description: string;
  thresholds: ClassificationStandardThreshold[];
  legal_disclaimer?: string;
}

export type DatasetType =
  | 'GLOBAL_EXTREME_WEATHER'
  | 'INDIA_EXTREME_WEATHER'
  | 'OTHER_WEATHER'
  | 'AUTO_DETECT';

export type TimeSeriesSourceType =
  | 'EXCEL_PROTOTYPE'
  | 'EXCEL_SAMPLE'
  | 'OPEN_METEO'
  | 'NOAA'
  | 'NHC'
  | 'JTWC'
  | 'IBTRACS'
  | 'IMD'
  | 'TSUNAMI_WARNING_CENTER'
  | 'OTHER_SUPPORTED_SOURCE';

export type EventEvolutionStage =
  | 'NORMAL'
  | 'DEVELOPING'
  | 'STRENGTHENING'
  | 'PEAK'
  | 'WEAKENING'
  | 'RESOLVED';

export type DatasetStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface DatasetRecord {
  record_id: string;
  location: string;
  continent?: string;
  country?: string;
  state?: string;
  district?: string;
  latitude: number;
  longitude: number;
  forecast_date: string;
  forecast_day: number; // 1 - 7
  temperature: number;
  historical_temperature: number;
  temperature_anomaly: number;
  rainfall: number;
  historical_rainfall: number;
  rainfall_anomaly: number;
  wind_speed: number;
  historical_wind: number;
  wind_anomaly: number;
  relative_humidity?: number;
  heat_index?: number;
  vpd?: number;
  wind_chill?: number;
  hazard_type?: HazardType;
  risk_level?: RiskLevel;
  status_note?: string;
  source?: string;
  source_type?: TimeSeriesSourceType;
  dataset_id?: string;
  uploaded_at?: string;
  extra_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
}

export interface DatasetVersionDiffSummary {
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
}

export interface DatasetVersion {
  version: number;
  created_at: string;
  created_by: string;
  change_summary: string;
  records_count: number;
  diff_summary?: DatasetVersionDiffSummary;
  records: DatasetRecord[];
}

export interface DatasetMetadata {
  dataset_id: string;
  dataset_name: string;
  dataset_type: DatasetType;
  uploaded_at: string;
  row_count: number;
  location_count: number;
  date_range: { start: string; end: string };
  forecast_horizon: { min_day: number; max_day: number };
  columns: string[];
  validation_status: 'VALID' | 'WARNINGS' | 'FAILED';
}

export interface Dataset {
  id: string;
  name: string;
  type: DatasetType;
  description?: string;
  source: string;
  status: DatasetStatus;
  current_version: number;
  versions: DatasetVersion[];
  records: DatasetRecord[];
  total_rows: number;
  total_locations: number;
  locations_list: string[];
  date_range: { start: string; end: string };
  created_at: string;
  updated_at: string;
  last_uploaded_by: string;
  is_system_prototype?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  dataset_id: string;
  dataset_name: string;
  record_id?: string;
  operation:
    | 'UPLOAD_DATASET'
    | 'CREATE_RECORD'
    | 'UPDATE_RECORD'
    | 'DELETE_RECORD'
    | 'NEW_VERSION'
    | 'RESTORE_VERSION'
    | 'RENAME_DATASET'
    | 'ARCHIVE_DATASET'
    | 'RESTORE_DATASET'
    | 'DELETE_DATASET';
  actor: string;
  details: string;
  diff?: {
    field?: string;
    old_value?: any;
    new_value?: any;
    summary?: string;
  };
}

export interface ValidationErrorItem {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface ValidationWarningItem {
  row: number;
  field: string;
  message: string;
}

export interface ValidationSummaryDetails {
  sheet_names: string[];
  headers: string[];
  detected_types: Record<string, string>;
  coordinate_validation: {
    valid_count: number;
    invalid_count: number;
    invalid_samples: string[];
  };
  date_validation: {
    valid_count: number;
    date_range: { start: string; end: string };
  };
  forecast_horizon: {
    detected_days: number[];
    min_day: number;
    max_day: number;
  };
  weather_variables_detected: string[];
  anomaly_variables_detected: string[];
  duplicate_count: number;
  missing_values: Record<string, number>;
  extra_columns_preserved: string[];
}

export interface DatasetValidationResult {
  valid: boolean;
  total_rows: number;
  valid_rows: number;
  errors: ValidationErrorItem[];
  warnings: ValidationWarningItem[];
  detected_type: DatasetType;
  preview_rows: DatasetRecord[];
  columns_found: string[];
  columns_missing: string[];
  details?: ValidationSummaryDetails;
}

export interface DatasetDiffItem {
  type: 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'REMOVED';
  record_id: string;
  location: string;
  forecast_date: string;
  forecast_day: number;
  old_record?: DatasetRecord;
  new_record?: DatasetRecord;
  changed_fields?: Array<{
    field: string;
    old_val: any;
    new_val: any;
  }>;
  mark?: 'DATA CHANGED';
}

export interface DatasetVersionDiffResult {
  summary: DatasetVersionDiffSummary;
  diff_items: DatasetDiffItem[];
  new_locations: string[];
  removed_locations: string[];
  new_dates: string[];
  changed_values_count: number;
}

export interface TimeSeriesEventHistoryEntry {
  entry_id: string;
  timestamp: string;
  stage: EventEvolutionStage;
  risk: RiskLevel;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  confidence: number;
  temperature_val?: number;
  temperature_anomaly?: number;
  rainfall_val?: number;
  rainfall_anomaly?: number;
  wind_val?: number;
  wind_anomaly?: number;
  affected_variable: string;
  source: string;
  source_type: TimeSeriesSourceType;
  details: string;
}

export interface TimeSeriesTrackedEvent {
  event_id: string; // e.g. EVT-001 or EVT-JAIPUR-HEATWAVE
  location: string;
  latitude: number;
  longitude: number;
  hazard_type: HazardType;
  start_time: string;
  last_update: string;
  status: EventEvolutionStage;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  risk: RiskLevel;
  confidence: number;
  forecast_lead_day: number;
  current_value: number;
  historical_baseline: number;
  anomaly_value: number;
  affected_variable: string;
  unit: string;
  source: string;
  source_type: TimeSeriesSourceType;
  dataset_id?: string;
  history: TimeSeriesEventHistoryEntry[];
}

export interface LiveTrackingStatus {
  is_active?: boolean;
  is_tracking_active?: boolean;
  last_sync_timestamp: string;
  active_locations?: number;
  locations_under_monitoring?: number;
  tracked_events_count?: number;
  total_tracked_events?: number;
  active_events_count?: number;
  peak_events_count?: number;
  severe_or_critical_count?: number;
  source_status?: Record<string, string>;
  operational_sources?: string[];
}

export interface LocationTimelinePoint {
  stage: 'HISTORICAL_BASELINE' | 'USER_UPLOADED' | 'LIVE_OBSERVED' | 'FORECAST';
  stage_label: string;
  provenance_badge: string;
  data_category: DataCategory;
  date: string;
  day_label: string;
  temperature: number;
  temp_anomaly?: number;
  rainfall: number;
  rainfall_anomaly?: number;
  wind_speed: number;
  wind_anomaly?: number;
  condition?: string;
  risk_level?: RiskLevel;
  source_citation: string;
  is_editable_user_data: boolean;
}

export interface LocationTimelineData {
  location_name: string;
  latitude: number;
  longitude: number;
  country?: string;
  timeline: LocationTimelinePoint[];
}

export interface ExecutiveAiBriefing {
  headline: string;
  synopticOverview: string;
  alertLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  priorityThreatZones: Array<{
    region: string;
    hazard: string;
    riskTier: string;
    leadDay: number;
    impactDescription: string;
  }>;
  keyDrivers: string[];
  civilProtectionAdvisories: string[];
  provider: 'GEMINI_AI' | 'METEOROLOGICAL_ENGINE';
  modelUsed?: string;
  note?: string;
  timestamp: string;
}

export interface CellAiAssessment {
  cellId: string;
  locationName: string;
  synopticDiagnosis: string;
  thermalDiscomfort: string;
  leadOutlook: string;
  recommendedMitigation: string[];
  provider: 'GEMINI_AI' | 'METEOROLOGICAL_ENGINE';
  timestamp: string;
}


