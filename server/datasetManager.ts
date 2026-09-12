import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
  Dataset,
  DatasetRecord,
  DatasetVersion,
  DatasetType,
  DatasetStatus,
  AuditLogEntry,
  DatasetValidationResult,
  DatasetVersionDiffResult,
  DatasetDiffItem,
  ValidationErrorItem,
  ValidationWarningItem,
  ValidationSummaryDetails,
  TimeSeriesTrackedEvent,
  TimeSeriesEventHistoryEntry,
  TimeSeriesSourceType,
  EventEvolutionStage,
  LiveTrackingStatus,
  HazardType,
  RiskLevel,
  LocationTimelineData,
  LocationTimelinePoint,
} from '../src/types.ts';
import { calculateHeatIndex, calculateVPD, calculateWindChill } from './weatherService.ts';
import { GLOBAL_PROTOTYPE_DATASET_A, INDIA_SAMPLE_DATASET_B } from './excelDatasetAdapter.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATASETS_FILE = path.join(DATA_DIR, 'datasets.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');
const EVENTS_FILE = path.join(DATA_DIR, 'time_series_events.json');

export class DatasetManager {
  private datasets: Map<string, Dataset> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private timeSeriesEvents: Map<string, TimeSeriesTrackedEvent> = new Map();
  private liveTrackingActive = true;
  private lastLiveSyncTimestamp = new Date().toISOString();
  private isInitialized = false;

  constructor() {
    this.ensureStorage();
    this.loadFromStorage();
  }

