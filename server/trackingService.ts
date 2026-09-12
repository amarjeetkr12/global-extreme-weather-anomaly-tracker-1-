import { WeatherAnomaly, TrackedWeatherEvent, AlertFeedItem, RiskLevel, EventHistoryPoint } from '../src/types.ts';

/**
 * Great-circle distance using Haversine formula (km)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class SpatioTemporalTracker {
  // Map of persistent event state over time to support evolution tracking and history timeline
  private eventHistoryMap: Map<string, EventHistoryPoint[]> = new Map();

  /**
   * Clusters isolated cell anomalies into unified continuous extreme weather events (EVT-2026-...)
   * Preserves existing events and records time evolution history points.
   */
  public clusterEvents(anomalies: WeatherAnomaly[]): TrackedWeatherEvent[] {
    const events: TrackedWeatherEvent[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < anomalies.length; i++) {
      const a1 = anomalies[i];
      if (visited.has(a1.anomaly_id)) continue;

      const cluster: WeatherAnomaly[] = [a1];
      visited.add(a1.anomaly_id);

      for (let j = i + 1; j < anomalies.length; j++) {
        const a2 = anomalies[j];
        if (visited.has(a2.anomaly_id)) continue;

        // Group if same hazard type, within 1200 km, and similar forecast lead day (±1 day)
        if (
          a1.hazard_type === a2.hazard_type &&
          Math.abs(a1.forecast_lead_day - a2.forecast_lead_day) <= 1
        ) {
          const dist = haversineDistanceKm(a1.lat, a1.lon, a2.lat, a2.lon);
          if (dist <= 1200) {
            cluster.push(a2);
            visited.add(a2.anomaly_id);
          }
        }
      }

      // Compute centroid
      const avgLat = cluster.reduce((sum, c) => sum + c.lat, 0) / cluster.length;
      const avgLon = cluster.reduce((sum, c) => sum + c.lon, 0) / cluster.length;
      const maxScore = Math.max(...cluster.map((c) => c.anomaly_score));
      const affectedCells = Array.from(new Set(cluster.map((c) => c.cell_id)));

      const isSevere = maxScore >= 75 || cluster.length >= 3;
      const riskLevel: RiskLevel = maxScore >= 85 ? 'CRITICAL' : isSevere ? 'SEVERE' : maxScore >= 50 ? 'HIGH' : 'MODERATE';
      const riskScore = Math.round(maxScore * 0.7 + Math.min(cluster.length * 10, 30));

      const avgConfidence = Math.round(cluster.reduce((sum, c) => sum + c.confidence_score, 0) / cluster.length);
      const confidenceReasoning = `Evidence agreement: Dual-evidence statistical Z-score + Robust IQR passed across ${cluster.length} clustered grid cell(s). Lead Day +${a1.forecast_lead_day} forecast signal.`;

      // Deterministic Event ID based on hazard and cluster properties
      const eventIndex = events.length + 1;
      const eventId = `EVT-2026-${a1.hazard_type.substring(0, 4)}-D${a1.forecast_lead_day}-${eventIndex}`;

      const nowIso = new Date().toISOString();

      // Retrieve or initialize history timeline for this event
      let history = this.eventHistoryMap.get(eventId) || [];
      history.push({
        timestamp: nowIso,
        risk_score: riskScore,
        risk_level: riskLevel,
        confidence_score: avgConfidence,
        status: cluster.length > 2 ? 'PERSISTENT' : 'ACTIVE',
        affected_cell_count: affectedCells.length,
      });

      // Keep latest 10 history points
      if (history.length > 10) {
        history = history.slice(-10);
      }
      this.eventHistoryMap.set(eventId, history);

      events.push({
        event_id: eventId,
        title: `${a1.hazard_type.replace('_', ' ')} System (${cluster.length} Cell Cluster)`,
        hazard_type: a1.hazard_type,
        region: cluster.some((c) => c.region === 'INDIA') ? 'INDIA' : 'GLOBAL',
        affected_cells: affectedCells,
        center_lat: Math.round(avgLat * 100) / 100,
        center_lon: Math.round(avgLon * 100) / 100,
        severity: maxScore >= 80 ? 'extreme' : maxScore >= 60 ? 'high' : 'moderate',
        risk_level: riskLevel,
        risk_score: riskScore,
        confidence_score: avgConfidence,
        confidence_reasoning: confidenceReasoning,
        forecast_lead_day: a1.forecast_lead_day,
        event_start: a1.timestamp,
        event_end: new Date(new Date(a1.timestamp).getTime() + cluster.length * 24 * 3600000).toISOString().split('T')[0],
        movement_direction: avgLon > 0 ? 'ENE' : 'WNW',
        persistence_hours: 24 * cluster.length,
        intensity_trend: cluster.length > 2 ? 'INCREASING' : 'STEADY',
        provenance: a1.provenance,
        data_category: a1.data_category,
        status: cluster.length > 2 ? 'PERSISTENT' : 'ACTIVE',
        history,
      });
    }

    return events;
  }

  /**
   * Generates actionable alert feed items with explicit official vs model-derived provenance
   */
  public generateAlertFeed(events: TrackedWeatherEvent[], anomalies: WeatherAnomaly[]): AlertFeedItem[] {
    const alerts: AlertFeedItem[] = [];

    events.forEach((evt, idx) => {
      alerts.push({
        alert_id: `ALT-${evt.event_id}-${idx + 1}`,
        title: `${evt.title} - ${evt.risk_level} Risk`,
        hazard_type: evt.hazard_type,
        location: `${evt.region} (${evt.center_lat >= 0 ? `${evt.center_lat}°N` : `${Math.abs(evt.center_lat)}°S`}, ${evt.center_lon >= 0 ? `${evt.center_lon}°E` : `${Math.abs(evt.center_lon)}°W`})`,
        lat: evt.center_lat,
        lon: evt.center_lon,
        severity: evt.severity,
        risk_level: evt.risk_level,
        confidence_score: evt.confidence_score,
        time: evt.event_start,
        is_official: false,
        provenance: evt.provenance,
        data_category: evt.data_category,
        lead_day: evt.forecast_lead_day,
        action_summary: `Forecast Lead Day +${evt.forecast_lead_day}: Spatio-temporal persistence tracked across ${evt.affected_cells.length} cells. Risk Score ${evt.risk_score}/100. Decision support monitoring advised.`,
      });
    });

    return alerts;
  }

  public getEventHistory(eventId: string): EventHistoryPoint[] {
    return this.eventHistoryMap.get(eventId) || [];
  }
}

export const spatioTemporalTracker = new SpatioTemporalTracker();
