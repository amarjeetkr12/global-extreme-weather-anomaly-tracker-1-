import express from 'express';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { globalGridService } from './server/gridService.ts';
import { weatherService } from './server/weatherService.ts';
import { anomalyEngine } from './server/anomalyEngine.ts';
import { cycloneService } from './server/cycloneService.ts';
import { tsunamiService } from './server/tsunamiService.ts';
import { spatioTemporalTracker } from './server/trackingService.ts';
import { dataSourceManager } from './server/dataSourceManager.ts';
import { excelDatasetAdapter } from './server/excelDatasetAdapter.ts';
import { smartCache } from './server/cacheManager.ts';
import { backgroundScheduler } from './server/backgroundScheduler.ts';
import { realtimeStream } from './server/realtimeStream.ts';
import { datasetManager } from './server/datasetManager.ts';
import { aiMeteorologyService } from './server/aiService.ts';
import { satelliteService, SATELLITE_PLATFORMS } from './server/satelliteService.ts';
import { fusionEngine } from './server/fusionEngine.ts';
import { notificationService } from './server/notificationService.ts';
import multer from 'multer';
import { WeatherAnomaly, TrackedWeatherEvent, AlertFeedItem, SystemStats } from './src/types.ts';

loadEnv();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 }, // 35MB
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // In-memory operational store refreshed periodically
  let cachedAnomalies: WeatherAnomaly[] = [];
  let cachedEvents: TrackedWeatherEvent[] = [];
  let cachedAlerts: AlertFeedItem[] = [];
  let lastPipelineRun = new Date().toISOString();

  // Background pipeline runner: Analyzes sample grid cells to produce real anomaly events
  async function runPipeline(): Promise<{ changed: boolean }> {
    const startTime = Date.now();
    try {
      // Analyze a representative sample across India nodes and global key latitude zones
      const indiaNodes = globalGridService.getIndiaNodes();
      const sampleGlobal = globalGridService.getGlobalCells().filter((_, i) => i % 25 === 0);
      const cellsToMonitor = [...indiaNodes.slice(0, 10), ...sampleGlobal.slice(0, 12)];

      const freshAnomalies: WeatherAnomaly[] = [];

      for (const cell of cellsToMonitor) {
        try {
          const w = await weatherService.getForecast(cell.cell_id, cell.lat, cell.lon, cell.node_name);
          const anoms = anomalyEngine.analyzeForecast(w);
          freshAnomalies.push(...anoms);
        } catch (e: any) {
          console.warn(`Pipeline cell scan error ${cell.cell_id}:`, e.message);
        }
      }

      // Check if newly computed anomalies have changed compared to last iteration
      const changeResult = smartCache.detectChange('pipeline:anomalies', freshAnomalies);
      const hasChanged = changeResult.changed || cachedAnomalies.length === 0;

      if (hasChanged) {
        smartCache.set('pipeline:anomalies', freshAnomalies);
        cachedAnomalies = freshAnomalies;
        cachedEvents = spatioTemporalTracker.clusterEvents(freshAnomalies);
        cachedAlerts = spatioTemporalTracker.generateAlertFeed(cachedEvents, freshAnomalies);
        lastPipelineRun = new Date().toISOString();

        // Broadcast real-time update to all connected frontend clients via SSE
        realtimeStream.broadcast('pipeline_update', {
          timestamp: lastPipelineRun,
          anomalies_count: cachedAnomalies.length,
          events_count: cachedEvents.length,
          alerts_count: cachedAlerts.length,
        });

        void notificationService.notifyNewAlerts(cachedAlerts).then((results) => {
          results.forEach((result) => {
            if (result.status !== 'SKIPPED') {
              console.log(`[Notifications] ${result.channel}: ${result.status} - ${result.message}`);
            }
          });
        });

        console.log(`[Pipeline] State changed: ${cachedAnomalies.length} anomalies, ${cachedEvents.length} tracked events. Broadcasted to ${realtimeStream.getConnectedClientsCount()} clients.`);
      } else {
        console.log(`[Pipeline] No meaningful anomaly changes detected. Skipped heavy reprocessing.`);
      }

      backgroundScheduler.recordJobRun('pipeline_runner', true, hasChanged, 5 * 60 * 1000);
      dataSourceManager.updateSourceStatus('SRC_ANOMALY_ENGINE', 'ONLINE', cachedAnomalies.length);
      return { changed: hasChanged };
    } catch (err: any) {
      console.error('Pipeline execution error:', err.message);
      backgroundScheduler.recordJobRun('pipeline_runner', false, false, 60 * 1000, err.message);
      dataSourceManager.updateSourceStatus('SRC_ANOMALY_ENGINE', 'DELAYED', cachedAnomalies.length, err.message);
      return { changed: false };
    }
  }

  // Register scheduler jobs
  backgroundScheduler.registerJob('pipeline_runner', { job_name: 'Continuous Weather Anomaly Pipeline' });
  backgroundScheduler.registerJob('cyclone_fetcher', { job_name: 'Authoritative Cyclone Feed Monitor' });
  backgroundScheduler.registerJob('tsunami_fetcher', { job_name: 'USGS/NOAA Tsunami Bulletin Monitor' });
  backgroundScheduler.registerJob('satellite_fetcher', { job_name: 'Multi-Spectral Satellite Earth Observation Ingestion' });

  // Initial pipeline run and scheduler start
  runPipeline();
  const pipelineInterval = setInterval(runPipeline, 5 * 60 * 1000);

  // Periodic Satellite Observation Ingestion Job
  setInterval(async () => {
    try {
      const result = await satelliteService.refreshObservations();
      realtimeStream.broadcast('satellite_update', { count: result.updated, timestamp: result.timestamp });
      backgroundScheduler.recordJobRun('satellite_fetcher', true, true, 5 * 60 * 1000);
      dataSourceManager.updateSourceStatus('SRC_NOAA_GOES', 'ONLINE', 180);
      dataSourceManager.updateSourceStatus('SRC_EUMETSAT_METEOSAT', 'ONLINE', 144);
      dataSourceManager.updateSourceStatus('SRC_JMA_HIMAWARI', 'ONLINE', 144);
      dataSourceManager.updateSourceStatus('SRC_NASA_GPM', 'ONLINE', 48);
    } catch (e: any) {
      backgroundScheduler.recordJobRun('satellite_fetcher', false, false, 60 * 1000, e.message);
    }
  }, 5 * 60 * 1000);

  // Periodic Cyclone Monitor Job
  setInterval(async () => {
    try {
      const cyclones = await cycloneService.getActiveCyclones();
      const change = smartCache.detectChange('cyclones:active', cyclones);
      if (change.changed) {
        smartCache.set('cyclones:active', cyclones);
        realtimeStream.broadcast('cyclone_update', { count: cyclones.length, cyclones });
      }
      backgroundScheduler.recordJobRun('cyclone_fetcher', true, change.changed, 5 * 60 * 1000);
    } catch (e: any) {
      backgroundScheduler.recordJobRun('cyclone_fetcher', false, false, 60 * 1000, e.message);
    }
  }, 5 * 60 * 1000);

  // Periodic Tsunami Monitor Job
  setInterval(async () => {
    try {
      const tsunamis = await tsunamiService.getActiveTsunamiEvents();
      const change = smartCache.detectChange('tsunamis:active', tsunamis);
      if (change.changed) {
        smartCache.set('tsunamis:active', tsunamis);
        realtimeStream.broadcast('tsunami_update', { count: tsunamis.length, tsunamis });
      }
      backgroundScheduler.recordJobRun('tsunami_fetcher', true, change.changed, 2 * 60 * 1000);
    } catch (e: any) {
      backgroundScheduler.recordJobRun('tsunami_fetcher', false, false, 60 * 1000, e.message);
    }
  }, 2 * 60 * 1000);

  // 1. Health & Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI-Driven Global Extreme Weather Intelligence Platform',
      version: '2.0.0-SIH2026',
      scope: 'GLOBAL + INDIA',
      global_cells: globalGridService.getGlobalCells().length,
      india_nodes: globalGridService.getIndiaNodes().length,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/notifications/status', (req, res) => {
    res.json({ status: 'success', notifications: notificationService.getStatus(), timestamp: new Date().toISOString() });
  });

  // 2. Real-time Server-Sent Events (SSE) Stream
  app.get('/api/stream', (req, res) => {
    realtimeStream.registerClient(res);
  });

  // 3. Global & India Grid Endpoint
  app.get('/api/grid', (req, res) => {
    const region = (req.query.region as string)?.toUpperCase() || 'ALL';
    let cells = globalGridService.getAllCells();

    if (region === 'GLOBAL') {
      cells = globalGridService.getGlobalCells();
    } else if (region === 'INDIA') {
      cells = globalGridService.getIndiaNodes();
    }

    res.json({
      status: 'success',
      region,
      total_cells: cells.length,
      global_cells_count: globalGridService.getGlobalCells().length,
      india_nodes_count: globalGridService.getIndiaNodes().length,
      cells,
      timestamp: new Date().toISOString(),
    });
  });

  // 4. Grid Cell Lookup
  app.get('/api/grid/cell/:cell_id', (req, res) => {
    const cell = globalGridService.getCellById(req.params.cell_id);
    if (!cell) {
      return res.status(404).json({ status: 'error', message: 'Cell ID not found' });
    }
    res.json({ status: 'success', cell });
  });

  // 5. Nearest Cell Locator
  app.get('/api/grid/nearest', (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ status: 'error', message: 'Invalid lat/lon parameters' });
    }
    const cell = globalGridService.findNearestCell(lat, lon);
    res.json({ status: 'success', query: { lat, lon }, nearest_cell: cell });
  });

  // 6. Real Weather & 7-Day Forecast Endpoint
  app.get('/api/weather', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const cellId = (req.query.cell_id as string) || 'UNKNOWN_CELL';
    const locationName = req.query.name as string | undefined;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ status: 'error', message: 'lat and lon are required numeric query parameters' });
    }

    try {
      const weather = await weatherService.getForecast(cellId, lat, lon, locationName);
      res.json({ status: 'success', weather });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 7. Forecast Alias /api/forecast
  app.get('/api/forecast', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const cellId = (req.query.cell_id as string) || 'UNKNOWN_CELL';
    const locationName = req.query.name as string | undefined;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ status: 'error', message: 'lat and lon are required numeric parameters' });
    }

    try {
      const weather = await weatherService.getForecast(cellId, lat, lon, locationName);
      res.json({ status: 'success', forecast: weather.daily, weather });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 8. Extreme Weather Anomalies
  app.get('/api/anomalies', (req, res) => {
    const region = req.query.region as string;
    let list = cachedAnomalies;
    if (region && region.toUpperCase() !== 'ALL') {
      list = list.filter((a) => a.region.toUpperCase() === region.toUpperCase());
    }
    res.json({
      status: 'success',
      count: list.length,
      anomalies: list,
      provenance: 'MODEL_DERIVED',
      last_pipeline_run: lastPipelineRun,
    });
  });

  // 9. Spatio-Temporal Tracked Events
  app.get('/api/events', (req, res) => {
    const region = req.query.region as string;
    let events = cachedEvents;
    if (region && region.toUpperCase() !== 'ALL') {
      events = events.filter((e) => e.region.toUpperCase() === region.toUpperCase());
    }
    res.json({
      status: 'success',
      count: events.length,
      events,
      provenance: 'MODEL_DERIVED',
      last_pipeline_run: lastPipelineRun,
    });
  });

  // 10. Individual Event Details
  app.get('/api/events/:event_id', (req, res) => {
    const evt = cachedEvents.find((e) => e.event_id === req.params.event_id);
    if (!evt) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }
    res.json({ status: 'success', event: evt });
  });

  // 11. Event Evolution History Timeline
  app.get('/api/events/:event_id/history', (req, res) => {
    const history = spatioTemporalTracker.getEventHistory(req.params.event_id);
    res.json({
      status: 'success',
      event_id: req.params.event_id,
      history_points_count: history.length,
      history,
    });
  });

  // 12. Alerts Feed
  app.get('/api/alerts', (req, res) => {
    res.json({
      status: 'success',
      count: cachedAlerts.length,
      alerts: cachedAlerts,
      timestamp: new Date().toISOString(),
    });
  });

  // 13. Cyclones Module
  app.get('/api/cyclones', async (req, res) => {
    try {
      const cyclones = await cycloneService.getActiveCyclones();
      res.json({
        status: 'success',
        count: cyclones.length,
        cyclones,
        provenance: 'GDACS / NOAA / JTWC / IMD',
        data_category: 'OFFICIAL ALERT DATA',
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 14. Tsunami Events Module
  app.get('/api/tsunamis', async (req, res) => {
    try {
      const tsunamis = await tsunamiService.getActiveTsunamiEvents();
      res.json({
        status: 'success',
        count: tsunamis.length,
        tsunamis,
        provenance: 'USGS / NOAA / PTWC',
        data_category: 'OFFICIAL ALERT DATA',
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 14.1 AI Meteorological Executive Briefing (Powered by Gemini + Resilient Fallback Engine)
  app.get('/api/ai/briefing', async (req, res) => {
    try {
      const region = (req.query.region as string) || 'GLOBAL';
      const cyclones = await cycloneService.getActiveCyclones();
      const tsunamis = await tsunamiService.getActiveTsunamiEvents();
      const briefing = await aiMeteorologyService.generateExecutiveBriefing(
        cachedAnomalies,
        cyclones,
        tsunamis,
        region
      );
      res.json({
        status: 'success',
        briefing,
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 14.2 AI Cell Micro-Meteorological Assessment
  app.get('/api/ai/cell-assessment', async (req, res) => {
    try {
      const cellId = req.query.cell_id as string;
      if (!cellId) {
        return res.status(400).json({ status: 'error', message: 'Missing cell_id parameter' });
      }

      const cell = globalGridService.getCellById(cellId);
      if (!cell) {
        return res.status(404).json({ status: 'error', message: `Cell ${cellId} not found` });
      }

      const weather = await weatherService.getForecast(
        cell.cell_id,
        cell.lat,
        cell.lon,
        cell.node_name || cell.cell_id
      );
      const forecast = weather.daily;
      const cellAnomalies = cachedAnomalies.filter(a => a.cell_id === cellId);

      const assessment = await aiMeteorologyService.getCellDetailedAssessment(
        cell,
        weather,
        forecast,
        cellAnomalies
      );

      res.json({
        status: 'success',
        assessment,
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 14.3 AI Engine Status & Diagnostics
  app.get('/api/ai/status', (req, res) => {
    res.json({
      status: 'success',
      ...aiMeteorologyService.getStatus(),
    });
  });

  // 15. Excel Prototype Datasets Endpoint (Connected to Editable Dataset Manager)
  app.get('/api/datasets/prototype', (req, res) => {
    const dataset = req.query.dataset as string;
    const allDatasets = datasetManager.getDatasets(false, false);

    let records: any[] = [];
    if (dataset === 'A' || dataset === 'global') {
      const dsA = allDatasets.find((d) => d.id === 'DS-GLOBAL-PROTO-01' || d.type === 'GLOBAL_EXTREME_WEATHER');
      records = dsA ? dsA.records : excelDatasetAdapter.getGlobalPrototypeDataset();
    } else if (dataset === 'B' || dataset === 'india') {
      const dsB = allDatasets.find((d) => d.id === 'DS-INDIA-SAMPLE-02' || d.type === 'INDIA_EXTREME_WEATHER');
      records = dsB ? dsB.records : excelDatasetAdapter.getIndiaSampleDataset();
    } else {
      // Return records across all active datasets
      records = datasetManager.getAllActiveUserRecords();
      if (records.length === 0) {
        records = excelDatasetAdapter.getAllSampleRecords();
      }
    }

    res.json({
      status: 'success',
      count: records.length,
      records,
      provenance: 'EXCEL_PROTOTYPE / EXCEL_SAMPLE',
      data_category: 'SAMPLE DATA',
      disclaimer: 'User-managed meteorological dataset. Editable records with dual-evidence validation.',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // DATASET MANAGEMENT CRUD & VERSIONING APIS
  // ==========================================

  // 15a. List All Datasets
  app.get('/api/datasets', (req, res) => {
    const includeArchived = req.query.include_archived !== 'false';
    const includeDeleted = req.query.include_deleted === 'true';
    const datasets = datasetManager.getDatasets(includeArchived, includeDeleted);
    res.json({
      status: 'success',
      count: datasets.length,
      datasets,
      timestamp: new Date().toISOString(),
    });
  });

  // 15b. Unified Location Tracker (Historical -> User Ingested -> Live API -> 7-Day Forecast)
  app.get('/api/datasets/location-tracker', async (req, res) => {
    const location = (req.query.location as string) || 'Jaipur';
    try {
      const allCells = globalGridService.getAllCells();
      const match = allCells.find(
        (c) => c.node_name?.toLowerCase().includes(location.toLowerCase()) || location.toLowerCase().includes(c.node_name?.toLowerCase() || '')
      ) || allCells[0];

      let liveWeather: any = null;
      if (match) {
        try {
          liveWeather = await weatherService.getForecast(match.cell_id, match.lat, match.lon, match.node_name);
        } catch (e) {
          // Fallback gracefully
        }
      }

      const timelineData = await datasetManager.getLocationTimeline(location, liveWeather);
      res.json({ status: 'success', data: timelineData });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 15c. Audit Logs
  app.get('/api/datasets/audit/logs', (req, res) => {
    const datasetId = req.query.dataset_id as string;
    const limit = parseInt(req.query.limit as string, 10) || 200;
    const logs = datasetManager.getAuditLogs(datasetId, limit);
    res.json({
      status: 'success',
      count: logs.length,
      logs,
      timestamp: new Date().toISOString(),
    });
  });

  // 15d. Validate File Before Import (Preview + Error Detection)
  app.post('/api/datasets/validate', upload.single('file'), (req, res) => {
    try {
      let buffer: Buffer | null = null;
      let filename = 'uploaded_file.xlsx';
      let forcedType = (req.body.dataset_type as any) || 'AUTO_DETECT';

      if (req.file) {
        buffer = req.file.buffer;
        filename = req.file.originalname;
      } else if (req.body.file_base64) {
        buffer = Buffer.from(req.body.file_base64, 'base64');
        filename = req.body.filename || 'dataset.xlsx';
      }

      if (!buffer) {
        return res.status(400).json({ status: 'error', message: 'No file provided in form-data or JSON body' });
      }

      const validation = datasetManager.validateFile(buffer, filename, forcedType);
      res.json({ status: 'success', validation });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15e. Import New Dataset
  app.post('/api/datasets/import', upload.single('file'), (req, res) => {
    try {
      let buffer: Buffer | null = null;
      let name = (req.body.name as string) || '';
      let type = (req.body.type as any) || 'AUTO_DETECT';
      let description = (req.body.description as string) || '';
      let author = (req.body.author as string) || 'Meteorologist / Operator';

      if (req.file) {
        buffer = req.file.buffer;
        if (!name) name = req.file.originalname.replace(/\.[^/.]+$/, '');
      } else if (req.body.file_base64) {
        buffer = Buffer.from(req.body.file_base64, 'base64');
      }

      if (!buffer) {
        return res.status(400).json({ status: 'error', message: 'No file provided for import' });
      }

      const dataset = datasetManager.importDataset(name, type, description, buffer, author);
      realtimeStream.broadcast('dataset_update', { action: 'IMPORT_DATASET', dataset_id: dataset.id, name: dataset.name });
      res.json({ status: 'success', dataset });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15f. Get Single Dataset by ID
  app.get('/api/datasets/:id', (req, res) => {
    const dataset = datasetManager.getDatasetById(req.params.id);
    if (!dataset) {
      return res.status(404).json({ status: 'error', message: 'Dataset not found' });
    }
    res.json({ status: 'success', dataset });
  });

  // 15e. Update Existing Dataset / Upload New Version (with Diff comparison)
  app.post('/api/datasets/:id/version', upload.single('file'), (req, res) => {
    try {
      const datasetId = req.params.id;
      const previewOnly = req.query.preview_only === 'true';
      let buffer: Buffer | null = null;
      let changeSummary = (req.body.change_summary as string) || '';
      let author = (req.body.author as string) || 'Meteorologist / Operator';

      if (req.file) {
        buffer = req.file.buffer;
      } else if (req.body.file_base64) {
        buffer = Buffer.from(req.body.file_base64, 'base64');
      }

      if (!buffer) {
        return res.status(400).json({ status: 'error', message: 'No file provided for version update' });
      }

      if (previewOnly) {
        const { rows } = datasetManager.parseFileBuffer(buffer);
        const incomingRecords = rows.map((row, idx) =>
          datasetManager.enrichRecord({
            record_id: `INCOMING-${idx + 1}`,
            location: row.Location || row.location || row.city || 'Unknown',
            latitude: parseFloat(row.Latitude ?? row.latitude ?? 0),
            longitude: parseFloat(row.Longitude ?? row.longitude ?? 0),
            forecast_date: row.Forecast_Date || row.forecast_date || new Date().toISOString().split('T')[0],
            forecast_day: parseInt(row.Forecast_Day ?? row.forecast_day ?? 1, 10),
            temperature: parseFloat(row.Temperature_C ?? row.Temperature ?? row.temperature ?? 25),
            historical_temperature: parseFloat(row.Historical_Temp_C ?? row.Historical_Temp ?? 22),
            rainfall: parseFloat(row.Rainfall_mm ?? row.Rainfall ?? 0),
            historical_rainfall: parseFloat(row.Historical_Rainfall_mm ?? row.Historical_Rainfall ?? 0),
            wind_speed: parseFloat(row.Wind_Speed ?? row.wind_speed ?? 10),
            historical_wind: parseFloat(row.Historical_Wind ?? 10),
          })
        );
        const diff = datasetManager.computeVersionDiff(datasetId, incomingRecords);
        return res.json({ status: 'success', preview_only: true, diff });
      }

      const result = datasetManager.updateDatasetVersion(datasetId, buffer, changeSummary, author);
      realtimeStream.broadcast('dataset_update', {
        action: 'NEW_VERSION',
        dataset_id: datasetId,
        version: result.dataset.current_version,
      });
      res.json({ status: 'success', dataset: result.dataset, diff: result.diff });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15f. Restore Historical Version
  app.post('/api/datasets/:id/restore-version/:version', (req, res) => {
    try {
      const version = parseInt(req.params.version, 10);
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const dataset = datasetManager.restoreVersion(req.params.id, version, author);
      realtimeStream.broadcast('dataset_update', {
        action: 'RESTORE_VERSION',
        dataset_id: dataset.id,
        restored_from: version,
        active_version: dataset.current_version,
      });
      res.json({ status: 'success', dataset });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15f-2. Compare Two Arbitrary Historical Versions (Diff View)
  app.get('/api/datasets/:id/compare-versions', (req, res) => {
    try {
      const versionA = parseInt((req.query.versionA || req.query.vA) as string, 10);
      const versionB = parseInt((req.query.versionB || req.query.vB) as string, 10);
      if (isNaN(versionA) || isNaN(versionB)) {
        return res.status(400).json({ status: 'error', message: 'versionA and versionB query parameters required' });
      }
      const diff = datasetManager.compareVersions(req.params.id, versionA, versionB);
      res.json({ status: 'success', versionA, versionB, diff });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15g. Update Dataset Metadata (Rename, Type, Description)
  app.patch('/api/datasets/:id', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const dataset = datasetManager.updateMetadata(req.params.id, req.body, author);
      realtimeStream.broadcast('dataset_update', { action: 'UPDATE_METADATA', dataset_id: dataset.id });
      res.json({ status: 'success', dataset });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15h. Add New Individual Record
  app.post('/api/datasets/:id/records', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const { dataset, record } = datasetManager.addRecord(req.params.id, req.body, author);
      realtimeStream.broadcast('dataset_update', { action: 'ADD_RECORD', dataset_id: dataset.id, record_id: record.record_id });
      res.json({ status: 'success', dataset, record });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15i. Edit Individual Record
  app.put('/api/datasets/:id/records/:record_id', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const { dataset, record } = datasetManager.editRecord(req.params.id, req.params.record_id, req.body, author);
      realtimeStream.broadcast('dataset_update', { action: 'EDIT_RECORD', dataset_id: dataset.id, record_id: record.record_id });
      res.json({ status: 'success', dataset, record });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15j. Delete Individual Record
  app.delete('/api/datasets/:id/records/:record_id', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const { dataset, deleted_record } = datasetManager.deleteRecord(req.params.id, req.params.record_id, author);
      realtimeStream.broadcast('dataset_update', { action: 'DELETE_RECORD', dataset_id: dataset.id, record_id: deleted_record.record_id });
      res.json({ status: 'success', dataset, deleted_record });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15k. Archive Dataset
  app.post('/api/datasets/:id/archive', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const dataset = datasetManager.archiveDataset(req.params.id, author);
      realtimeStream.broadcast('dataset_update', { action: 'ARCHIVE_DATASET', dataset_id: dataset.id });
      res.json({ status: 'success', dataset });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15l. Restore Dataset
  app.post('/api/datasets/:id/restore', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const dataset = datasetManager.restoreDataset(req.params.id, author);
      realtimeStream.broadcast('dataset_update', { action: 'RESTORE_DATASET', dataset_id: dataset.id });
      res.json({ status: 'success', dataset });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15m. Delete Dataset (Soft or Hard)
  app.delete('/api/datasets/:id', (req, res) => {
    try {
      const author = (req.body.author as string) || 'Meteorologist / Operator';
      const hardDelete = req.query.hard === 'true';
      const result = datasetManager.deleteDataset(req.params.id, author, hardDelete);
      realtimeStream.broadcast('dataset_update', { action: 'DELETE_DATASET', dataset_id: req.params.id, hardDelete });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  // 15n. Export Dataset as CSV or Excel
  app.get('/api/datasets/:id/export', (req, res) => {
    try {
      const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
      const { filename, buffer, mimeType } = datasetManager.exportDataset(req.params.id, format);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err: any) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  });

  // 15o. Time-Series Tracked Events - List All & Live Tracking Status
  app.get('/api/time-series-events', (req, res) => {
    try {
      const events = datasetManager.getTimeSeriesEvents();
      const liveStatus = datasetManager.getLiveTrackingStatus();
      res.json({
        status: 'success',
        events,
        live_status: liveStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 15p. Single Time-Series Tracked Event Details
  app.get('/api/time-series-events/:id', (req, res) => {
    try {
      const event = datasetManager.getTimeSeriesEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ status: 'error', message: `Event ${req.params.id} not found` });
      }
      res.json({ status: 'success', event });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 15q. Trigger Live API Telemetry Sync into Time-Series Evolution
  app.post('/api/time-series-events/sync-live', async (req, res) => {
    try {
      const result = await datasetManager.syncLiveApiTracking(weatherService, realtimeStream);
      res.json({
        status: 'success',
        message: `Successfully synchronized live telemetry for ${result.updatedCount} monitored locations.`,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 15r. Toggle Live Tracking Active State
  app.post('/api/time-series-events/toggle-live', (req, res) => {
    try {
      const { active } = req.body;
      const newState = datasetManager.toggleLiveTracking(active);
      realtimeStream.broadcast('live_tracking_toggle', { active: newState });
      res.json({ status: 'success', is_tracking_active: newState });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 16. Data Sources Status & Provenance
  app.get('/api/data-sources', (req, res) => {
    const sources = dataSourceManager.getAllSources();
    res.json({
      status: 'success',
      sources,
      timestamp: new Date().toISOString(),
    });
  });

  // 16b. Live Data Source Connection Tester
  app.get('/api/data-sources/test', async (req, res) => {
    const sourceId = req.query.source_id as string;
    if (!sourceId) {
      return res.status(400).json({ status: 'error', message: 'source_id parameter required' });
    }
    const result = await dataSourceManager.testSourceConnection(sourceId);
    res.json({ status: 'success', test_result: result });
  });

  // 16c. Test All Registered Operational Data Sources
  app.post('/api/data-sources/test-all', async (req, res) => {
    const sources = dataSourceManager.getAllSources();
    const results = await Promise.all(
      sources.map((s) => dataSourceManager.testSourceConnection(s.source_id))
    );
    res.json({
      status: 'success',
      count: results.length,
      online_count: results.filter((r) => r.status === 'ONLINE').length,
      average_ping_ms: Math.round(results.reduce((acc, r) => acc + r.ping_ms, 0) / results.length),
      results,
      tested_at: new Date().toISOString(),
    });
  });

  // 16d. Authoritative Meteorological Classification Standards
  app.get('/api/standards', (req, res) => {
    const standards = dataSourceManager.getClassificationStandards();
    res.json({
      status: 'success',
      count: standards.length,
      standards,
      provenance: 'OFFICIAL_METEOROLOGICAL_ORGANIZATIONS',
      disclaimer: 'Official classification criteria sourced from IMD, WMO, NOAA, USGS, and PTWC manuals.',
      timestamp: new Date().toISOString(),
    });
  });

  // 17. System Health, Cache & Scheduler Status
  app.get('/api/system/status', (req, res) => {
    res.json({
      status: 'success',
      backend: 'ONLINE',
      cache: smartCache.getStats(),
      scheduler_jobs: backgroundScheduler.getJobStatuses(),
      connected_sse_clients: realtimeStream.getConnectedClientsCount(),
      config: backgroundScheduler.getConfig(),
      last_pipeline_run: lastPipelineRun,
    });
  });

  // 18. ML Engine Status Endpoint
  app.get('/api/ml/status', (req, res) => {
    res.json({
      status: 'success',
      engine: 'Dual-Evidence Spatio-Temporal Anomaly Engine',
      statistical_zscore: 'Active (Rolling 30-Day Window)',
      robust_iqr: 'Active (Median / Interquartile Range)',
      isolation_forest: 'Active (Multivariate Temperature, Pressure, Wind)',
      total_anomalies: cachedAnomalies.length,
      total_events: cachedEvents.length,
      last_run: lastPipelineRun,
    });
  });

  // 19. Manual Pipeline Trigger
  app.post('/api/pipeline/run', async (req, res) => {
    const result = await runPipeline();
    res.json({
      status: 'success',
      message: 'Pipeline executed successfully',
      data_changed: result.changed,
      anomalies_detected: cachedAnomalies.length,
      events_tracked: cachedEvents.length,
      last_run: lastPipelineRun,
    });
  });

  // 20. System Stats KPI
  app.get('/api/stats', async (req, res) => {
    const cyclones = await cycloneService.getActiveCyclones();
    const tsunamis = await tsunamiService.getActiveTsunamiEvents();
    const sources = dataSourceManager.getAllSources();

    const stats: SystemStats = {
      status: 'OPERATIONAL',
      region_coverage: 'GLOBAL + INDIA DUAL-TIER',
      global_cells_count: globalGridService.getGlobalCells().length,
      india_nodes_count: globalGridService.getIndiaNodes().length,
      total_cells: globalGridService.getAllCells().length,
      active_events_count: cachedEvents.length,
      extreme_anomalies_count: cachedAnomalies.length,
      active_cyclones_count: cyclones.length,
      active_tsunamis_count: tsunamis.length,
      high_risk_events_count: cachedEvents.filter((e) => e.risk_level === 'HIGH' || e.risk_level === 'SEVERE' || e.risk_level === 'CRITICAL').length,
      severe_events_count: cachedEvents.filter((e) => e.risk_level === 'SEVERE' || e.risk_level === 'CRITICAL').length,
      sources_online_count: sources.filter((s) => s.status === 'ONLINE').length,
      total_sources_count: sources.length,
      engine_version: '2.0.0-SIH2026',
      last_pipeline_run: lastPipelineRun,
      connected_clients_count: realtimeStream.getConnectedClientsCount(),
    };

    res.json(stats);
  });

  // 21. Satellite Observations Layer Endpoint
  app.get('/api/satellite/observations', async (req, res) => {
    try {
      const satellite = req.query.satellite as string;
      const variable = req.query.variable as any;
      const region = req.query.region as string;

      const result = await satelliteService.getLatestObservations({
        satellite,
        variable,
        region,
      });

      res.json({
        status: 'success',
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 22. Rapid 0-6h Satellite Nowcasting Endpoint
  app.get('/api/satellite/nowcasting', (req, res) => {
    try {
      const nowcasts = satelliteService.getNowcastEvents();
      res.json({
        status: 'success',
        count: nowcasts.length,
        nowcasts,
        lead_window: 'NOWCAST (0-6h)',
        provenance: 'SATELLITE OBSERVATION',
        scientific_disclaimer:
          'Satellite observations and model outputs are used for monitoring and decision-support. This system does not replace official meteorological or tsunami warnings and does not guarantee future event occurrence.',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 23. Satellite Platforms Catalog
  app.get('/api/satellite/platforms', (req, res) => {
    res.json({
      status: 'success',
      platforms: Object.values(SATELLITE_PLATFORMS),
      timestamp: new Date().toISOString(),
    });
  });

  // 24. Force Satellite Pass Ingestion & Recalculation
  app.post('/api/satellite/refresh', async (req, res) => {
    try {
      const result = await satelliteService.refreshObservations();
      realtimeStream.broadcast('satellite_update', { count: result.updated, timestamp: result.timestamp });
      res.json({
        status: 'success',
        message: `Successfully ingested fresh satellite passes for ${result.updated} strategic observation nodes.`,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 25. Multi-Source Unified Evidence Fusion Endpoint (10 Hazard Categories)
  app.get('/api/intelligence/unified', async (req, res) => {
    try {
      const cyclones = await cycloneService.getActiveCyclones();
      const tsunamis = await tsunamiService.getActiveTsunamiEvents();
      const cells = globalGridService.getAllCells();
      const satRes = await satelliteService.getLatestObservations();

      const fusedRecords = fusionEngine.generateUnifiedEvidence(
        cells,
        cachedAnomalies,
        cyclones,
        tsunamis,
        satRes.observations
      );

      res.json({
        status: 'success',
        count: fusedRecords.length,
        fused_records: fusedRecords,
        hierarchy_precedence: [
          '1. OFFICIAL WARNING (Highest)',
          '2. DIRECT OBSERVATION',
          '3. SATELLITE OBSERVATION',
          '4. NUMERICAL FORECAST',
          '5. MODEL-DERIVED ANALYSIS',
          '6. USER DATA / SAMPLE DATA',
        ],
        scientific_disclaimer:
          'Satellite observations and model outputs are used for monitoring and decision-support. This system does not replace official meteorological or tsunami warnings and does not guarantee future event occurrence.',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 26. 4-Way Dataset Comparison Matrix (Excel vs Satellite vs Live Forecast vs Anomaly)
  app.get('/api/intelligence/comparison-4way', (req, res) => {
    try {
      const matrix = fusionEngine.generateFourWayComparison();
      res.json({
        status: 'success',
        count: matrix.length,
        matrix,
        columns: [
          'Excel Historical / Ground-Truth',
          'Satellite Observation (IR/Precip/SST)',
          'Live Numerical Forecast (GFS/ECMWF)',
          'Model-Derived Statistical Anomaly',
        ],
        scientific_disclaimer:
          'Satellite observations and model outputs are used for monitoring and decision-support. This system does not replace official meteorological or tsunami warnings and does not guarantee future event occurrence.',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Vite middleware setup for React frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Global Extreme Weather Platform listening on http://localhost:${PORT}`);
  });
}

startServer();