  private ensureStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[DatasetManager] Could not create data directory:', e);
    }
  }

  private loadFromStorage() {
    try {
      if (fs.existsSync(DATASETS_FILE)) {
        const raw = fs.readFileSync(DATASETS_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Dataset[];
        for (const ds of parsed) {
          this.datasets.set(ds.id, ds);
        }
        console.log(`[DatasetManager] Loaded ${this.datasets.size} datasets from disk.`);
      }

      if (fs.existsSync(AUDIT_LOGS_FILE)) {
        const rawLogs = fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8');
        this.auditLogs = JSON.parse(rawLogs) as AuditLogEntry[];
        console.log(`[DatasetManager] Loaded ${this.auditLogs.length} audit logs from disk.`);
      }

      if (fs.existsSync(EVENTS_FILE)) {
        const rawEvents = fs.readFileSync(EVENTS_FILE, 'utf-8');
        const parsedEvents = JSON.parse(rawEvents) as TimeSeriesTrackedEvent[];
        for (const evt of parsedEvents) {
          const key = `${evt.location.toLowerCase().trim()}__${evt.hazard_type}`;
          this.timeSeriesEvents.set(key, evt);
        }
        console.log(`[DatasetManager] Loaded ${this.timeSeriesEvents.size} time-series tracked events from disk.`);
      }
    } catch (err: any) {
      console.error('[DatasetManager] Failed to load data from storage:', err.message);
    }

    // Seed default datasets if empty
    if (this.datasets.size === 0) {
      this.seedDefaultDatasets();
    }
    if (this.timeSeriesEvents.size === 0) {
      this.seedDefaultEvents();
    }
    this.isInitialized = true;
  }

  private saveToStorage() {
    try {
      this.ensureStorage();
      const datasetList = Array.from(this.datasets.values());
      fs.writeFileSync(DATASETS_FILE, JSON.stringify(datasetList, null, 2), 'utf-8');
      fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(this.auditLogs.slice(-2000), null, 2), 'utf-8');
      const eventsList = Array.from(this.timeSeriesEvents.values());
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsList, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[DatasetManager] Failed to save data to storage:', err.message);
    }
  }

  /**
   * Seed Dataset A and Dataset B as fully active, editable datasets
   */
  private seedDefaultDatasets() {
    const now = new Date().toISOString();

    // 1. Seed Global Extreme Weather Anomaly Prototype (Dataset A)
    const recordsA: DatasetRecord[] = GLOBAL_PROTOTYPE_DATASET_A.map((row, idx) => {
      const lat = parseFloat(row.Latitude ?? 0);
      const lon = parseFloat(row.Longitude ?? 0);
      const temp = parseFloat(row.Temperature_C ?? 25);
      const histTemp = parseFloat(row.Historical_Temp_C ?? 22);
      const tempAnom = parseFloat(row.Temp_Anomaly_C ?? (temp - histTemp));
      const rain = parseFloat(row.Rainfall_mm ?? 0);
      const histRain = parseFloat(row.Historical_Rainfall_mm ?? 0);
      const rainAnom = parseFloat(row.Rainfall_Anomaly_mm ?? (rain - histRain));
      const wind = parseFloat(row.Wind_Speed ?? 10);
      const histWind = parseFloat(row.Historical_Wind ?? 10);
      const windAnom = parseFloat(row.Wind_Anomaly ?? (wind - histWind));
      const rh = parseFloat(row.Relative_Humidity ?? 50);

      return this.enrichRecord({
        record_id: `REC-GLB-${idx + 1}`,
        location: row.Location || 'Unknown',
        continent: row.Continent,
        country: row.Country,
        latitude: lat,
        longitude: lon,
        forecast_date: row.Forecast_Date || '2026-09-12',
        forecast_day: row.Forecast_Day || 1,
        temperature: temp,
        historical_temperature: histTemp,
        temperature_anomaly: tempAnom,
        rainfall: rain,
        historical_rainfall: histRain,
        rainfall_anomaly: rainAnom,
        wind_speed: wind,
        historical_wind: histWind,
        wind_anomaly: windAnom,
        relative_humidity: rh,
        status_note: row.Status,
        created_at: now,
        updated_at: now,
        last_modified_by: 'System Seed Initializer',
      });
    });

    const datasetA: Dataset = {
      id: 'DS-GLOBAL-PROTO-01',
      name: 'Global Extreme Weather Anomaly Prototype (Dataset A)',
      type: 'GLOBAL_EXTREME_WEATHER',
      description: 'Authoritative global prototype covering diverse climatic zones across Asia, Europe, Africa, and Oceania.',
      source: 'Global Meteorological Prototype (Editable Excel/CSV)',
      status: 'ACTIVE',
      current_version: 1,
      versions: [
        {
          version: 1,
          created_at: now,
          created_by: 'System Initializer',
          change_summary: 'Initial baseline ingestion of Global Extreme Weather Prototype.',
          records_count: recordsA.length,
          records: [...recordsA],
        },
      ],
      records: recordsA,
      total_rows: recordsA.length,
      total_locations: new Set(recordsA.map((r) => r.location)).size,
      locations_list: Array.from(new Set(recordsA.map((r) => r.location))),
      date_range: this.calculateDateRange(recordsA),
      created_at: now,
      updated_at: now,
      last_uploaded_by: 'Meteorologist (Initial Setup)',
      is_system_prototype: true,
    };

    // 2. Seed India Extreme Weather Sample Dataset (Dataset B)
    const recordsB: DatasetRecord[] = INDIA_SAMPLE_DATASET_B.map((row, idx) => {
      const lat = parseFloat(row.Latitude ?? 0);
      const lon = parseFloat(row.Longitude ?? 0);
      const temp = parseFloat(row.Temperature ?? 30);
      const histTemp = parseFloat(row.Historical_Temp ?? 28);
      const tempAnom = parseFloat(row.Temp_Anomaly ?? (temp - histTemp));
      const rain = parseFloat(row.Rainfall ?? 0);
      const histRain = parseFloat(row.Historical_Rainfall ?? 0);
      const rainAnom = parseFloat(row.Rainfall_Anomaly ?? (rain - histRain));
      const wind = parseFloat(row.Wind_Speed ?? 12);
      const histWind = parseFloat(row.Historical_Wind ?? 10);
      const windAnom = parseFloat(row.Wind_Anomaly ?? (wind - histWind));
      const rh = parseFloat(row.Relative_Humidity ?? 55);

      return this.enrichRecord({
        record_id: `REC-IND-${idx + 1}`,
        location: row.Location || 'Unknown',
        continent: 'Asia',
        country: 'India',
        state: row.State,
        district: row.District,
        latitude: lat,
        longitude: lon,
        forecast_date: row.Forecast_Date || '2026-09-12',
        forecast_day: row.Forecast_Day || 1,
        temperature: temp,
        historical_temperature: histTemp,
        temperature_anomaly: tempAnom,
        rainfall: rain,
        historical_rainfall: histRain,
        rainfall_anomaly: rainAnom,
        wind_speed: wind,
        historical_wind: histWind,
        wind_anomaly: windAnom,
        relative_humidity: rh,
        status_note: `${row.District || 'Urban'} Regional Anomaly Monitoring`,
        created_at: now,
        updated_at: now,
        last_modified_by: 'System Seed Initializer',
      });
    });

    const datasetB: Dataset = {
      id: 'DS-INDIA-SAMPLE-02',
      name: 'Extreme Weather Anomaly Sample Dataset (Dataset B - India)',
      type: 'INDIA_EXTREME_WEATHER',
      description: 'High-density Indian meteorological monitoring network covering Delhi, Mumbai, Kolkata, Chennai, Jaipur, and Ahmedabad.',
      source: 'India Meteorological Sample Feed (Editable Excel/CSV)',
      status: 'ACTIVE',
      current_version: 1,
      versions: [
        {
          version: 1,
          created_at: now,
          created_by: 'System Initializer',
          change_summary: 'Initial baseline ingestion of India Extreme Weather Sample Dataset.',
          records_count: recordsB.length,
          records: [...recordsB],
        },
      ],
      records: recordsB,
      total_rows: recordsB.length,
      total_locations: new Set(recordsB.map((r) => r.location)).size,
      locations_list: Array.from(new Set(recordsB.map((r) => r.location))),
      date_range: this.calculateDateRange(recordsB),
      created_at: now,
      updated_at: now,
      last_uploaded_by: 'Meteorologist (Initial Setup)',
      is_system_prototype: true,
    };

    this.datasets.set(datasetA.id, datasetA);
    this.datasets.set(datasetB.id, datasetB);

    this.addAuditLog({
      dataset_id: datasetA.id,
      dataset_name: datasetA.name,
      operation: 'UPLOAD_DATASET',
      actor: 'System Initializer',
      details: `Initialized default editable dataset with ${recordsA.length} records across ${datasetA.total_locations} global locations.`,
    });

    this.addAuditLog({
      dataset_id: datasetB.id,
      dataset_name: datasetB.name,
      operation: 'UPLOAD_DATASET',
      actor: 'System Initializer',
      details: `Initialized default editable dataset with ${recordsB.length} records across ${datasetB.total_locations} India locations.`,
    });

    this.saveToStorage();
  }

  /**
   * Seed default time-series tracked events with realistic evolutionary history
   */
  private seedDefaultEvents() {
    const defaultEvents: TimeSeriesTrackedEvent[] = [
      {
        event_id: 'EVT-001',
        location: 'Jaipur',
        latitude: 26.9124,
        longitude: 75.7873,
        hazard_type: 'HEATWAVE',
        start_time: '2026-09-12T08:00:00.000Z',
        last_update: '2026-09-12T14:30:00.000Z',
        status: 'PEAK',
        severity: 'extreme',
        risk: 'SEVERE',
        confidence: 94,
        forecast_lead_day: 1,
        current_value: 39.1,
        historical_baseline: 32.1,
        anomaly_value: 7.0,
        affected_variable: 'Temperature',
        unit: '°C',
        source: 'Global Extreme Weather Prototype + Open-Meteo',
        source_type: 'EXCEL_PROTOTYPE',
        dataset_id: 'DS-GLOBAL-PROTO-01',
        history: [
          {
            entry_id: 'EVT-001-H1',
            timestamp: '2026-09-12T08:00:00.000Z',
            stage: 'DEVELOPING',
            risk: 'MODERATE',
            severity: 'moderate',
            confidence: 82,
            temperature_val: 34.2,
            temperature_anomaly: 2.1,
            affected_variable: 'Temperature',
            source: 'Ground Observation / Prototype Feed',
            source_type: 'EXCEL_PROTOTYPE',
            details: '08:00 Temperature anomaly +2.1°C Risk Moderate',
          },
          {
            entry_id: 'EVT-001-H2',
            timestamp: '2026-09-12T10:00:00.000Z',
            stage: 'DEVELOPING',
            risk: 'MODERATE',
            severity: 'moderate',
            confidence: 86,
            temperature_val: 34.9,
            temperature_anomaly: 2.8,
            affected_variable: 'Temperature',
            source: 'Ground Observation / Prototype Feed',
            source_type: 'EXCEL_PROTOTYPE',
            details: '10:00 Temperature anomaly +2.8°C Risk Moderate',
          },
          {
            entry_id: 'EVT-001-H3',
            timestamp: '2026-09-12T12:00:00.000Z',
            stage: 'STRENGTHENING',
            risk: 'HIGH',
            severity: 'high',
            confidence: 91,
            temperature_val: 35.5,
            temperature_anomaly: 3.4,
            affected_variable: 'Temperature',
            source: 'Ground Observation / Prototype Feed',
            source_type: 'EXCEL_PROTOTYPE',
            details: '12:00 Temperature anomaly +3.4°C Risk High',
          },
          {
            entry_id: 'EVT-001-H4',
            timestamp: '2026-09-12T14:00:00.000Z',
            stage: 'PEAK',
            risk: 'SEVERE',
            severity: 'extreme',
            confidence: 94,
            temperature_val: 36.2,
            temperature_anomaly: 4.1,
            affected_variable: 'Temperature',
            source: 'Ground Observation / Prototype Feed',
            source_type: 'EXCEL_PROTOTYPE',
            details: '14:00 Temperature anomaly +4.1°C Risk Severe',
          },
          {
            entry_id: 'EVT-001-H5',
            timestamp: '2026-09-12T14:30:00.000Z',
            stage: 'PEAK',
            risk: 'SEVERE',
            severity: 'extreme',
            confidence: 96,
            temperature_val: 39.1,
            temperature_anomaly: 7.0,
            affected_variable: 'Temperature',
            source: 'Open-Meteo Operational Telemetry',
            source_type: 'OPEN_METEO',
            details: '14:30 Operational Telemetry Confirms Peak Heatwave (+7.0°C anomaly)',
          },
        ],
      },
      {
        event_id: 'EVT-002',
        location: 'Mumbai',
        latitude: 19.076,
        longitude: 72.8777,
        hazard_type: 'EXTREME_PRECIPITATION',
        start_time: '2026-09-12T06:00:00.000Z',
        last_update: '2026-09-12T15:00:00.000Z',
        status: 'PEAK',
        severity: 'extreme',
        risk: 'CRITICAL',
        confidence: 93,
        forecast_lead_day: 1,
        current_value: 85.0,
        historical_baseline: 18.0,
        anomaly_value: 67.0,
        affected_variable: 'Rainfall',
        unit: 'mm',
        source: 'Global Extreme Weather Prototype + IMD Radar',
        source_type: 'EXCEL_PROTOTYPE',
        dataset_id: 'DS-GLOBAL-PROTO-01',
        history: [
          {
            entry_id: 'EVT-002-H1',
            timestamp: '2026-09-12T06:00:00.000Z',
            stage: 'DEVELOPING',
            risk: 'MODERATE',
            severity: 'moderate',
            confidence: 84,
            rainfall_val: 35.0,
            rainfall_anomaly: 17.0,
            affected_variable: 'Rainfall',
            source: 'Coastal Doppler Radar',
            source_type: 'IMD',
            details: '06:00 Rainfall anomaly +17.0mm Inundation Signal',
          },
          {
            entry_id: 'EVT-002-H2',
            timestamp: '2026-09-12T09:00:00.000Z',
            stage: 'STRENGTHENING',
            risk: 'HIGH',
            severity: 'high',
            confidence: 89,
            rainfall_val: 52.0,
            rainfall_anomaly: 34.0,
            affected_variable: 'Rainfall',
            source: 'Coastal Doppler Radar',
            source_type: 'IMD',
            details: '09:00 Rainfall anomaly +34.0mm Torrential Influx',
          },
          {
            entry_id: 'EVT-002-H3',
            timestamp: '2026-09-12T12:00:00.000Z',
            stage: 'PEAK',
            risk: 'SEVERE',
            severity: 'extreme',
            confidence: 93,
            rainfall_val: 72.0,
            rainfall_anomaly: 54.0,
            affected_variable: 'Rainfall',
            source: 'Ground Weather Station',
            source_type: 'EXCEL_PROTOTYPE',
            details: '12:00 Rainfall anomaly +54.0mm Flash Flood Surge',
          },
          {
            entry_id: 'EVT-002-H4',
            timestamp: '2026-09-12T15:00:00.000Z',
            stage: 'PEAK',
            risk: 'CRITICAL',
            severity: 'extreme',
            confidence: 96,
            rainfall_val: 85.0,
            rainfall_anomaly: 67.0,
            affected_variable: 'Rainfall',
            source: 'Open-Meteo Operational Telemetry',
            source_type: 'OPEN_METEO',
            details: '15:00 Rainfall anomaly +67.0mm Red Alert Flood Stage',
          },
        ],
      },
      {
        event_id: 'EVT-003',
        location: 'Athens',
        latitude: 37.9838,
        longitude: 23.7275,
        hazard_type: 'HEATWAVE',
        start_time: '2026-09-12T09:00:00.000Z',
        last_update: '2026-09-12T14:00:00.000Z',
        status: 'STRENGTHENING',
        severity: 'extreme',
        risk: 'CRITICAL',
        confidence: 91,
        forecast_lead_day: 1,
        current_value: 41.5,
        historical_baseline: 34.2,
        anomaly_value: 7.3,
        affected_variable: 'Temperature',
        unit: '°C',
        source: 'Global Extreme Weather Prototype + NOAA Global GFS',
        source_type: 'EXCEL_PROTOTYPE',
        dataset_id: 'DS-GLOBAL-PROTO-01',
        history: [
          {
            entry_id: 'EVT-003-H1',
            timestamp: '2026-09-12T09:00:00.000Z',
            stage: 'DEVELOPING',
            risk: 'HIGH',
            severity: 'high',
            confidence: 88,
            temperature_val: 38.0,
            temperature_anomaly: 3.8,
            affected_variable: 'Temperature',
            source: 'Mediterranean Weather Net',
            source_type: 'EXCEL_PROTOTYPE',
            details: '09:00 Temperature anomaly +3.8°C Elevated Heat Stress',
          },
          {
            entry_id: 'EVT-003-H2',
            timestamp: '2026-09-12T14:00:00.000Z',
            stage: 'STRENGTHENING',
            risk: 'CRITICAL',
            severity: 'extreme',
            confidence: 91,
            temperature_val: 41.5,
            temperature_anomaly: 7.3,
            affected_variable: 'Temperature',
            source: 'NOAA GFS Operational Feed',
            source_type: 'NOAA',
            details: '14:00 Temperature anomaly +7.3°C Severe Urban Heat Dome',
          },
        ],
      },
      {
        event_id: 'EVT-004',
        location: 'Ahmedabad',
        latitude: 23.0225,
        longitude: 72.5714,
        hazard_type: 'HEATWAVE',
        start_time: '2026-09-12T10:00:00.000Z',
        last_update: '2026-09-12T15:30:00.000Z',
        status: 'STRENGTHENING',
        severity: 'high',
        risk: 'SEVERE',
        confidence: 90,
        forecast_lead_day: 1,
        current_value: 42.0,
        historical_baseline: 35.0,
        anomaly_value: 7.0,
        affected_variable: 'Temperature',
        unit: '°C',
        source: 'India Sample Dataset + IMD Telemetry',
        source_type: 'EXCEL_SAMPLE',
        dataset_id: 'DS-INDIA-SAMPLE-02',
        history: [
          {
            entry_id: 'EVT-004-H1',
            timestamp: '2026-09-12T10:00:00.000Z',
            stage: 'DEVELOPING',
            risk: 'MODERATE',
            severity: 'moderate',
            confidence: 85,
            temperature_val: 38.5,
            temperature_anomaly: 3.5,
            affected_variable: 'Temperature',
            source: 'IMD Station Report',
            source_type: 'IMD',
            details: '10:00 Temperature anomaly +3.5°C Heatwave Early Notice',
          },
          {
            entry_id: 'EVT-004-H2',
            timestamp: '2026-09-12T15:30:00.000Z',
            stage: 'STRENGTHENING',
            risk: 'SEVERE',
            severity: 'high',
            confidence: 90,
            temperature_val: 42.0,
            temperature_anomaly: 7.0,
            affected_variable: 'Temperature',
            source: 'Open-Meteo Operational Telemetry',
            source_type: 'OPEN_METEO',
            details: '15:30 Temperature anomaly +7.0°C Severe Heatwave Trajectory',
          },
        ],
      },
    ];

    for (const evt of defaultEvents) {
      const key = `${evt.location.toLowerCase().trim()}__${evt.hazard_type}`;
      this.timeSeriesEvents.set(key, evt);
    }
  }

  /**
   * Recalculates anomalies, heat index, VPD, wind chill, hazard types, and risk levels
   */
  public enrichRecord(record: Partial<DatasetRecord>): DatasetRecord {
    const lat = Number(record.latitude ?? 0);
    const lon = Number(record.longitude ?? 0);
    const temp = Number(record.temperature ?? 20);
    const histTemp = Number(record.historical_temperature ?? temp);
    const tempAnom = Math.round((temp - histTemp) * 10) / 10;

    const rain = Math.max(0, Number(record.rainfall ?? 0));
    const histRain = Math.max(0, Number(record.historical_rainfall ?? 0));
    const rainAnom = Math.round((rain - histRain) * 10) / 10;

    const wind = Math.max(0, Number(record.wind_speed ?? 10));
    const histWind = Math.max(0, Number(record.historical_wind ?? 10));
    const windAnom = Math.round((wind - histWind) * 10) / 10;

    const rh = Math.min(100, Math.max(0, Number(record.relative_humidity ?? 50)));

    const heatIndex = calculateHeatIndex(temp, rh);
    const vpd = calculateVPD(temp, rh);
    const windChill = calculateWindChill(temp, wind);

    // Hazard type & Risk determination
    let hazard: HazardType | undefined;
    let risk: RiskLevel = 'LOW';

    if (tempAnom >= 6.0 || temp >= 42) {
      hazard = 'HEATWAVE';
      risk = tempAnom >= 7.5 || temp >= 45 ? 'CRITICAL' : 'SEVERE';
    } else if (tempAnom <= -5.0 || temp <= 4) {
      hazard = 'COLDWAVE';
      risk = tempAnom <= -7.0 ? 'SEVERE' : 'HIGH';
    } else if (rainAnom >= 50 || rain >= 65) {
      hazard = 'EXTREME_PRECIPITATION';
      risk = rain >= 100 ? 'CRITICAL' : 'SEVERE';
    } else if (windAnom >= 25 || wind >= 50) {
      hazard = 'HIGH_WIND';
      risk = wind >= 65 ? 'CRITICAL' : 'HIGH';
    } else if (tempAnom >= 3.5 || rainAnom >= 25 || windAnom >= 15) {
      risk = 'MODERATE';
    }

    const now = new Date().toISOString();

    return {
      record_id: record.record_id || `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      location: (record.location || 'Unspecified Location').trim(),
      continent: record.continent,
      country: record.country,
      state: record.state,
      district: record.district,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      forecast_date: record.forecast_date || now.split('T')[0],
      forecast_day: Math.max(1, Math.min(7, Number(record.forecast_day ?? 1))),
      temperature: Math.round(temp * 10) / 10,
      historical_temperature: Math.round(histTemp * 10) / 10,
      temperature_anomaly: tempAnom,
      rainfall: Math.round(rain * 10) / 10,
      historical_rainfall: Math.round(histRain * 10) / 10,
      rainfall_anomaly: rainAnom,
      wind_speed: Math.round(wind * 10) / 10,
      historical_wind: Math.round(histWind * 10) / 10,
      wind_anomaly: windAnom,
      relative_humidity: Math.round(rh),
      heat_index: heatIndex,
      vpd: vpd,
      wind_chill: windChill,
      hazard_type: hazard,
      risk_level: risk,
      status_note: record.status_note,
      extra_fields: record.extra_fields,
      created_at: record.created_at || now,
      updated_at: now,
      last_modified_by: record.last_modified_by || 'User / Operator',
    };
  }

  private calculateDateRange(records: DatasetRecord[]): { start: string; end: string } {
    if (records.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    }
    const dates = records.map((r) => r.forecast_date).filter(Boolean).sort();
    return {
      start: dates[0] || new Date().toISOString().split('T')[0],
      end: dates[dates.length - 1] || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Add Audit Log
   */
  private addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const log: AuditLogEntry = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 2000) {
      this.auditLogs.pop();
    }
  }

  /**
   * Parse Excel (.xlsx, .xls) or CSV buffer into raw JSON array with sheet names
   */
  public parseFileBuffer(buffer: Buffer): { rows: Record<string, any>[]; columns: string[]; sheetNames: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The uploaded file does not contain any readable sheets.');
    }
    const sheetNames = workbook.SheetNames;
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const columns: string[] = [];
    if (rawRows.length > 0) {
      Object.keys(rawRows[0]).forEach((c) => {
        if (!columns.includes(c)) columns.push(c);
      });
    }

    return { rows: rawRows, columns, sheetNames };
  }

  /**
   * Normalize an incoming row object by matching column variations tolerantly
   */
  private findValue(row: Record<string, any>, possibleKeys: string[]): any {
    const lowerKeys = Object.keys(row).reduce((acc, k) => {
      acc[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k];
      return acc;
    }, {} as Record<string, any>);

    for (const key of possibleKeys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lowerKeys[normalizedKey] !== undefined && lowerKeys[normalizedKey] !== '') {
        return lowerKeys[normalizedKey];
      }
    }
    return undefined;
  }

  /**
   * Validate uploaded dataset rows, perform 12-step validation, detect types, anomalies, duplicates, and generate preview
   */
  public validateFile(
    buffer: Buffer,
    filename: string,
    forcedType: DatasetType = 'AUTO_DETECT'
  ): DatasetValidationResult {
    const { rows, columns, sheetNames } = this.parseFileBuffer(buffer);

    const errors: ValidationErrorItem[] = [];
    const warnings: ValidationWarningItem[] = [];
    const previewRows: DatasetRecord[] = [];

    const expectedCols = ['Location', 'Latitude', 'Longitude', 'Forecast_Date', 'Temperature'];
    const columnsFound: string[] = [];
    const columnsMissing: string[] = [];

    // Check key columns
    expectedCols.forEach((col) => {
      const found = columns.some((c) => c.toLowerCase().includes(col.toLowerCase()));
      if (found) {
        columnsFound.push(col);
      } else {
        columnsMissing.push(col);
      }
    });

    // Step 4: Detect data types per column
    const detectedTypes: Record<string, string> = {};
    const missingValues: Record<string, number> = {};
    columns.forEach((col) => {
      missingValues[col] = 0;
      let numCount = 0;
      let dateCount = 0;
      let totalSamples = 0;
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const v = rows[i][col];
        if (v !== undefined && v !== '' && v !== null) {
          totalSamples++;
          if (typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')) {
            numCount++;
          } else if (v instanceof Date || (!isNaN(Date.parse(v)) && isNaN(Number(v)))) {
            dateCount++;
          }
        }
      }
      if (totalSamples === 0) detectedTypes[col] = 'empty';
      else if (numCount / totalSamples >= 0.75) detectedTypes[col] = 'numeric';
      else if (dateCount / totalSamples >= 0.75) detectedTypes[col] = 'date';
      else detectedTypes[col] = 'string';
    });

    // Detect weather and anomaly variables present
    const weatherVarsDetected: string[] = [];
    const anomalyVarsDetected: string[] = [];
    const coreKeys = ['location', 'latitude', 'longitude', 'date', 'day', 'continent', 'country', 'state', 'district'];
    const extraColumnsPreserved: string[] = [];

    columns.forEach((c) => {
      const lc = c.toLowerCase();
      if (lc.includes('temp') && !lc.includes('anom')) {
        if (!weatherVarsDetected.includes('Temperature')) weatherVarsDetected.push('Temperature');
      }
      if (lc.includes('rain') || lc.includes('precip')) {
        if (!weatherVarsDetected.includes('Rainfall')) weatherVarsDetected.push('Rainfall');
      }
      if (lc.includes('wind') && !lc.includes('anom')) {
        if (!weatherVarsDetected.includes('Wind Speed')) weatherVarsDetected.push('Wind Speed');
      }
      if (lc.includes('humid') || lc.includes('rh')) {
        if (!weatherVarsDetected.includes('Relative Humidity')) weatherVarsDetected.push('Relative Humidity');
      }
      if (lc.includes('anom') || lc.includes('delta') || lc.includes('diff')) {
        if (lc.includes('temp') && !anomalyVarsDetected.includes('Temperature Anomaly')) anomalyVarsDetected.push('Temperature Anomaly');
        else if (lc.includes('rain') && !anomalyVarsDetected.includes('Rainfall Anomaly')) anomalyVarsDetected.push('Rainfall Anomaly');
        else if (lc.includes('wind') && !anomalyVarsDetected.includes('Wind Anomaly')) anomalyVarsDetected.push('Wind Anomaly');
        else if (!anomalyVarsDetected.includes(c)) anomalyVarsDetected.push(c);
      }

      // Check if extra column
      const isCore = coreKeys.some((k) => lc.includes(k)) || lc.includes('temp') || lc.includes('rain') || lc.includes('precip') || lc.includes('wind') || lc.includes('rh') || lc.includes('humid') || lc.includes('anom');
      if (!isCore && !extraColumnsPreserved.includes(c)) {
        extraColumnsPreserved.push(c);
      }
    });

    if (rows.length === 0) {
      return {
        valid: false,
        total_rows: 0,
        valid_rows: 0,
        errors: [{ row: 0, field: 'File', message: 'Dataset file is empty or contains no data rows.' }],
        warnings: [],
        detected_type: forcedType === 'AUTO_DETECT' ? 'OTHER_WEATHER' : forcedType,
        preview_rows: [],
        columns_found: columns,
        columns_missing: columnsMissing,
        details: {
          sheet_names: sheetNames,
          headers: columns,
          detected_types: detectedTypes,
          coordinate_validation: { valid_count: 0, invalid_count: 0, invalid_samples: [] },
          date_validation: { valid_count: 0, date_range: { start: '', end: '' } },
          forecast_horizon: { detected_days: [], min_day: 1, max_day: 1 },
          weather_variables_detected: weatherVarsDetected,
          anomaly_variables_detected: anomalyVarsDetected,
          duplicate_count: 0,
          missing_values: missingValues,
          extra_columns_preserved: extraColumnsPreserved,
        },
      };
    }

    let hasIndiaIndicators = false;
    let hasGlobalIndicators = false;

    let validCount = 0;
    let validCoordsCount = 0;
    let invalidCoordsCount = 0;
    const invalidCoordSamples: string[] = [];
    const validDates: string[] = [];
    const detectedDays = new Set<number>();
    const seenRowKeys = new Set<string>();
    let duplicateCount = 0;

    rows.forEach((row, index) => {
      const rowNum = index + 1;

      // Count missing values per column
      columns.forEach((col) => {
        if (row[col] === undefined || row[col] === null || String(row[col]).trim() === '') {
          missingValues[col] = (missingValues[col] || 0) + 1;
        }
      });

      const locVal = this.findValue(row, ['location', 'city', 'station', 'place', 'district']);
      const latVal = this.findValue(row, ['latitude', 'lat']);
      const lonVal = this.findValue(row, ['longitude', 'lon', 'long']);
      const dateVal = this.findValue(row, ['forecast_date', 'date', 'time', 'day']);
      const dayVal = this.findValue(row, ['forecast_day', 'lead_day', 'day_num']);
      const tempVal = this.findValue(row, ['temperature_c', 'temperature', 'temp', 't_c']);
      const histTempVal = this.findValue(row, ['historical_temp_c', 'historical_temp', 'hist_temp', 'temp_baseline']);
      const rainVal = this.findValue(row, ['rainfall_mm', 'rainfall', 'precipitation', 'rain']);
      const histRainVal = this.findValue(row, ['historical_rainfall_mm', 'historical_rainfall', 'hist_rain']);
      const windVal = this.findValue(row, ['wind_speed', 'wind', 'speed', 'wind_kmh']);
      const histWindVal = this.findValue(row, ['historical_wind', 'hist_wind']);
      const rhVal = this.findValue(row, ['relative_humidity', 'humidity', 'rh']);
      const continentVal = this.findValue(row, ['continent']);
      const countryVal = this.findValue(row, ['country']);
      const stateVal = this.findValue(row, ['state']);

      // Heuristic detection
      if (countryVal?.toString().toLowerCase().includes('india') || stateVal || (locVal && ['jaipur', 'delhi', 'mumbai', 'kolkata', 'chennai', 'ahmedabad', 'nagpur', 'barmer', 'cherrapunji'].some((c) => locVal.toString().toLowerCase().includes(c)))) {
        hasIndiaIndicators = true;
      }
      if (continentVal || (countryVal && !countryVal.toString().toLowerCase().includes('india'))) {
        hasGlobalIndicators = true;
      }

      let rowValid = true;

      // Validate Location
      if (!locVal || String(locVal).trim().length === 0) {
        errors.push({ row: rowNum, field: 'Location', message: 'Location name is required.' });
        rowValid = false;
      }

      // Step 5: Validate Latitude & Longitude
      const lat = parseFloat(latVal);
      const lon = parseFloat(lonVal);
      const latValid = !isNaN(lat) && lat >= -90 && lat <= 90;
      const lonValid = !isNaN(lon) && lon >= -180 && lon <= 180;

      if (!latValid) {
        errors.push({ row: rowNum, field: 'Latitude', message: `Latitude must be a valid number between -90 and 90 (received: ${latVal}).`, value: latVal });
        rowValid = false;
        invalidCoordsCount++;
        if (invalidCoordSamples.length < 5) invalidCoordSamples.push(`Row ${rowNum}: lat ${latVal}`);
      }
      if (!lonValid) {
        errors.push({ row: rowNum, field: 'Longitude', message: `Longitude must be a valid number between -180 and 180 (received: ${lonVal}).`, value: lonVal });
        rowValid = false;
        invalidCoordsCount++;
        if (invalidCoordSamples.length < 5) invalidCoordSamples.push(`Row ${rowNum}: lon ${lonVal}`);
      }
      if (latValid && lonValid) {
        validCoordsCount++;
      }

      // Step 6: Validate Date
      let dateStr = '';
      if (dateVal instanceof Date) {
        dateStr = dateVal.toISOString().split('T')[0];
        validDates.push(dateStr);
      } else if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
          validDates.push(dateStr);
        } else {
          dateStr = String(dateVal);
        }
      } else {
        dateStr = new Date().toISOString().split('T')[0];
        validDates.push(dateStr);
        warnings.push({ row: rowNum, field: 'Forecast_Date', message: 'Missing date; defaulted to current day.' });
      }

      // Step 7: Detect forecast day
      const parsedDay = parseInt(dayVal || '1', 10);
      if (!isNaN(parsedDay)) {
        detectedDays.add(parsedDay);
      }

      // Step 10: Check duplicates
      const rowKey = `${String(locVal).toLowerCase().trim()}__${dateStr}__${parsedDay || 1}`;
      if (seenRowKeys.has(rowKey)) {
        duplicateCount++;
        warnings.push({ row: rowNum, field: 'Record', message: `Potential duplicate observation at ${locVal} on ${dateStr} (Day ${parsedDay || 1}).` });
      } else {
        seenRowKeys.add(rowKey);
      }

      // Validate Temperature
      const temp = parseFloat(tempVal);
      if (isNaN(temp)) {
        errors.push({ row: rowNum, field: 'Temperature', message: 'Temperature must be numeric.', value: tempVal });
        rowValid = false;
      } else if (temp < -90 || temp > 70) {
        warnings.push({ row: rowNum, field: 'Temperature', message: `Extreme temperature recorded (${temp}°C); please verify sensor accuracy.` });
      }

      const histTemp = !isNaN(parseFloat(histTempVal)) ? parseFloat(histTempVal) : temp;
      const rain = !isNaN(parseFloat(rainVal)) ? Math.max(0, parseFloat(rainVal)) : 0;
      const histRain = !isNaN(parseFloat(histRainVal)) ? Math.max(0, parseFloat(histRainVal)) : 0;
      const wind = !isNaN(parseFloat(windVal)) ? Math.max(0, parseFloat(windVal)) : 10;
      const histWind = !isNaN(parseFloat(histWindVal)) ? Math.max(0, parseFloat(histWindVal)) : 10;
      const rh = !isNaN(parseFloat(rhVal)) ? parseFloat(rhVal) : 50;

      if (rowValid) {
        validCount++;
        if (previewRows.length < 15) {
          // Collect extra fields for preview
          const extraFields: Record<string, any> = {};
          extraColumnsPreserved.forEach((colName) => {
            if (row[colName] !== undefined && row[colName] !== '') {
              extraFields[colName] = row[colName];
            }
          });

          const rec = this.enrichRecord({
            record_id: `PREV-${rowNum}`,
            location: String(locVal),
            continent: continentVal ? String(continentVal) : undefined,
            country: countryVal ? String(countryVal) : undefined,
            state: stateVal ? String(stateVal) : undefined,
            latitude: lat,
            longitude: lon,
            forecast_date: dateStr,
            forecast_day: parsedDay || 1,
            temperature: temp,
            historical_temperature: histTemp,
            rainfall: rain,
            historical_rainfall: histRain,
            wind_speed: wind,
            historical_wind: histWind,
            relative_humidity: rh,
            extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
            status_note: 'Validated import preview record',
          });
          previewRows.push(rec);
        }
      }
    });

    // Detect type
    let detectedType: DatasetType = 'OTHER_WEATHER';
    if (forcedType !== 'AUTO_DETECT') {
      detectedType = forcedType;
    } else if (hasIndiaIndicators && !hasGlobalIndicators) {
      detectedType = 'INDIA_EXTREME_WEATHER';
    } else if (hasGlobalIndicators) {
      detectedType = 'GLOBAL_EXTREME_WEATHER';
    }

    const sortedDates = [...validDates].sort();
    const sortedDays = Array.from(detectedDays).sort((a, b) => a - b);

    return {
      valid: errors.length === 0,
      total_rows: rows.length,
      valid_rows: validCount,
      errors: errors.slice(0, 50), // Cap at 50 to prevent huge payloads
      warnings: warnings.slice(0, 50),
      detected_type: detectedType,
      preview_rows: previewRows,
      columns_found: columns,
      columns_missing: columnsMissing,
      details: {
        sheet_names: sheetNames,
        headers: columns,
        detected_types: detectedTypes,
        coordinate_validation: {
          valid_count: validCoordsCount,
          invalid_count: invalidCoordsCount,
          invalid_samples: invalidCoordSamples,
        },
        date_validation: {
          valid_count: validDates.length,
          date_range: {
            start: sortedDates[0] || new Date().toISOString().split('T')[0],
            end: sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0],
          },
        },
        forecast_horizon: {
          detected_days: sortedDays.length > 0 ? sortedDays : [1],
          min_day: sortedDays[0] || 1,
          max_day: sortedDays[sortedDays.length - 1] || 1,
        },
        weather_variables_detected: weatherVarsDetected.length > 0 ? weatherVarsDetected : ['Temperature'],
        anomaly_variables_detected: anomalyVarsDetected.length > 0 ? anomalyVarsDetected : ['Auto-Calculated Anomalies'],
        duplicate_count: duplicateCount,
        missing_values: missingValues,
        extra_columns_preserved: extraColumnsPreserved,
      },
    };
  }

  /**
   * Import validated dataset rows into the library
   */
  public importDataset(
    name: string,
    type: DatasetType,
    description: string,
    buffer: Buffer,
    author: string = 'Meteorologist / Operator'
  ): Dataset {
    const { rows, columns } = this.parseFileBuffer(buffer);
    const now = new Date().toISOString();
    const datasetId = `DS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const coreKeys = ['location', 'latitude', 'longitude', 'date', 'day', 'continent', 'country', 'state', 'district', 'temp', 'rain', 'precip', 'wind', 'rh', 'humid'];

    const sourceType: TimeSeriesSourceType =
      type === 'GLOBAL_EXTREME_WEATHER'
        ? 'EXCEL_PROTOTYPE'
        : type === 'INDIA_EXTREME_WEATHER'
        ? 'EXCEL_SAMPLE'
        : 'OTHER_SUPPORTED_SOURCE';

    const records: DatasetRecord[] = rows.map((row, index) => {
      const locVal = this.findValue(row, ['location', 'city', 'station', 'place', 'district']) || `Location-${index + 1}`;
      const latVal = parseFloat(this.findValue(row, ['latitude', 'lat']) ?? 0);
      const lonVal = parseFloat(this.findValue(row, ['longitude', 'lon', 'long']) ?? 0);
      let dateVal = this.findValue(row, ['forecast_date', 'date', 'time', 'day']);
      if (dateVal instanceof Date) {
        dateVal = dateVal.toISOString().split('T')[0];
      } else if (!dateVal) {
        dateVal = now.split('T')[0];
      }
      const dayVal = parseInt(this.findValue(row, ['forecast_day', 'lead_day', 'day_num']) ?? '1', 10);
      const tempVal = parseFloat(this.findValue(row, ['temperature_c', 'temperature', 'temp', 't_c']) ?? 25);
      const histTempVal = parseFloat(this.findValue(row, ['historical_temp_c', 'historical_temp', 'hist_temp', 'temp_baseline']) ?? tempVal);
      const rainVal = parseFloat(this.findValue(row, ['rainfall_mm', 'rainfall', 'precipitation', 'rain']) ?? 0);
      const histRainVal = parseFloat(this.findValue(row, ['historical_rainfall_mm', 'historical_rainfall', 'hist_rain']) ?? 0);
      const windVal = parseFloat(this.findValue(row, ['wind_speed', 'wind', 'speed', 'wind_kmh']) ?? 10);
      const histWindVal = parseFloat(this.findValue(row, ['historical_wind', 'hist_wind']) ?? 10);
      const rhVal = parseFloat(this.findValue(row, ['relative_humidity', 'humidity', 'rh']) ?? 50);

      // Preserve extra unknown columns
      const extraFields: Record<string, any> = {};
      columns.forEach((c) => {
        const lc = c.toLowerCase();
        const isCore = coreKeys.some((k) => lc.includes(k));
        if (!isCore && row[c] !== undefined && row[c] !== '') {
          extraFields[c] = row[c];
        }
      });

      const enriched = this.enrichRecord({
        record_id: `REC-${datasetId}-${index + 1}`,
        location: String(locVal),
        continent: this.findValue(row, ['continent']),
        country: this.findValue(row, ['country']),
        state: this.findValue(row, ['state']),
        district: this.findValue(row, ['district']),
        latitude: latVal,
        longitude: lonVal,
        forecast_date: String(dateVal),
        forecast_day: isNaN(dayVal) ? 1 : dayVal,
        temperature: isNaN(tempVal) ? 25 : tempVal,
        historical_temperature: isNaN(histTempVal) ? tempVal : histTempVal,
        rainfall: isNaN(rainVal) ? 0 : rainVal,
        historical_rainfall: isNaN(histRainVal) ? 0 : histRainVal,
        wind_speed: isNaN(windVal) ? 10 : windVal,
        historical_wind: isNaN(histWindVal) ? 10 : histWindVal,
        relative_humidity: isNaN(rhVal) ? 50 : rhVal,
        source: `User Ingestion (${type})`,
        source_type: sourceType,
        dataset_id: datasetId,
        uploaded_at: now,
        extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
        status_note: 'Imported User Dataset Record',
        created_at: now,
        updated_at: now,
        last_modified_by: author,
      });

      // Synchronize with Time-Series Tracked Events
      this.processRecordForEventTracking(enriched, name.trim() || `Dataset ${datasetId}`, sourceType);

      return enriched;
    });

    const dataset: Dataset = {
      id: datasetId,
      name: name.trim() || `User Dataset - ${now.split('T')[0]}`,
      type,
      description: description || `Uploaded weather observations and anomaly dataset with ${records.length} records.`,
      source: `User Ingestion (${type})`,
      status: 'ACTIVE',
      current_version: 1,
      versions: [
        {
          version: 1,
          created_at: now,
          created_by: author,
          change_summary: `Initial upload containing ${records.length} records across ${new Set(records.map((r) => r.location)).size} unique locations.`,
          records_count: records.length,
          records: [...records],
        },
      ],
      records,
      total_rows: records.length,
      total_locations: new Set(records.map((r) => r.location)).size,
      locations_list: Array.from(new Set(records.map((r) => r.location))),
      date_range: this.calculateDateRange(records),
      created_at: now,
      updated_at: now,
      last_uploaded_by: author,
    };

    this.datasets.set(dataset.id, dataset);

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      operation: 'UPLOAD_DATASET',
      actor: author,
      details: `Created new dataset "${dataset.name}" with ${records.length} records across ${dataset.total_locations} locations.`,
    });

    this.saveToStorage();
    return dataset;
  }

  /**
   * Diff two record sets with full change marking
   */
  public diffRecords(oldRecords: DatasetRecord[], newRecords: DatasetRecord[]): DatasetVersionDiffResult {
    const oldMap = new Map<string, DatasetRecord>();
    oldRecords.forEach((r) => {
      const key = `${r.location.toLowerCase().trim()}__${r.forecast_date}__${r.forecast_day}`;
      oldMap.set(key, r);
    });

    const newMap = new Map<string, DatasetRecord>();
    newRecords.forEach((r) => {
      const key = `${r.location.toLowerCase().trim()}__${r.forecast_date}__${r.forecast_day}`;
      newMap.set(key, r);
    });

    const diffItems: DatasetDiffItem[] = [];
    let added = 0;
    let updated = 0;
    let unchanged = 0;
    let removed = 0;

    const oldLocs = new Set(oldRecords.map((r) => r.location));
    const newLocs = new Set(newRecords.map((r) => r.location));
    const newLocations: string[] = [];
    newLocs.forEach((l) => {
      if (!oldLocs.has(l)) newLocations.push(l);
    });
    const removedLocations: string[] = [];
    oldLocs.forEach((l) => {
      if (!newLocs.has(l)) removedLocations.push(l);
    });

    const oldDates = new Set(oldRecords.map((r) => r.forecast_date));
    const newDatesSet = new Set<string>();
    newRecords.forEach((r) => {
      if (!oldDates.has(r.forecast_date)) newDatesSet.add(r.forecast_date);
    });

    // Check new against old
    newMap.forEach((newRec, key) => {
      const oldRec = oldMap.get(key);
      if (!oldRec) {
        added++;
        diffItems.push({
          type: 'ADDED',
          record_id: newRec.record_id,
          location: newRec.location,
          forecast_date: newRec.forecast_date,
          forecast_day: newRec.forecast_day,
          new_record: newRec,
        });
      } else {
        const changedFields: Array<{ field: string; old_val: any; new_val: any }> = [];
        const checkFields: (keyof DatasetRecord)[] = [
          'temperature',
          'historical_temperature',
          'temperature_anomaly',
          'rainfall',
          'historical_rainfall',
          'rainfall_anomaly',
          'wind_speed',
          'historical_wind',
          'wind_anomaly',
          'relative_humidity',
          'latitude',
          'longitude',
        ];

        checkFields.forEach((f) => {
          if (oldRec[f] !== newRec[f]) {
            changedFields.push({
              field: f,
              old_val: oldRec[f],
              new_val: newRec[f],
            });
          }
        });

        if (changedFields.length > 0) {
          updated++;
          diffItems.push({
            type: 'UPDATED',
            mark: 'DATA CHANGED',
            record_id: oldRec.record_id,
            location: newRec.location,
            forecast_date: newRec.forecast_date,
            forecast_day: newRec.forecast_day,
            old_record: oldRec,
            new_record: newRec,
            changed_fields: changedFields,
          });
        } else {
          unchanged++;
          diffItems.push({
            type: 'UNCHANGED',
            record_id: oldRec.record_id,
            location: newRec.location,
            forecast_date: newRec.forecast_date,
            forecast_day: newRec.forecast_day,
            old_record: oldRec,
            new_record: newRec,
          });
        }
      }
    });

    // Check removed records
    oldMap.forEach((oldRec, key) => {
      if (!newMap.has(key)) {
        removed++;
        diffItems.push({
          type: 'REMOVED',
          record_id: oldRec.record_id,
          location: oldRec.location,
          forecast_date: oldRec.forecast_date,
          forecast_day: oldRec.forecast_day,
          old_record: oldRec,
        });
      }
    });

    return {
      summary: { added, updated, unchanged, removed },
      diff_items: diffItems,
      new_locations: newLocations,
      removed_locations: removedLocations,
      new_dates: Array.from(newDatesSet),
      changed_values_count: updated,
    };
  }

  /**
   * Compare an incoming version's rows with the dataset's current active records (Diff Engine)
   */
  public computeVersionDiff(datasetId: string, incomingRecords: DatasetRecord[]): DatasetVersionDiffResult {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }
    return this.diffRecords(dataset.records, incomingRecords);
  }

  /**
   * Compare two arbitrary versions within a dataset
   */
  public compareVersions(datasetId: string, versionA: number, versionB: number): DatasetVersionDiffResult {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }
    const vA = dataset.versions.find((v) => v.version === versionA);
    const vB = dataset.versions.find((v) => v.version === versionB);
    if (!vA || !vB) {
      throw new Error(`One or both requested versions (v${versionA}, v${versionB}) do not exist in dataset "${dataset.name}"`);
    }
    return this.diffRecords(vA.records, vB.records);
  }

  /**
   * Apply a new version to an existing dataset
   */
  public updateDatasetVersion(
    datasetId: string,
    buffer: Buffer,
    changeSummary: string,
    author: string = 'Meteorologist / Operator'
  ): { dataset: Dataset; diff: DatasetVersionDiffResult } {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const { rows, columns } = this.parseFileBuffer(buffer);
    const now = new Date().toISOString();
    const coreKeys = ['location', 'latitude', 'longitude', 'date', 'day', 'continent', 'country', 'state', 'district', 'temp', 'rain', 'precip', 'wind', 'rh', 'humid'];

    const sourceType: TimeSeriesSourceType =
      dataset.type === 'GLOBAL_EXTREME_WEATHER'
        ? 'EXCEL_PROTOTYPE'
        : dataset.type === 'INDIA_EXTREME_WEATHER'
        ? 'EXCEL_SAMPLE'
        : 'OTHER_SUPPORTED_SOURCE';

    const incomingRecords: DatasetRecord[] = rows.map((row, index) => {
      const locVal = this.findValue(row, ['location', 'city', 'station', 'place', 'district']) || `Location-${index + 1}`;
      const latVal = parseFloat(this.findValue(row, ['latitude', 'lat']) ?? 0);
      const lonVal = parseFloat(this.findValue(row, ['longitude', 'lon', 'long']) ?? 0);
      let dateVal = this.findValue(row, ['forecast_date', 'date', 'time', 'day']);
      if (dateVal instanceof Date) {
        dateVal = dateVal.toISOString().split('T')[0];
      } else if (!dateVal) {
        dateVal = now.split('T')[0];
      }
      const dayVal = parseInt(this.findValue(row, ['forecast_day', 'lead_day', 'day_num']) ?? '1', 10);
      const tempVal = parseFloat(this.findValue(row, ['temperature_c', 'temperature', 'temp', 't_c']) ?? 25);
      const histTempVal = parseFloat(this.findValue(row, ['historical_temp_c', 'historical_temp', 'hist_temp', 'temp_baseline']) ?? tempVal);
      const rainVal = parseFloat(this.findValue(row, ['rainfall_mm', 'rainfall', 'precipitation', 'rain']) ?? 0);
      const histRainVal = parseFloat(this.findValue(row, ['historical_rainfall_mm', 'historical_rainfall', 'hist_rain']) ?? 0);
      const windVal = parseFloat(this.findValue(row, ['wind_speed', 'wind', 'speed', 'wind_kmh']) ?? 10);
      const histWindVal = parseFloat(this.findValue(row, ['historical_wind', 'hist_wind']) ?? 10);
      const rhVal = parseFloat(this.findValue(row, ['relative_humidity', 'humidity', 'rh']) ?? 50);

      // Preserve extra unknown columns
      const extraFields: Record<string, any> = {};
      columns.forEach((c) => {
        const lc = c.toLowerCase();
        const isCore = coreKeys.some((k) => lc.includes(k));
        if (!isCore && row[c] !== undefined && row[c] !== '') {
          extraFields[c] = row[c];
        }
      });

      const enriched = this.enrichRecord({
        record_id: `REC-${datasetId}-v${dataset.current_version + 1}-${index + 1}`,
        location: String(locVal),
        continent: this.findValue(row, ['continent']),
        country: this.findValue(row, ['country']),
        state: this.findValue(row, ['state']),
        district: this.findValue(row, ['district']),
        latitude: latVal,
        longitude: lonVal,
        forecast_date: String(dateVal),
        forecast_day: isNaN(dayVal) ? 1 : dayVal,
        temperature: isNaN(tempVal) ? 25 : tempVal,
        historical_temperature: isNaN(histTempVal) ? tempVal : histTempVal,
        rainfall: isNaN(rainVal) ? 0 : rainVal,
        historical_rainfall: isNaN(histRainVal) ? 0 : histRainVal,
        wind_speed: isNaN(windVal) ? 10 : windVal,
        historical_wind: isNaN(histWindVal) ? 10 : histWindVal,
        relative_humidity: isNaN(rhVal) ? 50 : rhVal,
        source: dataset.source,
        source_type: sourceType,
        dataset_id: datasetId,
        uploaded_at: now,
        extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
        status_note: `Version ${dataset.current_version + 1} Record`,
        created_at: now,
        updated_at: now,
        last_modified_by: author,
      });

      // Synchronize with Time-Series Tracked Events
      this.processRecordForEventTracking(enriched, `${dataset.name} (v${dataset.current_version + 1})`, sourceType);

      return enriched;
    });

    const diff = this.computeVersionDiff(datasetId, incomingRecords);

    const newVersionNumber = dataset.current_version + 1;
    const newVersion: DatasetVersion = {
      version: newVersionNumber,
      created_at: now,
      created_by: author,
      change_summary: changeSummary || `Version ${newVersionNumber}: +${diff.summary.added} added, ~${diff.summary.updated} updated, -${diff.summary.removed} removed.`,
      records_count: incomingRecords.length,
      diff_summary: diff.summary,
      records: [...incomingRecords],
    };

    dataset.versions.push(newVersion);
    dataset.current_version = newVersionNumber;
    dataset.records = incomingRecords;
    dataset.total_rows = incomingRecords.length;
    dataset.total_locations = new Set(incomingRecords.map((r) => r.location)).size;
    dataset.locations_list = Array.from(new Set(incomingRecords.map((r) => r.location)));
    dataset.date_range = this.calculateDateRange(incomingRecords);
    dataset.updated_at = now;

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      operation: 'NEW_VERSION',
      actor: author,
      details: `Created version v${newVersionNumber}: ${newVersion.change_summary}`,
      diff: {
        summary: `Added: ${diff.summary.added}, Updated: ${diff.summary.updated}, Unchanged: ${diff.summary.unchanged}, Removed: ${diff.summary.removed}`,
      },
    });

    this.saveToStorage();
    return { dataset, diff };
  }

  /**
   * Restore an earlier version of the dataset
   */
  public restoreVersion(datasetId: string, targetVersion: number, author: string = 'Meteorologist / Operator'): Dataset {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const versionObj = dataset.versions.find((v) => v.version === targetVersion);
    if (!versionObj) {
      throw new Error(`Version v${targetVersion} not found in dataset`);
    }

    const now = new Date().toISOString();
    const clonedRecords = versionObj.records.map((r) => ({
      ...r,
      updated_at: now,
      last_modified_by: author,
    }));

    const restoredVersionNumber = dataset.current_version + 1;
    const restoreVersionEntry: DatasetVersion = {
      version: restoredVersionNumber,
      created_at: now,
      created_by: author,
      change_summary: `Restored state from historical version v${targetVersion}.`,
      records_count: clonedRecords.length,
      records: clonedRecords,
    };

    dataset.versions.push(restoreVersionEntry);
    dataset.current_version = restoredVersionNumber;
    dataset.records = clonedRecords;
    dataset.total_rows = clonedRecords.length;
    dataset.total_locations = new Set(clonedRecords.map((r) => r.location)).size;
    dataset.locations_list = Array.from(new Set(clonedRecords.map((r) => r.location)));
    dataset.date_range = this.calculateDateRange(clonedRecords);
    dataset.updated_at = now;

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      operation: 'RESTORE_VERSION',
      actor: author,
      details: `Restored dataset to historical version v${targetVersion} as active v${restoredVersionNumber}.`,
    });

    this.saveToStorage();
    return dataset;
  }

  /**
   * Edit an individual record inside a dataset
   */
  public editRecord(
    datasetId: string,
    recordId: string,
    updates: Partial<DatasetRecord>,
    author: string = 'Meteorologist / Operator'
  ): { dataset: Dataset; record: DatasetRecord } {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const recordIndex = dataset.records.findIndex((r) => r.record_id === recordId);
    if (recordIndex === -1) {
      throw new Error(`Record with ID ${recordId} not found in dataset`);
    }

    const oldRecord = dataset.records[recordIndex];
    const merged = {
      ...oldRecord,
      ...updates,
      last_modified_by: author,
    };

    // Recalculate dependent physical metrics, anomalies, and risk
    const enriched = this.enrichRecord(merged);
    dataset.records[recordIndex] = enriched;
    dataset.updated_at = new Date().toISOString();
    dataset.total_locations = new Set(dataset.records.map((r) => r.location)).size;
    dataset.locations_list = Array.from(new Set(dataset.records.map((r) => r.location)));
    dataset.date_range = this.calculateDateRange(dataset.records);

    // Track detailed diff in audit log
    const changedFields: string[] = [];
    (Object.keys(updates) as (keyof DatasetRecord)[]).forEach((k) => {
      if (oldRecord[k] !== enriched[k]) {
        changedFields.push(`${String(k)}: ${oldRecord[k]} -> ${enriched[k]}`);
      }
    });

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      record_id: recordId,
      operation: 'UPDATE_RECORD',
      actor: author,
      details: `Updated record at "${enriched.location}" (${enriched.forecast_date} Day ${enriched.forecast_day}). Changes: ${changedFields.join(', ')}`,
      diff: {
        summary: changedFields.join('; '),
      },
    });

    this.saveToStorage();
    return { dataset, record: enriched };
  }

  /**
   * Add a new record to an existing dataset
   */
  public addRecord(
    datasetId: string,
    recordData: Partial<DatasetRecord>,
    author: string = 'Meteorologist / Operator'
  ): { dataset: Dataset; record: DatasetRecord } {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const newRecord = this.enrichRecord({
      ...recordData,
      record_id: `REC-${datasetId}-${Date.now()}`,
      created_at: new Date().toISOString(),
      last_modified_by: author,
    });

    dataset.records.push(newRecord);
    dataset.total_rows = dataset.records.length;
    dataset.total_locations = new Set(dataset.records.map((r) => r.location)).size;
    dataset.locations_list = Array.from(new Set(dataset.records.map((r) => r.location)));
    dataset.date_range = this.calculateDateRange(dataset.records);
    dataset.updated_at = new Date().toISOString();

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      record_id: newRecord.record_id,
      operation: 'CREATE_RECORD',
      actor: author,
      details: `Added new observation at "${newRecord.location}" (Date: ${newRecord.forecast_date}, Temp: ${newRecord.temperature}°C, Rain: ${newRecord.rainfall}mm).`,
    });

    this.saveToStorage();
    return { dataset, record: newRecord };
  }

  /**
   * Delete an individual record
   */
  public deleteRecord(
    datasetId: string,
    recordId: string,
    author: string = 'Meteorologist / Operator'
  ): { dataset: Dataset; deleted_record: DatasetRecord } {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const recordIndex = dataset.records.findIndex((r) => r.record_id === recordId);
    if (recordIndex === -1) {
      throw new Error(`Record with ID ${recordId} not found in dataset`);
    }

    const deletedRecord = dataset.records.splice(recordIndex, 1)[0];
    dataset.total_rows = dataset.records.length;
    dataset.total_locations = new Set(dataset.records.map((r) => r.location)).size;
    dataset.locations_list = Array.from(new Set(dataset.records.map((r) => r.location)));
    dataset.date_range = this.calculateDateRange(dataset.records);
    dataset.updated_at = new Date().toISOString();

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      record_id: recordId,
      operation: 'DELETE_RECORD',
      actor: author,
      details: `Deleted record at "${deletedRecord.location}" (Date: ${deletedRecord.forecast_date}, Day: ${deletedRecord.forecast_day}).`,
    });

    this.saveToStorage();
    return { dataset, deleted_record: deletedRecord };
  }

  /**
   * Rename or update metadata of a dataset
   */
  public updateMetadata(
    datasetId: string,
    updates: { name?: string; description?: string; type?: DatasetType },
    author: string = 'Meteorologist / Operator'
  ): Dataset {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const oldName = dataset.name;
    if (updates.name && updates.name.trim()) {
      dataset.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      dataset.description = updates.description;
    }
    if (updates.type) {
      dataset.type = updates.type;
    }
    dataset.updated_at = new Date().toISOString();

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      operation: 'RENAME_DATASET',
      actor: author,
      details: `Updated dataset metadata. Name changed from "${oldName}" to "${dataset.name}".`,
    });

    this.saveToStorage();
    return dataset;
  }

  /**
   * Archive a dataset
   */
  public archiveDataset(datasetId: string, author: string = 'Meteorologist / Operator'): Dataset {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    dataset.status = 'ARCHIVED';
    dataset.updated_at = new Date().toISOString();

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      operation: 'ARCHIVE_DATASET',
      actor: author,
      details: `Archived dataset "${dataset.name}". It is hidden from active pipeline queries but preserved for recovery.`,
    });

    this.saveToStorage();
    return dataset;
  }

  /**
   * Restore an archived dataset
   */
  public restoreDataset(datasetId: string, author: string = 'Meteorologist / Operator'): Dataset {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    dataset.status = 'ACTIVE';
    dataset.updated_at = new Date().toISOString();

    this.addAuditLog({
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      operation: 'RESTORE_DATASET',
      actor: author,
      details: `Restored archived dataset "${dataset.name}" back to ACTIVE status.`,
    });

    this.saveToStorage();
    return dataset;
  }

  /**
   * Delete dataset (supports soft delete or hard delete)
   */
  public deleteDataset(
    datasetId: string,
    author: string = 'Meteorologist / Operator',
    hardDelete: boolean = false
  ): { success: boolean; message: string } {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const dsName = dataset.name;

    if (hardDelete) {
      this.datasets.delete(datasetId);
    } else {
      dataset.status = 'DELETED';
      dataset.updated_at = new Date().toISOString();
    }

    this.addAuditLog({
      dataset_id: datasetId,
      dataset_name: dsName,
      operation: 'DELETE_DATASET',
      actor: author,
      details: hardDelete
        ? `Permanently removed dataset "${dsName}" from database.`
        : `Soft-deleted dataset "${dsName}". Can be restored via administrator recovery.`,
    });

    this.saveToStorage();
    return {
      success: true,
      message: hardDelete
        ? `Dataset "${dsName}" permanently removed.`
        : `Dataset "${dsName}" moved to trash. Recovery available.`,
    };
  }

  /**
   * Export dataset to CSV or Excel
   */
  public exportDataset(datasetId: string, format: 'csv' | 'xlsx'): { filename: string; buffer: Buffer; mimeType: string } {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }

    const exportRows = dataset.records.map((r) => ({
      Record_ID: r.record_id,
      Location: r.location,
      Continent: r.continent || '',
      Country: r.country || '',
      State: r.state || '',
      District: r.district || '',
      Latitude: r.latitude,
      Longitude: r.longitude,
      Forecast_Date: r.forecast_date,
      Forecast_Day: r.forecast_day,
      Temperature_C: r.temperature,
      Historical_Temp_C: r.historical_temperature,
      Temp_Anomaly_C: r.temperature_anomaly,
      Rainfall_mm: r.rainfall,
      Historical_Rainfall_mm: r.historical_rainfall,
      Rainfall_Anomaly_mm: r.rainfall_anomaly,
      Wind_Speed_kmh: r.wind_speed,
      Historical_Wind_kmh: r.historical_wind,
      Wind_Anomaly_kmh: r.wind_anomaly,
      Relative_Humidity_Pct: r.relative_humidity ?? '',
      Heat_Index_C: r.heat_index ?? '',
      Hazard_Type: r.hazard_type || 'NORMAL',
      Risk_Level: r.risk_level || 'LOW',
      Status_Note: r.status_note || '',
      Last_Modified_By: r.last_modified_by || '',
      Updated_At: r.updated_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weather_Data');

    const cleanName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35);

    if (format === 'csv') {
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      return {
        filename: `${cleanName}_v${dataset.current_version}.csv`,
        buffer: Buffer.from(csvContent, 'utf-8'),
        mimeType: 'text/csv',
      };
    } else {
      const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      return {
        filename: `${cleanName}_v${dataset.current_version}.xlsx`,
        buffer: xlsxBuffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
  }

  /**
   * Return datasets with optional filtering
   */
  public getDatasets(includeArchived: boolean = true, includeDeleted: boolean = false): Dataset[] {
    return Array.from(this.datasets.values()).filter((d) => {
      if (d.status === 'DELETED' && !includeDeleted) return false;
      if (d.status === 'ARCHIVED' && !includeArchived) return false;
      return true;
    });
  }

  public getDatasetById(id: string): Dataset | undefined {
    return this.datasets.get(id);
  }

  public getAuditLogs(datasetId?: string, limit: number = 200): AuditLogEntry[] {
    if (datasetId) {
      return this.auditLogs.filter((l) => l.dataset_id === datasetId).slice(0, limit);
    }
    return this.auditLogs.slice(0, limit);
  }

  /**
   * Get all active user records for integration with map/anomaly engine
   */
  public getAllActiveUserRecords(): DatasetRecord[] {
    const records: DatasetRecord[] = [];
    for (const ds of this.datasets.values()) {
      if (ds.status === 'ACTIVE') {
        records.push(...ds.records);
      }
    }
    return records;
  }

  /**
   * Unified Location Tracker:
   * Generates a 4-tier timeline for any specified location:
   * 1. Historical Baseline (1991-2020 WMO Climatology)
   * 2. User-Uploaded / Prototype Dataset Record
   * 3. Live Observed API Data (Real current readings)
   * 4. 7-Day Forecast Horizon (+1d to +7d)
   */
  public async getLocationTimeline(locationName: string, liveForecast?: any): Promise<LocationTimelineData> {
    const locLower = locationName.toLowerCase().trim();

    // Find any user records matching this location
    const matchedRecords: DatasetRecord[] = [];
    for (const ds of this.datasets.values()) {
      if (ds.status === 'ACTIVE') {
        const matching = ds.records.filter((r) => r.location.toLowerCase().includes(locLower) || locLower.includes(r.location.toLowerCase()));
        matchedRecords.push(...matching);
      }
    }

    const representative: Partial<DatasetRecord> & {
      location: string;
      latitude: number;
      longitude: number;
      temperature: number;
      historical_temperature: number;
      rainfall: number;
      historical_rainfall: number;
      wind_speed: number;
      historical_wind: number;
      temperature_anomaly: number;
      rainfall_anomaly: number;
      country?: string;
    } = matchedRecords[0] || {
      location: locationName,
      latitude: 26.9124,
      longitude: 75.7873,
      temperature: 32.0,
      historical_temperature: 30.0,
      rainfall: 5.0,
      historical_rainfall: 2.0,
      wind_speed: 15.0,
      historical_wind: 12.0,
      temperature_anomaly: 2.0,
      rainfall_anomaly: 3.0,
      country: undefined,
    };

    const timeline: LocationTimelinePoint[] = [];

    // Stage 1: Historical Baseline
    timeline.push({
      stage: 'HISTORICAL_BASELINE',
      stage_label: 'Stage 1: 30-Year Climatological Baseline',
      provenance_badge: 'WMO 1991-2020 Climatological Normal',
      data_category: 'OBSERVED DATA',
      date: 'Climatological Normal',
      day_label: 'Reference Baseline',
      temperature: representative.historical_temperature ?? 30.0,
      rainfall: representative.historical_rainfall ?? 2.0,
      wind_speed: representative.historical_wind ?? 12.0,
      condition: 'Long-term Reference Normal',
      source_citation: 'World Meteorological Organization (WMO) Reference Normals (1991-2020)',
      is_editable_user_data: false,
    });

    // Stage 2: User-Uploaded Dataset Record(s)
    if (matchedRecords.length > 0) {
      matchedRecords.slice(0, 3).forEach((r) => {
        timeline.push({
          stage: 'USER_UPLOADED',
          stage_label: `Stage 2: User Dataset Record (Day ${r.forecast_day})`,
          provenance_badge: 'USER-UPLOADED EXCEL / CSV',
          data_category: 'SAMPLE DATA',
          date: r.forecast_date,
          day_label: `Dataset Entry (Lead Day ${r.forecast_day})`,
          temperature: r.temperature,
          temp_anomaly: r.temperature_anomaly,
          rainfall: r.rainfall,
          rainfall_anomaly: r.rainfall_anomaly,
          wind_speed: r.wind_speed,
          wind_anomaly: r.wind_anomaly,
          condition: r.status_note || 'Ground-Truth / User Ingestion',
          risk_level: r.risk_level,
          source_citation: `User Ingestion: Dataset Record (${r.record_id}) - Fully Editable`,
          is_editable_user_data: true,
        });
      });
    } else {
      timeline.push({
        stage: 'USER_UPLOADED',
        stage_label: 'Stage 2: User Dataset Record',
        provenance_badge: 'USER DATASET (NONE RECORDED)',
        data_category: 'SAMPLE DATA',
        date: new Date().toISOString().split('T')[0],
        day_label: 'No Custom Observation',
        temperature: representative.temperature,
        temp_anomaly: representative.temperature_anomaly || 0,
        rainfall: representative.rainfall,
        rainfall_anomaly: representative.rainfall_anomaly || 0,
        wind_speed: representative.wind_speed,
        condition: 'No custom observation uploaded for this location',
        source_citation: 'Awaiting User Excel/CSV Ingestion',
        is_editable_user_data: false,
      });
    }

    // Stage 3: Live Observed API Data (if available or synthesized from liveForecast)
    if (liveForecast?.current) {
      timeline.push({
        stage: 'LIVE_OBSERVED',
        stage_label: 'Stage 3: Authoritative Live Operational API',
        provenance_badge: 'LIVE SENSOR / OPEN-METEO DWD/NOAA',
        data_category: 'OBSERVED DATA',
        date: liveForecast.current.time ? liveForecast.current.time.split('T')[0] : new Date().toISOString().split('T')[0],
        day_label: 'Current Real-Time Observation',
        temperature: liveForecast.current.temperature,
        temp_anomaly: Math.round((liveForecast.current.temperature - representative.historical_temperature) * 10) / 10,
        rainfall: liveForecast.current.precipitation,
        wind_speed: liveForecast.current.windSpeed,
        condition: liveForecast.current.weatherCondition || 'Observed Conditions',
        source_citation: 'Open-Meteo Operational Telemetry (DWD / NOAA Global Telemetry)',
        is_editable_user_data: false,
      });
    }

    // Stage 4: 7-Day Forecast Trajectory Horizon
    if (liveForecast?.daily && Array.isArray(liveForecast.daily)) {
      liveForecast.daily.slice(0, 7).forEach((df: any) => {
        timeline.push({
          stage: 'FORECAST',
          stage_label: `Stage 4: Numerical Forecast Horizon (+${df.dayIndex}d)`,
          provenance_badge: 'NUMERICAL ENSEMBLE FORECAST',
          data_category: 'FORECAST DATA',
          date: df.date,
          day_label: `Day +${df.dayIndex}`,
          temperature: df.tempMean,
          temp_anomaly: Math.round((df.tempMean - representative.historical_temperature) * 10) / 10,
          rainfall: df.precipitation,
          rainfall_anomaly: Math.round((df.precipitation - representative.historical_rainfall) * 10) / 10,
          wind_speed: df.windSpeed,
          condition: df.weatherCondition,
          source_citation: 'ECMWF IFS / GFS Numerical Atmospheric Model Horizon',
          is_editable_user_data: false,
        });
      });
    }

    return {
      location_name: representative.location,
      latitude: representative.latitude,
      longitude: representative.longitude,
      country: representative.country,
      timeline,
    };
  }

  /**
   * Links or updates a DatasetRecord to a persistent TimeSeriesTrackedEvent
   * Follows the lifecycle stages: NORMAL -> DEVELOPING -> STRENGTHENING -> PEAK -> WEAKENING -> RESOLVED
   */
  public processRecordForEventTracking(
    record: DatasetRecord,
    sourceTitle: string,
    sourceType: TimeSeriesSourceType
  ): TimeSeriesTrackedEvent | undefined {
    const tempAnom = record.temperature_anomaly ?? (record.temperature - record.historical_temperature);
    const rainAnom = record.rainfall_anomaly ?? (record.rainfall - record.historical_rainfall);
    const windAnom = record.wind_anomaly ?? (record.wind_speed - record.historical_wind);

    const hasAnomaly = Math.abs(tempAnom) >= 2.0 || rainAnom >= 15 || windAnom >= 15 || !!record.hazard_type;

    const locKey = record.location.toLowerCase().trim();
    const hazardType: HazardType =
      record.hazard_type ||
      (Math.abs(tempAnom) >= 2.0
        ? (tempAnom > 0 ? 'HEATWAVE' : 'COLDWAVE')
        : rainAnom >= 15
        ? 'EXTREME_PRECIPITATION'
        : 'HIGH_WIND');

    const eventKey = `${locKey}__${hazardType}`;
    let existingEvent = this.timeSeriesEvents.get(eventKey);
    const now = new Date().toISOString();

    const currVal =
      hazardType === 'HEATWAVE' || hazardType === 'COLDWAVE'
        ? record.temperature
        : hazardType === 'EXTREME_PRECIPITATION'
        ? record.rainfall
        : record.wind_speed;

    const histVal =
      hazardType === 'HEATWAVE' || hazardType === 'COLDWAVE'
        ? record.historical_temperature
        : hazardType === 'EXTREME_PRECIPITATION'
        ? record.historical_rainfall
        : record.historical_wind;

    const anomVal =
      hazardType === 'HEATWAVE' || hazardType === 'COLDWAVE'
        ? tempAnom
        : hazardType === 'EXTREME_PRECIPITATION'
        ? rainAnom
        : windAnom;

    const affectedVar =
      hazardType === 'HEATWAVE' || hazardType === 'COLDWAVE'
        ? 'Temperature'
        : hazardType === 'EXTREME_PRECIPITATION'
        ? 'Rainfall'
        : 'Wind Speed';

    const unit =
      hazardType === 'HEATWAVE' || hazardType === 'COLDWAVE'
        ? '°C'
        : hazardType === 'EXTREME_PRECIPITATION'
        ? 'mm'
        : 'km/h';

    if (existingEvent) {
      let newStage: EventEvolutionStage = existingEvent.status;
      const prevAnom = existingEvent.anomaly_value;

      if (!hasAnomaly || (hazardType === 'HEATWAVE' && tempAnom <= 1.0) || (hazardType === 'EXTREME_PRECIPITATION' && rainAnom <= 5)) {
        newStage = 'RESOLVED';
      } else if (Math.abs(anomVal) >= Math.abs(prevAnom) + 0.4) {
        if (record.risk_level === 'CRITICAL' || record.risk_level === 'SEVERE' || Math.abs(anomVal) >= 6.0 || anomVal >= 60) {
          newStage = 'PEAK';
        } else {
          newStage = 'STRENGTHENING';
        }
      } else if (Math.abs(anomVal) < Math.abs(prevAnom) - 0.4) {
        newStage = 'WEAKENING';
      } else {
        if (newStage === 'NORMAL') newStage = 'DEVELOPING';
      }

      existingEvent.last_update = now;
      existingEvent.status = newStage;
      existingEvent.risk = record.risk_level || existingEvent.risk;
      existingEvent.current_value = currVal;
      existingEvent.anomaly_value = anomVal;
      existingEvent.forecast_lead_day = record.forecast_day;
      existingEvent.severity =
        record.risk_level === 'CRITICAL'
          ? 'extreme'
          : record.risk_level === 'SEVERE'
          ? 'high'
          : record.risk_level === 'MODERATE'
          ? 'moderate'
          : 'low';
      existingEvent.confidence = Math.min(99, Math.max(70, Math.round(85 + Math.abs(anomVal) * 1.5)));

      const entryId = `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const timeLabel = now.split('T')[1].slice(0, 5);
      const historyEntry: TimeSeriesEventHistoryEntry = {
        entry_id: entryId,
        timestamp: now,
        stage: newStage,
        risk: existingEvent.risk,
        severity: existingEvent.severity,
        confidence: existingEvent.confidence,
        temperature_val: record.temperature,
        temperature_anomaly: tempAnom,
        rainfall_val: record.rainfall,
        rainfall_anomaly: rainAnom,
        wind_val: record.wind_speed,
        wind_anomaly: windAnom,
        affected_variable: affectedVar,
        source: sourceTitle,
        source_type: sourceType,
        details: `${timeLabel} ${affectedVar} anomaly ${anomVal >= 0 ? '+' : ''}${anomVal}${unit} Risk ${existingEvent.risk} (${newStage})`,
      };

      existingEvent.history.push(historyEntry);
      this.timeSeriesEvents.set(eventKey, existingEvent);
      return existingEvent;
    } else if (hasAnomaly) {
      const eventCode = record.location.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EVT';
      const eventId = `EVT-${eventCode}-${String(Date.now()).slice(-4)}`;

      const newEvent: TimeSeriesTrackedEvent = {
        event_id: eventId,
        location: record.location,
        latitude: record.latitude,
        longitude: record.longitude,
        hazard_type: hazardType,
        start_time: now,
        last_update: now,
        status: 'DEVELOPING',
        severity: record.risk_level === 'CRITICAL' ? 'extreme' : record.risk_level === 'SEVERE' ? 'high' : 'moderate',
        risk: record.risk_level || 'MODERATE',
        confidence: 85,
        forecast_lead_day: record.forecast_day,
        current_value: currVal,
        historical_baseline: histVal,
        anomaly_value: anomVal,
        affected_variable: affectedVar,
        unit,
        source: sourceTitle,
        source_type: sourceType,
        dataset_id: record.dataset_id,
        history: [
          {
            entry_id: `HIST-INIT-${eventId}`,
            timestamp: now,
            stage: 'DEVELOPING',
            risk: record.risk_level || 'MODERATE',
            severity: record.risk_level === 'CRITICAL' ? 'extreme' : 'moderate',
            confidence: 85,
            temperature_val: record.temperature,
            temperature_anomaly: tempAnom,
            rainfall_val: record.rainfall,
            rainfall_anomaly: rainAnom,
            wind_val: record.wind_speed,
            wind_anomaly: windAnom,
            affected_variable: affectedVar,
            source: sourceTitle,
            source_type: sourceType,
            details: `Initial Detection: ${affectedVar} anomaly ${anomVal >= 0 ? '+' : ''}${anomVal}${unit} (Risk: ${record.risk_level || 'MODERATE'})`,
          },
        ],
      };

      this.timeSeriesEvents.set(eventKey, newEvent);
      return newEvent;
    }

    return undefined;
  }

  /**
   * Synchronize live Open-Meteo operational telemetry for dataset locations into time-series events
   */
  public async syncLiveApiTracking(
    weatherServiceInstance: any,
    realtimeStream?: any
  ): Promise<{ updatedCount: number; eventsUpdated: number; timestamp: string }> {
    const uniqueLocations = new Map<
      string,
      { lat: number; lon: number; histTemp: number; histRain: number; histWind: number; datasetId?: string }
    >();

    for (const ds of this.datasets.values()) {
      if (ds.status === 'ACTIVE') {
        for (const r of ds.records) {
          const locKey = r.location.toLowerCase().trim();
          if (!uniqueLocations.has(locKey) && r.latitude && r.longitude) {
            uniqueLocations.set(locKey, {
              lat: r.latitude,
              lon: r.longitude,
              histTemp: r.historical_temperature || r.temperature,
              histRain: r.historical_rainfall || 0,
              histWind: r.historical_wind || 10,
              datasetId: ds.id,
            });
          }
        }
      }
    }

    let updatedCount = 0;
    let eventsUpdated = 0;
    const now = new Date().toISOString();

    for (const [locKey, locInfo] of uniqueLocations.entries()) {
      try {
        const forecast = await weatherServiceInstance.getForecast(
          `live-${locKey}`,
          locInfo.lat,
          locInfo.lon,
          locKey
        );

        if (forecast?.current) {
          const liveTemp = forecast.current.temperature;
          const livePrecip = forecast.current.precipitation || 0;
          const liveWind = forecast.current.windSpeed || 10;
          const liveRh = forecast.current.relativeHumidity || 50;

          const tempAnom = Math.round((liveTemp - locInfo.histTemp) * 10) / 10;
          const rainAnom = Math.round((livePrecip - locInfo.histRain) * 10) / 10;
          const windAnom = Math.round((liveWind - locInfo.histWind) * 10) / 10;

          const synthesizedRecord: DatasetRecord = this.enrichRecord({
            record_id: `REC-LIVE-${locKey}-${Date.now()}`,
            location: locKey.charAt(0).toUpperCase() + locKey.slice(1),
            latitude: locInfo.lat,
            longitude: locInfo.lon,
            forecast_date: now.split('T')[0],
            forecast_day: 1,
            temperature: liveTemp,
            historical_temperature: locInfo.histTemp,
            temperature_anomaly: tempAnom,
            rainfall: livePrecip,
            historical_rainfall: locInfo.histRain,
            rainfall_anomaly: rainAnom,
            wind_speed: liveWind,
            historical_wind: locInfo.histWind,
            wind_anomaly: windAnom,
            relative_humidity: liveRh,
            source: 'Open-Meteo Operational Telemetry',
            source_type: 'OPEN_METEO',
            dataset_id: locInfo.datasetId,
            status_note: 'Live Operational Feed Ingestion',
          });

          const tracked = this.processRecordForEventTracking(
            synthesizedRecord,
            'Open-Meteo Operational Telemetry',
            'OPEN_METEO'
          );

          if (tracked) {
            eventsUpdated++;
          }
          updatedCount++;
        }
      } catch (err: any) {
        console.warn(`[LiveTracking] Could not sync telemetry for ${locKey}:`, err.message);
      }
    }

    this.lastLiveSyncTimestamp = now;
    this.saveToStorage();

    if (realtimeStream) {
      realtimeStream.broadcast('live_tracking_update', {
        timestamp: now,
        locations_synced: updatedCount,
        events_updated: eventsUpdated,
      });
    }

    return { updatedCount, eventsUpdated, timestamp: now };
  }

  /**
   * Get all tracked time-series events
   */
  public getTimeSeriesEvents(): TimeSeriesTrackedEvent[] {
    return Array.from(this.timeSeriesEvents.values()).sort(
      (a, b) => new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
    );
  }

  /**
   * Get a single tracked event by event_id
   */
  public getTimeSeriesEventById(eventId: string): TimeSeriesTrackedEvent | undefined {
    for (const evt of this.timeSeriesEvents.values()) {
      if (evt.event_id === eventId) return evt;
    }
    return undefined;
  }

  /**
   * Get live tracking operational status
   */
  public getLiveTrackingStatus(): LiveTrackingStatus {
    const events = this.getTimeSeriesEvents();
    const activeCount = events.filter((e) => e.status !== 'RESOLVED').length;
    const peakCount = events.filter((e) => e.status === 'PEAK').length;
    const severeCount = events.filter((e) => e.risk === 'SEVERE' || e.risk === 'CRITICAL').length;

    let totalLocations = 0;
    const locSet = new Set<string>();
    for (const ds of this.datasets.values()) {
      if (ds.status === 'ACTIVE') {
        ds.locations_list.forEach((l) => locSet.add(l));
      }
    }
    totalLocations = locSet.size;

    return {
      is_tracking_active: this.liveTrackingActive,
      last_sync_timestamp: this.lastLiveSyncTimestamp,
      total_tracked_events: events.length,
      active_events_count: activeCount,
      peak_events_count: peakCount,
      severe_or_critical_count: severeCount,
      locations_under_monitoring: totalLocations,
      operational_sources: ['Open-Meteo Operational Telemetry', 'Global Prototype Feed', 'India Sample Feed', 'User Ingested Datasets'],
    };
  }

  /**
   * Toggle live tracking state
   */
  public toggleLiveTracking(active?: boolean): boolean {
    this.liveTrackingActive = active !== undefined ? active : !this.liveTrackingActive;
    return this.liveTrackingActive;
  }
}

export const datasetManager = new DatasetManager();
