import React, { useState, useEffect } from 'react';
import { WeatherData, DailyForecast, CellAiAssessment } from '../types.ts';
import { Thermometer, Wind, Droplets, Gauge, CloudRain, Calendar, ShieldCheck, Sun, Info, Sparkles, Activity } from 'lucide-react';

interface WeatherOverviewProps {
  weather: WeatherData | null;
  isLoading: boolean;
}

export const WeatherOverview: React.FC<WeatherOverviewProps> = ({ weather, isLoading }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [assessment, setAssessment] = useState<CellAiAssessment | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!weather?.cell_id) {
      setAssessment(null);
      return;
    }

    let isMounted = true;
    setIsAssessmentLoading(true);

    fetch(`/api/ai/cell-assessment?cell_id=${encodeURIComponent(weather.cell_id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.assessment) {
          setAssessment(data.assessment);
        }
      })
      .catch((err) => {
        console.warn('Could not load cell AI assessment:', err);
      })
      .finally(() => {
        if (isMounted) setIsAssessmentLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [weather?.cell_id]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Querying Open-Meteo standard 7-day numerical forecast...</span>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-center text-slate-400">
        Click any cell or India node on the map to load real 7-day medium-range weather intelligence.
      </div>
    );
  }

  const selectedDay: DailyForecast = weather.daily.find((d) => d.dayIndex === selectedDayIndex) || weather.daily[0];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6" id="weather-overview-panel">
      {/* Location Header & Provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{weather.locationName}</h3>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {weather.cell_id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinates: {weather.lat >= 0 ? `${weather.lat}°N` : `${Math.abs(weather.lat)}°S`},{' '}
            {weather.lon >= 0 ? `${weather.lon}°E` : `${Math.abs(weather.lon)}°W`} • Elevation: {weather.elevation}m • Timezone: {weather.timezone}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {weather.provenance}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
            {weather.dataCategory}
          </span>
        </div>
      </div>

      {/* Current Real Weather Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
            Air Temp
          </div>
          <div className="text-xl font-bold text-slate-900">{weather.current.temperature}°C</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Heat Index: {weather.current.heatIndex}°C</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
            Precipitation
          </div>
          <div className="text-xl font-bold text-slate-900">{weather.current.precipitation} mm</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{weather.current.weatherCondition}</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Wind className="w-3.5 h-3.5 text-teal-500" />
            Wind Speed
          </div>
          <div className="text-xl font-bold text-slate-900">{weather.current.windSpeed} km/h</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Heading {weather.current.windDirection}°</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Droplets className="w-3.5 h-3.5 text-indigo-500" />
            Rel Humidity
          </div>
          <div className="text-xl font-bold text-slate-900">{weather.current.relativeHumidity}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">VPD: {weather.current.vpd} kPa</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            Pressure
          </div>
          <div className="text-xl font-bold text-slate-900">{Math.round(weather.current.surfacePressure)} hPa</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Surface Barometric</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            Condition
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={weather.current.weatherCondition}>
            {weather.current.weatherCondition}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">WMO Code {weather.current.weatherCode}</div>
        </div>
      </div>

      {/* 7-Day Medium-Range Forecast Selector */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            7-Day Medium-Range Numerical Forecast
          </h4>
          <span className="text-xs text-slate-500">Day 1 to Day 7</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {weather.daily.map((day) => {
            const isSelected = day.dayIndex === selectedDayIndex;
            return (
              <button
                key={day.dayIndex}
                type="button"
                onClick={() => setSelectedDayIndex(day.dayIndex)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500">Day {day.dayIndex}</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{day.date.substring(5)}</div>
                <div className="text-sm font-extrabold text-slate-900 mt-1">
                  {Math.round(day.tempMax)}° / <span className="text-slate-400">{Math.round(day.tempMin)}°</span>
                </div>
                <div className="text-[11px] text-blue-600 font-medium mt-1">
                  {day.precipitation > 0 ? `${day.precipitation}mm` : '0 mm'}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={day.weatherCondition}>
                  {day.weatherCondition}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Physical Breakdown */}
      {selectedDay && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-700">
          <div className="space-y-1">
            <div className="font-bold text-slate-900 text-sm">
              Day +{selectedDay.dayIndex} ({selectedDay.date}) Meteorological Diagnostics:
            </div>
            <div className="text-slate-600">
              Condition: <strong>{selectedDay.weatherCondition}</strong> • Cloud Cover: {selectedDay.cloudCover}% • Max Wind Gust: {selectedDay.windGust} km/h
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              Heat Index: <strong className="text-rose-700">{selectedDay.heatIndex}°C</strong>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              VPD: <strong className="text-indigo-700">{selectedDay.vpd} kPa</strong>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              Wind Chill: <strong className="text-teal-700">{selectedDay.windChill}°C</strong>
            </div>
          </div>
        </div>
      )}

      {/* AI Synoptic Micro-Assessment & Mitigation */}
      {isAssessmentLoading ? (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3 text-xs text-indigo-700">
          <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Synthesizing AI micrometeorological diagnosis and thermal impact outlook...</span>
        </div>
      ) : assessment ? (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold tracking-wide uppercase text-indigo-300">
                AI Synoptic Diagnosis &amp; Civil Mitigation ({assessment.locationName})
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {assessment.provider === 'GEMINI_AI' ? 'Gemini 2.5 Flash' : 'Harmonized Physics Engine'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Atmospheric Diagnosis:</span>
              <p className="text-slate-200 leading-relaxed">{assessment.synopticDiagnosis}</p>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Thermal &amp; Comfort Outlook:</span>
              <p className="text-slate-200 leading-relaxed">{assessment.thermalDiscomfort}</p>
            </div>
          </div>

          {assessment.recommendedMitigation && assessment.recommendedMitigation.length > 0 && (
            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-bold text-emerald-400">Target Mitigation:</span>
              {assessment.recommendedMitigation.map((act, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 text-[11px]">
                  ✓ {act}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
