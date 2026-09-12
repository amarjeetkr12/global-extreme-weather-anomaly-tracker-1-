import { WeatherData, DailyForecast, DataProvenance, DataCategory } from '../src/types.ts';
import { smartCache } from './cacheManager.ts';
import { backgroundScheduler } from './backgroundScheduler.ts';

// WMO Weather code lookup dictionary
export function decodeWmoCode(code: number): string {
  switch (code) {
    case 0: return 'Clear Sky';
    case 1: return 'Mainly Clear';
    case 2: return 'Partly Cloudy';
    case 3: return 'Overcast';
    case 45: return 'Fog';
    case 48: return 'Depositing Rime Fog';
    case 51: return 'Light Drizzle';
    case 53: return 'Moderate Drizzle';
    case 55: return 'Dense Drizzle';
    case 61: return 'Slight Rain';
    case 63: return 'Moderate Rain';
    case 65: return 'Heavy Rain';
    case 66: return 'Light Freezing Rain';
    case 67: return 'Heavy Freezing Rain';
    case 71: return 'Slight Snow';
    case 73: return 'Moderate Snow';
    case 75: return 'Heavy Snow';
    case 77: return 'Snow Grains';
    case 80: return 'Slight Rain Showers';
    case 81: return 'Moderate Rain Showers';
    case 82: return 'Violent Rain Showers';
    case 85: return 'Slight Snow Showers';
    case 86: return 'Heavy Snow Showers';
    case 95: return 'Thunderstorm';
    case 96: return 'Thunderstorm with Slight Hail';
    case 99: return 'Thunderstorm with Heavy Hail';
    default: return 'Atmospheric Conditions';
  }
}

/**
 * Standard Rothfusz regression equation for Heat Index (°C)
 */
export function calculateHeatIndex(tempC: number, rh: number): number {
  if (tempC < 27) return tempC;
  const T = tempC * 1.8 + 32; // to Fahrenheit
  const R = rh;
  const c1 = -42.379, c2 = 2.04901523, c3 = 10.14333127, c4 = -0.22475541;
  const c5 = -0.00683783, c6 = -0.05481717, c7 = 0.00122874, c8 = 0.00085282, c9 = -0.00000199;

  let hiF = c1 + c2 * T + c3 * R + c4 * T * R + c5 * T * T + c6 * R * R + c7 * T * T * R + c8 * T * R * R + c9 * T * T * R * R;
  const hiC = (hiF - 32) / 1.8;
  return Math.round(hiC * 10) / 10;
}

/**
 * Vapor Pressure Deficit (VPD in kPa)
 */
export function calculateVPD(tempC: number, rh: number): number {
  // Tetens equation for saturation vapor pressure
  const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const avp = svp * (rh / 100);
  const vpd = Math.max(0, svp - avp);
  return Math.round(vpd * 100) / 100;
}

/**
 * NOAA standard Wind Chill equation (°C)
 */
export function calculateWindChill(tempC: number, windKmh: number): number {
  if (tempC > 10 || windKmh < 4.8) return tempC;
  const wc = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * tempC * Math.pow(windKmh, 0.16);
  return Math.round(wc * 10) / 10;
}

export class WeatherService {
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minute caching

