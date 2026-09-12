import React, { useState } from 'react';
import { TrackedWeatherEvent, EventHistoryPoint } from '../types.ts';
import { History, TrendingUp, TrendingDown, Clock, ShieldCheck, Activity } from 'lucide-react';

interface EventTimelineModalProps {
  event: TrackedWeatherEvent | null;
  onClose: () => void;
}

export const EventTimelineModal: React.FC<EventTimelineModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const history = event.history || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Event Evolution Timeline</h3>
              <p className="text-xs text-slate-500 font-mono">{event.event_id} • {event.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold px-2.5 py-1 text-sm rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Current State Highlights */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Risk Score</span>
            <span className="text-lg font-black text-slate-900">{event.risk_score} / 100</span>
            <span className={`text-[10px] font-bold block ${
              event.risk_level === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {event.risk_level}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Confidence</span>
            <span className="text-lg font-black text-slate-900">{event.confidence_score}%</span>
            <span className="text-[10px] text-emerald-700 font-medium block">Dual-Evidence Passed</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Lead Day</span>
            <span className="text-lg font-black text-slate-900">Day +{event.forecast_lead_day}</span>
            <span className="text-[10px] text-slate-500 block">{event.affected_cells.length} cells clustered</span>
          </div>
        </div>

        {/* Explainable Confidence Reasoning */}
        {event.confidence_reasoning && (
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900">
            <strong>Confidence Reasoning:</strong> {event.confidence_reasoning}
          </div>
        )}

        {/* Evolution Timeline Points */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Temporal State History Points ({history.length})
          </h4>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Initial baseline point recorded.</p>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {history.map((pt, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(pt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-semibold text-slate-800">
                      Risk {pt.risk_score} ({pt.risk_level})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span>{pt.affected_cell_count} cells</span>
                    <span className="font-bold text-emerald-700">{pt.confidence_score}% conf</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 text-[10px]">
                      {pt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
