import { EventEmitter } from 'events';

export interface AppConfig {
  GLOBAL_MONITORING_ENABLED: boolean;
  INDIA_MONITORING_ENABLED: boolean;
  GLOBAL_GRID_ENABLED: boolean;
  WEATHER_REFRESH_INTERVAL_MS: number;
  CYCLONE_REFRESH_INTERVAL_MS: number;
  TSUNAMI_REFRESH_INTERVAL_MS: number;
  DASHBOARD_REFRESH_INTERVAL_MS: number;
  FORECAST_DAYS: number;
  API_TIMEOUT_MS: number;
  API_RETRY_COUNT: number;
  CACHE_TTL_MS: number;
  ANOMALY_THRESHOLD: number;
  RISK_THRESHOLD: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  GLOBAL_MONITORING_ENABLED: true,
  INDIA_MONITORING_ENABLED: true,
  GLOBAL_GRID_ENABLED: true,
  WEATHER_REFRESH_INTERVAL_MS: 5 * 60 * 1000,   // 5 minutes
  CYCLONE_REFRESH_INTERVAL_MS: 5 * 60 * 1000,   // 5 minutes
  TSUNAMI_REFRESH_INTERVAL_MS: 2 * 60 * 1000,   // 2 minutes
  DASHBOARD_REFRESH_INTERVAL_MS: 30 * 1000,     // 30 seconds
  FORECAST_DAYS: 7,
  API_TIMEOUT_MS: 8000,
  API_RETRY_COUNT: 3,
  CACHE_TTL_MS: 5 * 60 * 1000,                  // 5 minutes
  ANOMALY_THRESHOLD: 40,
  RISK_THRESHOLD: 60,
};

export interface IngestionJobStatus {
  job_name: string;
  last_fetch_time: string;
  last_success_time: string;
  last_change_time: string;
  last_error_time?: string;
  next_scheduled_fetch: string;
  status: 'ONLINE' | 'DELAYED' | 'UNAVAILABLE' | 'RUNNING';
  data_changed_count: number;
  total_runs: number;
  error_message?: string;
}

export class BackgroundScheduler extends EventEmitter {
  private config: AppConfig;
  private intervals: NodeJS.Timeout[] = [];
  private jobStatuses: Map<string, IngestionJobStatus> = new Map();
  private isRunning: boolean = false;

  constructor(customConfig?: Partial<AppConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AppConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  public registerJob(name: string, initialStatus?: Partial<IngestionJobStatus>) {
    this.jobStatuses.set(name, {
      job_name: name,
      last_fetch_time: new Date().toISOString(),
      last_success_time: new Date().toISOString(),
      last_change_time: new Date().toISOString(),
      next_scheduled_fetch: new Date(Date.now() + 60000).toISOString(),
      status: 'ONLINE',
      data_changed_count: 0,
      total_runs: 0,
      ...initialStatus,
    });
  }

  public recordJobRun(
    name: string,
    success: boolean,
    hasChanged: boolean,
    nextIntervalMs: number,
    errorMsg?: string
  ) {
    const job = this.jobStatuses.get(name) || {
      job_name: name,
      last_fetch_time: new Date().toISOString(),
      last_success_time: new Date().toISOString(),
      last_change_time: new Date().toISOString(),
      next_scheduled_fetch: new Date().toISOString(),
      status: 'ONLINE',
      data_changed_count: 0,
      total_runs: 0,
    };

    const now = new Date().toISOString();
    job.last_fetch_time = now;
    job.total_runs += 1;
    job.next_scheduled_fetch = new Date(Date.now() + nextIntervalMs).toISOString();

    if (success) {
      job.last_success_time = now;
      job.status = 'ONLINE';
      job.error_message = undefined;
      if (hasChanged) {
        job.last_change_time = now;
        job.data_changed_count += 1;
      }
    } else {
      job.last_error_time = now;
      job.status = 'DELAYED';
      job.error_message = errorMsg;
    }

    this.jobStatuses.set(name, job);
    this.emit('job_updated', job);
  }

  public getJobStatuses(): IngestionJobStatus[] {
    return Array.from(this.jobStatuses.values());
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[BackgroundScheduler] Starting ingestion workers...');
  }

  public stop() {
    this.intervals.forEach((iv) => clearInterval(iv));
    this.intervals = [];
    this.isRunning = false;
    console.log('[BackgroundScheduler] Ingestion workers stopped.');
  }
}

export const backgroundScheduler = new BackgroundScheduler();
