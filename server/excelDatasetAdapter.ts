import { DataProvenance, DataCategory, RiskLevel, HazardType } from '../src/types.ts';
import { calculateHeatIndex, calculateVPD, calculateWindChill } from './weatherService.ts';

export interface NormalizedWeatherRecord {
  record_id: string;
  location: string;
  continent?: string;
  country?: string;
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
  heat_index?: number;
  vpd?: number;
  wind_chill?: number;
  provenance: DataProvenance;
  data_category: DataCategory;
  is_forecast: boolean;
  is_sample: boolean;
  dataset_name: string;
  raw_extra?: Record<string, any>;
}

/**
 * Prototype Dataset A: Global Extreme Weather Anomaly Prototype
 * Contains diverse global locations across continents
 */
export const GLOBAL_PROTOTYPE_DATASET_A: Record<string, any>[] = [
  {
    Continent: 'Asia',
    Country: 'India',
    Location: 'Jaipur',
    Latitude: 26.9124,
    Longitude: 75.7873,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 38.5,
    Historical_Temp_C: 32.1,
    Temp_Anomaly_C: 6.4,
    Rainfall_mm: 0.0,
    Historical_Rainfall_mm: 2.1,
    Rainfall_Anomaly_mm: -2.1,
    Wind_Speed: 18.2,
    Historical_Wind: 12.0,
    Wind_Anomaly: 6.2,
    Relative_Humidity: 48,
    Status: 'Developing Heatwave Signal',
  },
  {
    Continent: 'Asia',
    Country: 'India',
    Location: 'Jaipur',
    Latitude: 26.9124,
    Longitude: 75.7873,
    Forecast_Date: '2026-09-13',
    Forecast_Day: 2,
    Temperature_C: 40.2,
    Historical_Temp_C: 32.0,
    Temp_Anomaly_C: 8.2,
    Rainfall_mm: 0.0,
    Historical_Rainfall_mm: 1.8,
    Rainfall_Anomaly_mm: -1.8,
    Wind_Speed: 21.0,
    Historical_Wind: 11.8,
    Wind_Anomaly: 9.2,
    Relative_Humidity: 42,
    Status: 'Persistent Heatwave Anomaly',
  },
  {
    Continent: 'Asia',
    Country: 'Japan',
    Location: 'Tokyo',
    Latitude: 35.6762,
    Longitude: 139.6503,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 25.4,
    Historical_Temp_C: 24.0,
    Temp_Anomaly_C: 1.4,
    Rainfall_mm: 48.0,
    Historical_Rainfall_mm: 8.5,
    Rainfall_Anomaly_mm: 39.5,
    Wind_Speed: 42.0,
    Historical_Wind: 16.0,
    Wind_Anomaly: 26.0,
    Relative_Humidity: 88,
    Status: 'Maritime Tropical Low Pressure',
  },
  {
    Continent: 'Asia',
    Country: 'China',
    Location: 'Shanghai',
    Latitude: 31.2304,
    Longitude: 121.4737,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 28.1,
    Historical_Temp_C: 26.5,
    Temp_Anomaly_C: 1.6,
    Rainfall_mm: 72.5,
    Historical_Rainfall_mm: 11.2,
    Rainfall_Anomaly_mm: 61.3,
    Wind_Speed: 54.0,
    Historical_Wind: 18.5,
    Wind_Anomaly: 35.5,
    Relative_Humidity: 92,
    Status: 'Extreme Precipitation Anomaly',
  },
  {
    Continent: 'Asia',
    Country: 'Indonesia',
    Location: 'Jakarta',
    Latitude: -6.2088,
    Longitude: 106.8456,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 33.2,
    Historical_Temp_C: 31.0,
    Temp_Anomaly_C: 2.2,
    Rainfall_mm: 65.0,
    Historical_Rainfall_mm: 9.0,
    Rainfall_Anomaly_mm: 56.0,
    Wind_Speed: 19.5,
    Historical_Wind: 12.0,
    Wind_Anomaly: 7.5,
    Relative_Humidity: 85,
    Status: 'Equatorial Convective Cluster',
  },
  {
    Continent: 'Europe',
    Country: 'United Kingdom',
    Location: 'London',
    Latitude: 51.5074,
    Longitude: -0.1278,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 18.2,
    Historical_Temp_C: 17.5,
    Temp_Anomaly_C: 0.7,
    Rainfall_mm: 14.2,
    Historical_Rainfall_mm: 3.1,
    Rainfall_Anomaly_mm: 11.1,
    Wind_Speed: 38.0,
    Historical_Wind: 20.0,
    Wind_Anomaly: 18.0,
    Relative_Humidity: 78,
    Status: 'North Atlantic Frontal System',
  },
  {
    Continent: 'Europe',
    Country: 'Germany',
    Location: 'Berlin',
    Latitude: 52.52,
    Longitude: 13.405,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 21.0,
    Historical_Temp_C: 18.0,
    Temp_Anomaly_C: 3.0,
    Rainfall_mm: 2.0,
    Historical_Rainfall_mm: 2.4,
    Rainfall_Anomaly_mm: -0.4,
    Wind_Speed: 14.0,
    Historical_Wind: 13.0,
    Wind_Anomaly: 1.0,
    Relative_Humidity: 62,
    Status: 'Moderate Thermal Positive Signal',
  },
  {
    Continent: 'Europe',
    Country: 'Italy',
    Location: 'Rome',
    Latitude: 41.9028,
    Longitude: 12.4964,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 31.8,
    Historical_Temp_C: 26.2,
    Temp_Anomaly_C: 5.6,
    Rainfall_mm: 0.0,
    Historical_Rainfall_mm: 1.5,
    Rainfall_Anomaly_mm: -1.5,
    Wind_Speed: 12.0,
    Historical_Wind: 10.0,
    Wind_Anomaly: 2.0,
    Relative_Humidity: 45,
    Status: 'Mediterranean Heat Ridge',
  },
  {
    Continent: 'Africa',
    Country: 'Nigeria',
    Location: 'Lagos',
    Latitude: 6.5244,
    Longitude: 3.3792,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 30.5,
    Historical_Temp_C: 28.5,
    Temp_Anomaly_C: 2.0,
    Rainfall_mm: 52.0,
    Historical_Rainfall_mm: 12.0,
    Rainfall_Anomaly_mm: 40.0,
    Wind_Speed: 22.0,
    Historical_Wind: 14.0,
    Wind_Anomaly: 8.0,
    Relative_Humidity: 84,
    Status: 'Monsoonal Heavy Rain Anomaly',
  },
  {
    Continent: 'Africa',
    Country: 'South Africa',
    Location: 'Cape Town',
    Latitude: -33.9249,
    Longitude: 18.4241,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 13.5,
    Historical_Temp_C: 17.0,
    Temp_Anomaly_C: -3.5,
    Rainfall_mm: 31.0,
    Historical_Rainfall_mm: 4.0,
    Rainfall_Anomaly_mm: 27.0,
    Wind_Speed: 52.0,
    Historical_Wind: 24.0,
    Wind_Anomaly: 28.0,
    Relative_Humidity: 89,
    Status: 'Sub-Antarctic Cold Gale System',
  },
  {
    Continent: 'Africa',
    Country: 'Egypt',
    Location: 'Cairo',
    Latitude: 30.0444,
    Longitude: 31.2357,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 39.4,
    Historical_Temp_C: 33.5,
    Temp_Anomaly_C: 5.9,
    Rainfall_mm: 0.0,
    Historical_Rainfall_mm: 0.0,
    Rainfall_Anomaly_mm: 0.0,
    Wind_Speed: 24.0,
    Historical_Wind: 15.0,
    Wind_Anomaly: 9.0,
    Relative_Humidity: 32,
    Status: 'Saharan Plume Heatwave',
  },
  {
    Continent: 'Oceania',
    Country: 'Australia',
    Location: 'Sydney',
    Latitude: -33.8688,
    Longitude: 151.2093,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 22.4,
    Historical_Temp_C: 20.0,
    Temp_Anomaly_C: 2.4,
    Rainfall_mm: 12.0,
    Historical_Rainfall_mm: 3.5,
    Rainfall_Anomaly_mm: 8.5,
    Wind_Speed: 28.0,
    Historical_Wind: 18.0,
    Wind_Anomaly: 10.0,
    Relative_Humidity: 65,
    Status: 'Tasman Sea Low Pressure',
  },
  {
    Continent: 'Oceania',
    Country: 'Australia',
    Location: 'Darwin',
    Latitude: -12.4634,
    Longitude: 130.8456,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 35.8,
    Historical_Temp_C: 32.2,
    Temp_Anomaly_C: 3.6,
    Rainfall_mm: 15.0,
    Historical_Rainfall_mm: 2.0,
    Rainfall_Anomaly_mm: 13.0,
    Wind_Speed: 25.0,
    Historical_Wind: 16.0,
    Wind_Anomaly: 9.0,
    Relative_Humidity: 70,
    Status: 'Top End Thermal Anomaly',
  },
  {
    Continent: 'Oceania',
    Country: 'New Zealand',
    Location: 'Auckland',
    Latitude: -36.8485,
    Longitude: 174.7633,
    Forecast_Date: '2026-09-12',
    Forecast_Day: 1,
    Temperature_C: 15.2,
    Historical_Temp_C: 16.0,
    Temp_Anomaly_C: -0.8,
    Rainfall_mm: 22.0,
    Historical_Rainfall_mm: 6.0,
    Rainfall_Anomaly_mm: 16.0,
    Wind_Speed: 45.0,
    Historical_Wind: 22.0,
    Wind_Anomaly: 23.0,
    Relative_Humidity: 82,
    Status: 'Southern Ocean Trough',
  },
];

