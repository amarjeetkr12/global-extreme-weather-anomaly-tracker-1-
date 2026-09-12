# AI-Driven Spatio-Temporal Tracking of Extreme Weather Anomalies
## Smart India Hackathon (SIH) 2026

A professional worldwide meteorological intelligence and extreme-weather anomaly tracking platform that integrates global 7-day numerical weather forecasts, dual-evidence statistical/ML anomaly detection, tropical cyclone tracking, tsunami alerts, and spatio-temporal clustering with first-class India visibility.

---

### Key Capabilities
1. **Worldwide Monitoring Mesh & India Visibility**:
   - **703 Global Monitoring Cells** ($10^\circ$ resolution spanning $-90^\circ$ to $+90^\circ$ Lat, $-180^\circ$ to $+180^\circ$ Lon).
   - **28 India High-Density Monitoring Nodes** covering all major climatological and oceanic regions (New Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Port Blair, Kavaratti, Himalayas, Western Ghats).
2. **7-Day Medium-Range Numerical Weather Forecasts**:
   - Real-time ingestion via Open-Meteo standard forecast APIs (no mandatory API keys required).
   - Automatic local timezone resolution (`timezone=auto`).
   - Derived physical diagnostics: Heat Index (Rothfusz equation), Vapor Pressure Deficit (VPD, Tetens equation), and Wind Chill (NOAA equation).
3. **Dual-Evidence Explainable Anomaly Engine**:
   - Time- and season-aware climatological baselines.
   - Robust IQR ratios, statistical Z-scores, and Isolation Forest multivariate anomaly scores.
   - Anomaly types: Heatwave, Coldwave, Extreme Precipitation, High Wind/Gales, and Pressure Anomalies.
4. **Authoritative Cyclone & Tsunami Modules**:
   - Tropical Cyclones / Typhoons / Hurricanes: Tracked via authoritative NOAA NHC, JTWC, IMD, and GDACS feeds with distinct observed vs forecast track geometry.
   - Tsunamis: Real-time oceanic displacement events and bulletins ingested from USGS Significant Seismic Feeds and NOAA/PTWC.
   - Zero fabricated disaster data: Displays "No active event detected" when basins are quiet.
5. **Spatio-Temporal Event Tracking**:
   - Haversine great-circle clustering grouping contiguous affected cells into unified events (`EVT-2026-...`).
   - Tracks event centroid, persistence, movement heading, and intensity trends.
6. **Data Provenance & Operational Distinctions**:
   - Explicit labeling across all records: `OBSERVED DATA`, `FORECAST DATA`, `MODEL-DERIVED DATA`, `OFFICIAL ALERT DATA`, and `FALLBACK DATA`.
7. **Clean Light Interactive World Map**:
   - 100% free OpenStreetMap standard tile provider.
   - Toggleable overlays for Grid Cells, Extreme Anomalies, Cyclones, Tsunamis, and Spatio-temporal Clusters.
   - India Focus and Worldwide zoom presets.

---

### Architecture & Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Lucide Icons.
- **Backend & Middleware**: Express / Node.js with native TypeScript type stripping (`tsx`), REST API endpoints.
- **Data Ingestion**: Open-Meteo, NOAA NHC, JTWC, IMD, USGS, PTWC, GDACS.
- **Testing**: Automated test suite (`tsx tests/grid.test.ts`).

---

### Core API Endpoints
- `GET /api/health`: System health, operational version, and node counts.
- `GET /api/grid?region=ALL|GLOBAL|INDIA`: Returns 703 global cells and/or 28 India nodes.
- `GET /api/grid/cell/:cell_id`: Detailed cell metadata by unique ID.
- `GET /api/grid/nearest?lat={lat}&lon={lon}`: Spatial lookup for arbitrary global coordinates.
- `GET /api/weather?lat={lat}&lon={lon}&cell_id={id}`: Live 7-day numerical forecast.
- `GET /api/anomalies?region=ALL|GLOBAL|INDIA`: Model-derived anomaly detections.
- `GET /api/events?region=ALL|GLOBAL|INDIA`: Spatio-temporally clustered weather systems.
- `GET /api/cyclones`: Active tropical cyclones with observed and forecast tracks.
- `GET /api/tsunamis`: Significant seismic displacement events and tsunami threat bulletins.
- `GET /api/alerts`: Actionable operational alert feed.
- `GET /api/data-sources`: Status and classification of all 8 authoritative data sources.
- `POST /api/pipeline/run`: Manual pipeline execution trigger.
- `GET /api/stats`: Real-time KPI telemetry.

---

### Running Locally
```bash
# Install dependencies
npm install

# Run development server (binds to http://localhost:3000)
npm run dev

# Run test suite
npm run test

# Run linter
npm run lint

# Production build
npm run build
```

---

### Operational Disclaimer
This platform provides weather intelligence, medium-range forecast analysis, statistical anomaly detection, and decision-support information. It does not replace official meteorological or emergency-management warnings issued by national authorities (such as IMD, NOAA, JTWC, or NDMA). Model-derived risks are not guaranteed predictions.