  /**
   * Exponential backoff retry fetcher for Open-Meteo
   */
  private async fetchWithRetry(url: string, maxRetries: number = 3, timeoutMs: number = 7000): Promise<any> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) {
          throw new Error(`Open-Meteo returned status ${response.status}`);
        }
        return await response.json();
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt - 1) * 600; // 600ms, 1200ms
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }
    throw lastError;
  }

  /**
   * Fetch 7-day medium-range forecast from Open-Meteo standard public API
   * Zero API key required, timezone=auto, resilient retry & smart caching.
   */
  public async getForecast(cellId: string, lat: number, lon: number, locationName?: string): Promise<WeatherData> {
    const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = smartCache.get<WeatherData>(cacheKey);

    // Return fresh cached data if within TTL
    if (cached && cached.isFresh) {
      return {
        ...cached.data,
        isCached: true,
        cacheAgeMinutes: Math.round(cached.ageMs / 60000),
      };
    }

    try {
      const config = backgroundScheduler.getConfig();
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,relative_humidity_2m_mean,surface_pressure_mean,cloud_cover_mean,weather_code&timezone=auto`;

      const json = await this.fetchWithRetry(url, config.API_RETRY_COUNT, config.API_TIMEOUT_MS);

      const currentTemp = json.current?.temperature_2m ?? 20;
      const currentRh = json.current?.relative_humidity_2m ?? 50;
      const currentWind = json.current?.wind_speed_10m ?? 10;
      const currentCode = json.current?.weather_code ?? 0;

      const dailyTimes: string[] = json.daily?.time || [];
      const dailyMaxTemps: number[] = json.daily?.temperature_2m_max || [];
      const dailyMinTemps: number[] = json.daily?.temperature_2m_min || [];
      const dailyMeanTemps: number[] = json.daily?.temperature_2m_mean || [];
      const dailyPrecip: number[] = json.daily?.precipitation_sum || [];
      const dailyWindMax: number[] = json.daily?.wind_speed_10m_max || [];
      const dailyWindGust: number[] = json.daily?.wind_gusts_10m_max || [];
      const dailyRh: number[] = json.daily?.relative_humidity_2m_mean || [];
      const dailyPressure: number[] = json.daily?.surface_pressure_mean || [];
      const dailyClouds: number[] = json.daily?.cloud_cover_mean || [];
      const dailyCodes: number[] = json.daily?.weather_code || [];

      const daily: DailyForecast[] = [];
      const daysCount = Math.min(dailyTimes.length, 7);

      for (let i = 0; i < daysCount; i++) {
        const maxT = dailyMaxTemps[i] ?? currentTemp;
        const minT = dailyMinTemps[i] ?? currentTemp;
        const meanT = dailyMeanTemps[i] ?? Math.round(((maxT + minT) / 2) * 10) / 10;
        const precip = dailyPrecip[i] ?? 0;
        const wind = dailyWindMax[i] ?? currentWind;
        const gust = dailyWindGust[i] ?? wind * 1.3;
        const rh = dailyRh[i] ?? currentRh;
        const press = dailyPressure[i] ?? 1013.25;
        const clouds = dailyClouds[i] ?? 30;
        const code = dailyCodes[i] ?? 0;

        daily.push({
          date: dailyTimes[i],
          dayIndex: i + 1,
          tempMax: maxT,
          tempMin: minT,
          tempMean: meanT,
          precipitation: precip,
          windSpeed: wind,
          windGust: Math.round(gust * 10) / 10,
          relativeHumidity: rh,
          surfacePressure: Math.round(press * 10) / 10,
          cloudCover: clouds,
          weatherCode: code,
          weatherCondition: decodeWmoCode(code),
          heatIndex: calculateHeatIndex(maxT, rh),
          vpd: calculateVPD(meanT, rh),
          windChill: calculateWindChill(minT, wind),
        });
      }

      const weatherData: WeatherData = {
        cell_id: cellId,
        lat,
        lon,
        locationName: locationName || `Location (${lat >= 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, ${lon >= 0 ? `${lon}°E` : `${Math.abs(lon)}°W`})`,
        timezone: json.timezone || 'UTC',
        elevation: json.elevation || 0,
        current: {
          temperature: currentTemp,
          relativeHumidity: currentRh,
          windSpeed: currentWind,
          windDirection: json.current?.wind_direction_10m ?? 0,
          surfacePressure: json.current?.surface_pressure ?? 1013.25,
          precipitation: json.current?.precipitation ?? 0,
          weatherCode: currentCode,
          weatherCondition: decodeWmoCode(currentCode),
          heatIndex: calculateHeatIndex(currentTemp, currentRh),
          windChill: calculateWindChill(currentTemp, currentWind),
          vpd: calculateVPD(currentTemp, currentRh),
          time: json.current?.time || new Date().toISOString(),
        },
        daily,
        provenance: 'OPEN_METEO',
        dataCategory: 'FORECAST DATA',
        lastUpdated: new Date().toISOString(),
        isCached: false,
        cacheAgeMinutes: 0,
      };

      // Store in smart cache with change detection
      smartCache.set(cacheKey, weatherData, this.cacheTtlMs);
      return weatherData;
    } catch (err: any) {
      // Offline/failure mode: If API fails, check if stale cache exists
      if (cached) {
        console.warn(`[WeatherService] Live API unavailable for ${cellId}, returning cached data: ${err.message}`);
        return {
          ...cached.data,
          isCached: true,
          cacheAgeMinutes: Math.round(cached.ageMs / 60000),
        };
      }

      // Fallback: Generate climatological baseline without crashing
      return this.generateClimatologicalFallback(cellId, lat, lon, locationName);
    }
  }

  /**
   * Deterministic climatological fallback if external API is unreachable and no cache exists
   */
  private generateClimatologicalFallback(
    cellId: string,
    lat: number,
    lon: number,
    locationName?: string
  ): WeatherData {
    const isTropical = Math.abs(lat) < 23.5;
    const baseTemp = isTropical ? 30 - Math.abs(lat) * 0.3 : 22 - Math.abs(lat) * 0.4;
    const today = new Date();

    const daily: DailyForecast[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 24 * 3600 * 1000);
      const maxT = Math.round((baseTemp + 4 + Math.sin(i + lat) * 2) * 10) / 10;
      const minT = Math.round((baseTemp - 4 + Math.cos(i + lon) * 2) * 10) / 10;
      const meanT = Math.round(((maxT + minT) / 2) * 10) / 10;
      const rh = isTropical ? 75 : 55;
      const wind = 12 + Math.round(Math.abs(Math.sin(i) * 8));

      daily.push({
        date: d.toISOString().split('T')[0],
        dayIndex: i + 1,
        tempMax: maxT,
        tempMin: minT,
        tempMean: meanT,
        precipitation: isTropical ? 5.2 : 1.0,
        windSpeed: wind,
        windGust: wind + 6,
        relativeHumidity: rh,
        surfacePressure: 1012.0,
        cloudCover: 35,
        weatherCode: 2,
        weatherCondition: 'Partly Cloudy (Climatological)',
        heatIndex: calculateHeatIndex(maxT, rh),
        vpd: calculateVPD(meanT, rh),
        windChill: calculateWindChill(minT, wind),
      });
    }

    return {
      cell_id: cellId,
      lat,
      lon,
      locationName: locationName || `Grid Node (${lat}°N, ${lon}°E)`,
      timezone: 'UTC',
      elevation: 50,
      current: {
        temperature: Math.round(baseTemp * 10) / 10,
        relativeHumidity: isTropical ? 75 : 55,
        windSpeed: 14,
        windDirection: 90,
        surfacePressure: 1012,
        precipitation: 0,
        weatherCode: 1,
        weatherCondition: 'Fair (Climatological Model)',
        heatIndex: calculateHeatIndex(baseTemp, isTropical ? 75 : 55),
        windChill: calculateWindChill(baseTemp, 14),
        vpd: calculateVPD(baseTemp, isTropical ? 75 : 55),
        time: today.toISOString(),
      },
      daily,
      provenance: 'CLIMATOLOGICAL_FALLBACK',
      dataCategory: 'FALLBACK DATA',
      lastUpdated: new Date().toISOString(),
      isCached: false,
      cacheAgeMinutes: 0,
    };
  }
}

export const weatherService = new WeatherService();