/**
 * Prototype Dataset B: Extreme Weather Anomaly Sample Dataset (India-Focused)
 */
export const INDIA_SAMPLE_DATASET_B: Record<string, any>[] = [
  {
    Forecast_Date: '2026-09-12',
    Location: 'Jaipur, Rajasthan',
    Latitude: 26.9124,
    Longitude: 75.7873,
    Forecast_Day: 1,
    Temperature: 39.1,
    Historical_Temp: 32.1,
    Temp_Anomaly: 7.0,
    Rainfall: 0.0,
    Historical_Rainfall: 2.0,
    Rainfall_Anomaly: -2.0,
    Wind_Speed: 17.5,
    Historical_Wind: 11.5,
    Wind_Anomaly: 6.0,
    Relative_Humidity: 46,
    District: 'Jaipur',
    State: 'Rajasthan',
  },
  {
    Forecast_Date: '2026-09-12',
    Location: 'Ahmedabad, Gujarat',
    Latitude: 23.0225,
    Longitude: 72.5714,
    Forecast_Day: 1,
    Temperature: 38.6,
    Historical_Temp: 33.0,
    Temp_Anomaly: 5.6,
    Rainfall: 1.2,
    Historical_Rainfall: 3.5,
    Rainfall_Anomaly: -2.3,
    Wind_Speed: 15.0,
    Historical_Wind: 11.0,
    Wind_Anomaly: 4.0,
    Relative_Humidity: 52,
    District: 'Ahmedabad',
    State: 'Gujarat',
  },
  {
    Forecast_Date: '2026-09-12',
    Location: 'Mumbai, Maharashtra',
    Latitude: 19.076,
    Longitude: 72.8777,
    Forecast_Day: 1,
    Temperature: 31.5,
    Historical_Temp: 30.2,
    Temp_Anomaly: 1.3,
    Rainfall: 85.0,
    Historical_Rainfall: 18.0,
    Rainfall_Anomaly: 67.0,
    Wind_Speed: 44.0,
    Historical_Wind: 18.0,
    Wind_Anomaly: 26.0,
    Relative_Humidity: 91,
    District: 'Mumbai Coastal',
    State: 'Maharashtra',
  },
  {
    Forecast_Date: '2026-09-12',
    Location: 'Kolkata, West Bengal',
    Latitude: 22.5726,
    Longitude: 88.3639,
    Forecast_Day: 1,
    Temperature: 33.8,
    Historical_Temp: 31.5,
    Temp_Anomaly: 2.3,
    Rainfall: 56.0,
    Historical_Rainfall: 12.5,
    Rainfall_Anomaly: 43.5,
    Wind_Speed: 36.0,
    Historical_Wind: 14.0,
    Wind_Anomaly: 22.0,
    Relative_Humidity: 88,
    District: 'Kolkata Urban',
    State: 'West Bengal',
  },
  {
    Forecast_Date: '2026-09-12',
    Location: 'Chennai, Tamil Nadu',
    Latitude: 13.0827,
    Longitude: 80.2707,
    Forecast_Day: 1,
    Temperature: 35.2,
    Historical_Temp: 32.0,
    Temp_Anomaly: 3.2,
    Rainfall: 42.0,
    Historical_Rainfall: 8.0,
    Rainfall_Anomaly: 34.0,
    Wind_Speed: 28.0,
    Historical_Wind: 15.0,
    Wind_Anomaly: 13.0,
    Relative_Humidity: 82,
    District: 'Chennai Coastal',
    State: 'Tamil Nadu',
  },
  {
    Forecast_Date: '2026-09-12',
    Location: 'New Delhi, NCR',
    Latitude: 28.6139,
    Longitude: 77.209,
    Forecast_Day: 1,
    Temperature: 38.0,
    Historical_Temp: 33.2,
    Temp_Anomaly: 4.8,
    Rainfall: 0.0,
    Historical_Rainfall: 3.0,
    Rainfall_Anomaly: -3.0,
    Wind_Speed: 16.0,
    Historical_Wind: 12.0,
    Wind_Anomaly: 4.0,
    Relative_Humidity: 55,
    District: 'New Delhi',
    State: 'Delhi',
  },
];

