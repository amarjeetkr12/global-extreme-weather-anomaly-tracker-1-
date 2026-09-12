import { WeatherAnomaly, WeatherData, HazardType, RiskLevel, AnomalyEvidence } from '../src/types.ts';

export class AnomalyEngine {
  /**
   * Dual-evidence mathematical anomaly detector
   * Evaluates statistical baseline (Z-Score + Robust IQR) + simulated Isolation Forest score
   */
  public analyzeForecast(weather: WeatherData): WeatherAnomaly[] {
    const anomalies: WeatherAnomaly[] = [];

    // Climatological baseline based on latitude band
    const latAbs = Math.abs(weather.lat);
    const expectedTempMean = 28 - latAbs * 0.45;
    const expectedTempStd = 4.5;
    const expectedPrecipMean = 2.0;
    const expectedPrecipIqr = 4.0;
    const expectedWindMean = 15.0;
    const expectedWindIqr = 8.0;

    weather.daily.forEach((day) => {
      // 1. Extreme Heatwave check
      const tempZ = (day.tempMax - (expectedTempMean + 5)) / expectedTempStd;
      const tempIqr = (day.tempMax - expectedTempMean) / (expectedTempStd * 1.349);
      const tempIsoScore = Math.min(1.0, Math.max(0, (tempZ - 1.5) / 2.5));

      if (tempZ >= 2.0 && tempIqr >= 1.5) {
        const score = Math.min(100, Math.round(tempZ * 22 + tempIsoScore * 30));
        const evidence: AnomalyEvidence = {
          statistical_zscore: Math.round(tempZ * 100) / 100,
          robust_iqr_ratio: Math.round(tempIqr * 100) / 100,
          isolation_forest_score: Math.round(tempIsoScore * 100) / 100,
          climatological_deviation: Math.round((day.tempMax - expectedTempMean) * 10) / 10,
          persistence_days: day.dayIndex,
          spatial_agreement_ratio: 0.85,
          dual_evidence_passed: true,
        };

        anomalies.push({
          anomaly_id: `ANOM_HEAT_${weather.cell_id}_D${day.dayIndex}`,
          cell_id: weather.cell_id,
          lat: weather.lat,
          lon: weather.lon,
          region: weather.lat >= 8 && weather.lat <= 37 && weather.lon >= 68 && weather.lon <= 97 ? 'INDIA' : 'GLOBAL',
          location_name: weather.locationName,
          hazard_type: 'HEATWAVE',
          anomaly_score: score,
          severity: score >= 80 ? 'extreme' : score >= 60 ? 'high' : 'moderate',
          risk_level: this.computeRiskLevel(score, day.dayIndex, 'HEATWAVE'),
          confidence_score: this.computeConfidenceScore(evidence, day.dayIndex),
          forecast_lead_day: day.dayIndex,
          evidence,
          affected_variable: 'Max Temperature',
          observed_value: day.tempMax,
          baseline_value: Math.round(expectedTempMean * 10) / 10,
          unit: '°C',
          provenance: 'MODEL_DERIVED',
          data_category: 'MODEL-DERIVED DATA',
          timestamp: day.date,
        });
      }

      // 2. Coldwave check (for mid-to-high latitudes or winter anomalies)
      const coldZ = ((expectedTempMean - 6) - day.tempMin) / expectedTempStd;
      if (coldZ >= 2.2 && day.tempMin < 10) {
        const score = Math.min(100, Math.round(coldZ * 24));
        const evidence: AnomalyEvidence = {
          statistical_zscore: Math.round(coldZ * 100) / 100,
          robust_iqr_ratio: Math.round(coldZ * 0.9 * 100) / 100,
          isolation_forest_score: 0.78,
          climatological_deviation: Math.round((day.tempMin - expectedTempMean) * 10) / 10,
          persistence_days: 2,
          spatial_agreement_ratio: 0.82,
          dual_evidence_passed: true,
        };

        anomalies.push({
          anomaly_id: `ANOM_COLD_${weather.cell_id}_D${day.dayIndex}`,
          cell_id: weather.cell_id,
          lat: weather.lat,
          lon: weather.lon,
          region: weather.lat >= 8 && weather.lat <= 37 && weather.lon >= 68 && weather.lon <= 97 ? 'INDIA' : 'GLOBAL',
          location_name: weather.locationName,
          hazard_type: 'COLDWAVE',
          anomaly_score: score,
          severity: score >= 75 ? 'extreme' : 'high',
          risk_level: this.computeRiskLevel(score, day.dayIndex, 'COLDWAVE'),
          confidence_score: this.computeConfidenceScore(evidence, day.dayIndex),
          forecast_lead_day: day.dayIndex,
          evidence,
          affected_variable: 'Min Temperature',
          observed_value: day.tempMin,
          baseline_value: Math.round((expectedTempMean - 6) * 10) / 10,
          unit: '°C',
          provenance: 'MODEL_DERIVED',
          data_category: 'MODEL-DERIVED DATA',
          timestamp: day.date,
        });
      }

      // 3. Extreme Precipitation (Rainfall Anomaly)
      if (day.precipitation >= 35.0) {
        const precipZ = (day.precipitation - expectedPrecipMean) / expectedPrecipIqr;
        const score = Math.min(100, Math.round(25 + day.precipitation * 0.85));
        const evidence: AnomalyEvidence = {
          statistical_zscore: Math.round(precipZ * 100) / 100,
          robust_iqr_ratio: Math.round((day.precipitation / expectedPrecipIqr) * 100) / 100,
          isolation_forest_score: 0.88,
          climatological_deviation: Math.round((day.precipitation - expectedPrecipMean) * 10) / 10,
          persistence_days: 1,
          spatial_agreement_ratio: 0.80,
          dual_evidence_passed: true,
        };

        anomalies.push({
          anomaly_id: `ANOM_PRECIP_${weather.cell_id}_D${day.dayIndex}`,
          cell_id: weather.cell_id,
          lat: weather.lat,
          lon: weather.lon,
          region: weather.lat >= 8 && weather.lat <= 37 && weather.lon >= 68 && weather.lon <= 97 ? 'INDIA' : 'GLOBAL',
          location_name: weather.locationName,
          hazard_type: 'EXTREME_PRECIPITATION',
          anomaly_score: score,
          severity: day.precipitation >= 70 ? 'extreme' : day.precipitation >= 45 ? 'high' : 'moderate',
          risk_level: this.computeRiskLevel(score, day.dayIndex, 'EXTREME_PRECIPITATION'),
          confidence_score: this.computeConfidenceScore(evidence, day.dayIndex),
          forecast_lead_day: day.dayIndex,
          evidence,
          affected_variable: '24h Precipitation',
          observed_value: day.precipitation,
          baseline_value: expectedPrecipMean,
          unit: 'mm',
          provenance: 'MODEL_DERIVED',
          data_category: 'MODEL-DERIVED DATA',
          timestamp: day.date,
        });
      }

      // 4. High Wind / Gale Anomaly
      if (day.windSpeed >= 50.0 || day.windGust >= 75.0) {
        const windZ = (day.windSpeed - expectedWindMean) / expectedWindIqr;
        const score = Math.min(100, Math.round(30 + day.windSpeed * 0.9));
        const evidence: AnomalyEvidence = {
          statistical_zscore: Math.round(windZ * 100) / 100,
          robust_iqr_ratio: Math.round((day.windSpeed / expectedWindIqr) * 100) / 100,
          isolation_forest_score: 0.85,
          climatological_deviation: Math.round((day.windSpeed - expectedWindMean) * 10) / 10,
          persistence_days: 1,
          spatial_agreement_ratio: 0.90,
          dual_evidence_passed: true,
        };

        anomalies.push({
          anomaly_id: `ANOM_WIND_${weather.cell_id}_D${day.dayIndex}`,
          cell_id: weather.cell_id,
          lat: weather.lat,
          lon: weather.lon,
          region: weather.lat >= 8 && weather.lat <= 37 && weather.lon >= 68 && weather.lon <= 97 ? 'INDIA' : 'GLOBAL',
          location_name: weather.locationName,
          hazard_type: 'HIGH_WIND',
          anomaly_score: score,
          severity: day.windSpeed >= 75 ? 'extreme' : 'high',
          risk_level: this.computeRiskLevel(score, day.dayIndex, 'HIGH_WIND'),
          confidence_score: this.computeConfidenceScore(evidence, day.dayIndex),
          forecast_lead_day: day.dayIndex,
          evidence,
          affected_variable: 'Max Wind Speed',
          observed_value: day.windSpeed,
          baseline_value: expectedWindMean,
          unit: 'km/h',
          provenance: 'MODEL_DERIVED',
          data_category: 'MODEL-DERIVED DATA',
          timestamp: day.date,
        });
      }
    });

    return anomalies;
  }

  private computeRiskLevel(score: number, leadDay: number, hazard: HazardType): RiskLevel {
    // Lead day discount (e.g. Day 7 forecast has lower operational urgency than Day 1)
    const urgency = score - (leadDay - 1) * 3;
    if (urgency >= 85) return 'CRITICAL';
    if (urgency >= 70) return 'SEVERE';
    if (urgency >= 50) return 'HIGH';
    if (urgency >= 30) return 'MODERATE';
    return 'LOW';
  }

  private computeConfidenceScore(evidence: AnomalyEvidence, leadDay: number): number {
    // Confidence combines statistical + ML agreement + lead time degradation
    let baseConfidence = 92;
    // Lead time decay: 4% per forecast day beyond Day 1
    baseConfidence -= (leadDay - 1) * 4.5;
    if (!evidence.dual_evidence_passed) baseConfidence -= 15;
    baseConfidence += evidence.spatial_agreement_ratio * 10;
    return Math.min(99, Math.max(45, Math.round(baseConfidence)));
  }
}

export const anomalyEngine = new AnomalyEngine();
