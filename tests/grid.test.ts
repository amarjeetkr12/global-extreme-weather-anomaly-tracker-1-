import { globalGridService } from '../server/gridService.ts';
import { calculateHeatIndex, calculateVPD, calculateWindChill } from '../server/weatherService.ts';
import { haversineDistanceKm } from '../server/trackingService.ts';
import { weatherService } from '../server/weatherService.ts';
import { anomalyEngine } from '../server/anomalyEngine.ts';
import { cycloneService } from '../server/cycloneService.ts';
import { tsunamiService } from '../server/tsunamiService.ts';
import { spatioTemporalTracker } from '../server/trackingService.ts';
import { dataSourceManager } from '../server/dataSourceManager.ts';
import { excelDatasetAdapter } from '../server/excelDatasetAdapter.ts';
import { smartCache } from '../server/cacheManager.ts';
import { backgroundScheduler } from '../server/backgroundScheduler.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- EXTREME WEATHER INTELLIGENCE TEST SUITE ---');

  // 1. Grid Structure Tests
  const globalCells = globalGridService.getGlobalCells();
  const indiaNodes = globalGridService.getIndiaNodes();
  const allCells = globalGridService.getAllCells();

  assert(globalCells.length === 703, `Global monitoring cells must equal 703 (found: ${globalCells.length})`);
  assert(indiaNodes.length === 28, `India monitoring nodes must equal 28 (found: ${indiaNodes.length})`);
  assert(allCells.length === 731, `Total monitoring units must equal 731 (found: ${allCells.length})`);

  // 2. Climatological / Physical Formula Tests
  const hi = calculateHeatIndex(35, 70);
  assert(hi > 35, `Heat Index at 35°C & 70% RH is elevated (${hi}°C)`);

  const vpd = calculateVPD(25, 60);
  assert(vpd > 1.0 && vpd < 3.0, `VPD calculated accurately (${vpd} kPa)`);

  const wc = calculateWindChill(5, 30);
  assert(wc < 5, `Wind chill below air temperature under high wind (${wc}°C)`);

  // 3. Haversine distance tests
  const dist = haversineDistanceKm(28.6139, 77.209, 19.076, 72.8777); // Delhi to Mumbai (~1150km)
  assert(dist > 1100 && dist < 1200, `Haversine distance Delhi to Mumbai valid (~${Math.round(dist)} km)`);

  // 4. Smart Cache & Cryptographic Change Detection
  const key = 'test:key:1';
  const testDataA = { temp: 25, status: 'NORMAL' };
  const testDataB = { temp: 25, status: 'NORMAL' };
  const testDataC = { temp: 32, status: 'HEATWAVE' };

  smartCache.set(key, testDataA);
  const change1 = smartCache.detectChange(key, testDataB);
  assert(!change1.changed, 'Identical payload does NOT trigger change detection');

  const change2 = smartCache.detectChange(key, testDataC);
  assert(change2.changed, 'Modified payload accurately triggers change detection');

  // 5. Excel Datasets Tolerant Ingestion
  const prototypeA = excelDatasetAdapter.getGlobalPrototypeDataset();
  const sampleB = excelDatasetAdapter.getIndiaSampleDataset();
  const allSampleRecords = excelDatasetAdapter.getAllSampleRecords();

  assert(prototypeA.length >= 14, `Dataset A loaded successfully (${prototypeA.length} locations)`);
  assert(sampleB.length >= 6, `Dataset B loaded successfully (${sampleB.length} Indian locations)`);
  assert(allSampleRecords.every((r) => r.is_sample === true), 'All Excel records labeled with is_sample=true');
  assert(allSampleRecords.every((r) => r.provenance === 'EXCEL_PROTOTYPE' || r.provenance === 'EXCEL_SAMPLE'), 'Provenance tags strictly preserved');

  // 6. Background Scheduler Config
  const config = backgroundScheduler.getConfig();
  assert(config.WEATHER_REFRESH_INTERVAL_MS === 5 * 60 * 1000, 'Configurable Weather refresh interval present');
  assert(config.API_RETRY_COUNT === 3, 'Configurable API retry count present');

  // 7. Live Weather & Anomaly Engine
  console.log('Testing live Open-Meteo standard forecast for New Delhi...');
  const weather = await weatherService.getForecast('NODE_IND_N28.61_E77.21', 28.6139, 77.209, 'New Delhi');
  assert(weather.daily.length === 7, `Forecast returns 7-day medium-range entries (${weather.daily.length})`);
  assert(typeof weather.current.temperature === 'number', `Current temperature returned (${weather.current.temperature}°C)`);

  const anomalies = anomalyEngine.analyzeForecast(weather);
  assert(Array.isArray(anomalies), 'Anomaly engine executes dual-evidence scan without error');

  // 8. Event Tracking with History Timeline
  const events = spatioTemporalTracker.clusterEvents(anomalies);
  assert(Array.isArray(events), 'Spatio-temporal clustering operational');
  if (events.length > 0) {
    const history = spatioTemporalTracker.getEventHistory(events[0].event_id);
    assert(Array.isArray(history), 'Event history points recorded');
  }

  // 9. Data Sources Provenance Check
  const sources = dataSourceManager.getAllSources();
  assert(sources.length >= 10, `All data sources configured (${sources.length})`);
  assert(sources.some((s) => s.classification === 'PROTOTYPE'), 'Prototype sources present and categorized');

  // 10. AI Meteorology Service & Resilient Fallback Engine
  const { aiMeteorologyService } = await import('../server/aiService.ts');
  const briefing = await aiMeteorologyService.generateExecutiveBriefing(anomalies, [], [], 'GLOBAL');
  assert(typeof briefing.headline === 'string' && briefing.headline.length > 0, `AI Briefing headline generated (${briefing.headline.slice(0, 30)}...)`);
  assert(briefing.priorityThreatZones !== undefined, 'AI Briefing priority zones structured correctly');
  assert(briefing.provider === 'GEMINI_AI' || briefing.provider === 'METEOROLOGICAL_ENGINE', `AI Briefing provider operational (${briefing.provider})`);

  const cellDelhi = globalGridService.getCellById('NODE_IND_N28.61_E77.21');
  if (cellDelhi) {
    const assessment = await aiMeteorologyService.getCellDetailedAssessment(cellDelhi, weather, weather.daily, anomalies);
    assert(typeof assessment.synopticDiagnosis === 'string', `Cell micro-assessment generated (${assessment.locationName})`);
  }

  // 11. Satellite Observation Layer & Nowcasting Engine Tests
  const { satelliteService, SATELLITE_PLATFORMS } = await import('../server/satelliteService.ts');
  const satResult = await satelliteService.getLatestObservations();
  assert(satResult.count >= 20, `Satellite observations ingested across key basins (${satResult.count})`);
  assert(satResult.data_category === 'SATELLITE OBSERVATION', 'Satellite data category strictly labeled SATELLITE OBSERVATION');
  assert(Object.keys(SATELLITE_PLATFORMS).length >= 5, `Major geostationary & polar platforms registered (${Object.keys(SATELLITE_PLATFORMS).length})`);
  assert(satResult.observations.every((o) => o.provenance_label === 'SATELLITE OBSERVATION'), 'All observations labeled with SATELLITE OBSERVATION provenance');

  const nowcasts = satelliteService.getNowcastEvents();
  assert(Array.isArray(nowcasts), 'Nowcasting events array generated');

  // 12. Multi-Source Fusion & 4-Way Comparison Engine Tests
  const { fusionEngine } = await import('../server/fusionEngine.ts');
  const cyclonesList = await cycloneService.getActiveCyclones();
  const tsunamisList = await tsunamiService.getActiveTsunamiEvents();
  const fusedEvidence = fusionEngine.generateUnifiedEvidence(
    allCells,
    anomalies,
    cyclonesList,
    tsunamisList,
    satResult.observations
  );
  assert(Array.isArray(fusedEvidence), 'Unified multi-source evidence generated successfully');
  if (fusedEvidence.length > 0) {
    assert(fusedEvidence.every((f) => f.sources_breakdown.length >= 2), 'Multi-source cross-verification includes multiple independent sources');
  }

  const fourWay = fusionEngine.generateFourWayComparison();
  assert(fourWay.length >= 10, `4-Way comparison matrix populated (${fourWay.length} locations)`);
  assert(fourWay.every((fw) => fw.satellite_observation !== undefined && fw.live_forecast !== undefined), '4-Way comparison contains satellite and live forecast pillars');

  console.log('-----------------------------------------------');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