export class ExcelDatasetAdapter {
  /**
   * Normalize an arbitrary row from either Dataset A or Dataset B into the unified schema
   */
  public normalizeRow(row: Record<string, any>, datasetName: string): NormalizedWeatherRecord {
    // Tolerant column name mappings
    const loc = row.Location || row.location || row.city || 'Unknown Location';
    const lat = parseFloat(row.Latitude ?? row.latitude ?? row.Lat ?? 0);
    const lon = parseFloat(row.Longitude ?? row.longitude ?? row.Lon ?? 0);
    const date = row.Forecast_Date || row.forecast_date || row.Date || new Date().toISOString().split('T')[0];
    const day = parseInt(row.Forecast_Day ?? row.forecast_day ?? 1, 10);

    const temp = parseFloat(row.Temperature_C ?? row.Temperature ?? row.temperature ?? 25);
    const histTemp = parseFloat(row.Historical_Temp_C ?? row.Historical_Temp ?? row.historical_temperature ?? 24);
    const tempAnom = parseFloat(row.Temp_Anomaly_C ?? row.Temp_Anomaly ?? row.temperature_anomaly ?? (temp - histTemp));

    const rain = parseFloat(row.Rainfall_mm ?? row.Rainfall ?? row.rainfall ?? 0);
    const histRain = parseFloat(row.Historical_Rainfall_mm ?? row.Historical_Rainfall ?? row.historical_rainfall ?? 0);
    const rainAnom = parseFloat(row.Rainfall_Anomaly_mm ?? row.Rainfall_Anomaly ?? row.rainfall_anomaly ?? (rain - histRain));

    const wind = parseFloat(row.Wind_Speed ?? row.wind_speed ?? row.Wind ?? 10);
    const histWind = parseFloat(row.Historical_Wind ?? row.historical_wind ?? 10);
    const windAnom = parseFloat(row.Wind_Anomaly ?? row.wind_anomaly ?? (wind - histWind));

    const rh = parseFloat(row.Relative_Humidity ?? row.relative_humidity ?? 50);

    // Derived physical properties
    const heatIndex = calculateHeatIndex(temp, rh);
    const vpd = calculateVPD(temp, rh);
    const windChill = calculateWindChill(temp, wind);

    const isGlobalDataset = datasetName.includes('Global') || row.Continent !== undefined;
    const prov: DataProvenance = isGlobalDataset ? 'EXCEL_PROTOTYPE' : 'EXCEL_SAMPLE';

    // Preserve any unmapped extra columns safely
    const standardKeys = new Set([
      'Location', 'location', 'city', 'Latitude', 'latitude', 'Lat', 'Longitude', 'longitude', 'Lon',
      'Forecast_Date', 'forecast_date', 'Date', 'Forecast_Day', 'forecast_day', 'Temperature_C', 'Temperature',
      'temperature', 'Historical_Temp_C', 'Historical_Temp', 'historical_temperature', 'Temp_Anomaly_C',
      'Temp_Anomaly', 'temperature_anomaly', 'Rainfall_mm', 'Rainfall', 'rainfall', 'Historical_Rainfall_mm',
      'Historical_Rainfall', 'historical_rainfall', 'Rainfall_Anomaly_mm', 'Rainfall_Anomaly', 'rainfall_anomaly',
      'Wind_Speed', 'wind_speed', 'Wind', 'Historical_Wind', 'historical_wind', 'Wind_Anomaly', 'wind_anomaly',
      'Relative_Humidity', 'relative_humidity', 'Continent', 'Country',
    ]);

    const rawExtra: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!standardKeys.has(k)) {
        rawExtra[k] = v;
      }
    }

    return {
      record_id: `REC-${datasetName.startsWith('Global') ? 'GLB' : 'IND'}-${Math.abs(Math.round(lat * 100))}_${Math.abs(Math.round(lon * 100))}-D${day}`,
      location: loc,
      continent: row.Continent,
      country: row.Country,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      forecast_date: date,
      forecast_day: day,
      temperature: Math.round(temp * 10) / 10,
      historical_temperature: Math.round(histTemp * 10) / 10,
      temperature_anomaly: Math.round(tempAnom * 10) / 10,
      rainfall: Math.round(rain * 10) / 10,
      historical_rainfall: Math.round(histRain * 10) / 10,
      rainfall_anomaly: Math.round(rainAnom * 10) / 10,
      wind_speed: Math.round(wind * 10) / 10,
      historical_wind: Math.round(histWind * 10) / 10,
      wind_anomaly: Math.round(windAnom * 10) / 10,
      heat_index: heatIndex,
      vpd: vpd,
      wind_chill: windChill,
      provenance: prov,
      data_category: 'SAMPLE DATA',
      is_forecast: true,
      is_sample: true,
      dataset_name: datasetName,
      raw_extra: Object.keys(rawExtra).length > 0 ? rawExtra : undefined,
    };
  }

  /**
   * Load and normalize Dataset A
   */
  public getGlobalPrototypeDataset(): NormalizedWeatherRecord[] {
    return GLOBAL_PROTOTYPE_DATASET_A.map((row) =>
      this.normalizeRow(row, 'Global Extreme Weather Anomaly Prototype (Dataset A)')
    );
  }

  /**
   * Load and normalize Dataset B
   */
  public getIndiaSampleDataset(): NormalizedWeatherRecord[] {
    return INDIA_SAMPLE_DATASET_B.map((row) =>
      this.normalizeRow(row, 'Extreme Weather Anomaly Sample Dataset (Dataset B - India)')
    );
  }

  /**
   * Unified loader combining all prototype datasets
   */
  public getAllSampleRecords(): NormalizedWeatherRecord[] {
    return [...this.getGlobalPrototypeDataset(), ...this.getIndiaSampleDataset()];
  }
}

export const excelDatasetAdapter = new ExcelDatasetAdapter();
