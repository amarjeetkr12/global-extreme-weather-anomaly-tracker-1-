import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Scale,
  Building2,
  Info,
  Radio,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface OfficialAgency {
  name: string;
  agency: string;
  region: string;
  url: string;
  category: 'Cyclones & Weather' | 'Tsunamis & Seismic' | 'Emergency & Civic' | 'Global Coordination';
}

const AUTHORITATIVE_AGENCIES: OfficialAgency[] = [
  {
    name: 'India Meteorological Department (IMD)',
    agency: 'MoES, Govt. of India',
    region: 'South Asia & North Indian Ocean Basin',
    url: 'https://mausam.imd.gov.in',
    category: 'Cyclones & Weather',
  },
  {
    name: 'NOAA National Weather Service / NHC',
    agency: 'U.S. Dept. of Commerce',
    region: 'North America, Atlantic & East Pacific',
    url: 'https://www.nhc.noaa.gov',
    category: 'Cyclones & Weather',
  },
  {
    name: 'Pacific Tsunami Warning Center (PTWC) & USGS',
    agency: 'NOAA / U.S. Geological Survey',
    region: 'Global Seismic & Coastal Tsunami Networks',
    url: 'https://www.tsunami.gov',
    category: 'Tsunamis & Seismic',
  },
  {
    name: 'Joint Typhoon Warning Center (JTWC)',
    agency: 'U.S. Navy & Air Force Command',
    region: 'West Pacific, Indian Ocean & Southern Hemisphere',
    url: 'https://www.metoc.navy.mil/jtwc',
    category: 'Cyclones & Weather',
  },
  {
    name: 'National Disaster Management Authority (NDMA)',
    agency: 'Ministry of Home Affairs, India',
    region: 'National Disaster Response & Civil Alerts',
    url: 'https://ndma.gov.in',
    category: 'Emergency & Civic',
  },
  {
    name: 'WMO Severe Weather Information Centre (SWIC)',
    agency: 'United Nations / World Meteorological Org',
    region: '193 Member Nations & Global RSMCs',
    url: 'https://severeweather.wmo.int',
    category: 'Global Coordination',
  },
];

export const OperationalDisclaimerFooter: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('op_disclaimer_expanded');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [acknowledged, setAcknowledged] = useState<boolean>(() => {
    try {
      return localStorage.getItem('op_disclaimer_acknowledged') === 'true';
    } catch {
      return false;
    }
  });

  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('op_disclaimer_expanded', JSON.stringify(isExpanded));
    } catch {
      // ignore
    }
  }, [isExpanded]);

  const handleToggleAcknowledge = () => {
    const next = !acknowledged;
    setAcknowledged(next);
    try {
      localStorage.setItem('op_disclaimer_acknowledged', String(next));
    } catch {
      // ignore
    }
  };

  return (
    <footer
      id="operational-governance-footer"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200"
    >
      {/* Header Bar */}
      <div className="bg-slate-50/80 px-4 py-3.5 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-800 uppercase font-mono">
                Operational Governance & Scientific Integrity
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                WMO & UNDRR Standard
              </span>
              {acknowledged && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Acknowledged
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative Primacy • Decision-Support Scope • Official Warning Disclaimers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWhyModal(!showWhyModal)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Yeh disclaimer kyu zaroori hai? (Why is this notice needed?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Yeh Kyu Hai? (Why Needed?)</span>
            <span className="sm:hidden">Why?</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAcknowledge}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors shadow-2xs ${
              acknowledged
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{acknowledged ? 'Protocol Active' : 'Acknowledge'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Notice'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* "Why is this written here?" Explanatory Banner (Interactive) */}
      {showWhyModal && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-3.5 sm:px-6 text-xs text-amber-950 space-y-2 animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Yeh Disclaimer Yahan Kyu Likha Hua Hai? (Operational & Legal Purpose)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowWhyModal(false)}
              className="text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-slate-700">
            <div className="bg-white/90 p-3 rounded-xl border border-amber-200">
              <p className="font-semibold text-amber-950 mb-1">1. Life-Safety & Sovereign Mandate:</p>
              <p className="leading-relaxed">
                Weather disasters (cyclones, extreme heat, heavy downpours, tsunamis) me <strong>evacuation, school closures, or civil defense orders</strong> keval authorized government agencies (jaise IMD, NDMA, NOAA) hi legally issue kar sakti hain. Koi bhi digital AI ya computational model directly legal order nahi de sakta.
              </p>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-amber-200">
              <p className="font-semibold text-amber-950 mb-1">2. Decision-Support vs Final Guarantee:</p>
              <p className="leading-relaxed">
                Yeh platform <strong>medium-range numerical models (GFS, ECMWF)</strong> aur <strong>real-time satellite passes</strong> ko fuse karke early anomaly screening provide karta hai. Atmospheric physics highly dynamic hoti hai, isliye predictive risk scores screening indicators hain — guaranteed predictions nahi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body (Collapsible) */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* 3 Structured Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Pillar 1 */}
            <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                <span>Decision-Support Scope</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This platform synthesizes numerical forecasts (GFS, ECMWF), satellite radiometry, and statistical Z-score/IQR anomaly metrics solely for early hazard screening and research analysis.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Authoritative Primacy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                It does <strong>not</strong> substitute for mandatory public safety bulletins. Emergency response, public warnings, and evacuation protocols remain the exclusive jurisdiction of recognized NMHS & RSMC authorities.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Probabilistic Risk Models</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Model anomaly indicators and satellite nowcasting reflect statistical divergence from climatological baselines and are inherently probabilistic rather than deterministic certainty.
              </p>
            </div>
          </div>

          {/* Direct Portals to Sovereign Warning Agencies */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 tracking-wide uppercase font-mono">
                Official Authoritative Warning Bulletins & Portals:
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Click any agency to cross-verify live civil bulletins
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {AUTHORITATIVE_AGENCIES.map((agency) => (
                <a
                  key={agency.name}
                  href={agency.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors group text-left"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {agency.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {agency.region} • <span className="font-mono text-slate-400">{agency.agency}</span>
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom Timestamp & Standards Signature */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100 font-mono">
            <span>
              Framework: Global Extreme Weather Anomaly Tracker • Open Data Multi-Source Architecture
            </span>
            <span>
              Standards Reference: WMO-No. 49 & UNDRR Common Alerting Protocol (CAP v1.2)
            </span>
          </div>
        </div>
      )}

      {/* Streamlined Compact View when collapsed */}
      {!isExpanded && (
        <div className="px-4 py-2.5 sm:px-6 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="truncate">
            <strong className="text-slate-700">Notice:</strong> Automated anomaly decision-support system. Evacuation and emergency directives must follow official agencies (IMD, NOAA, JTWC, NDMA).
          </p>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800 text-xs font-semibold whitespace-nowrap hover:underline"
          >
            Show Full Governance Details & Agencies →
          </button>
        </div>
      )}
    </footer>
  );
};
