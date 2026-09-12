import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dataset,
  DatasetRecord,
  DatasetType,
  DatasetStatus,
  AuditLogEntry,
  DatasetValidationResult,
  DatasetVersionDiffResult,
  LocationTimelineData,
  RiskLevel,
  HazardType,
} from '../types.ts';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Edit2,
  Trash2,
  Download,
  History,
  Archive,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  GitCommit,
  Layers,
  MapPin,
  Calendar,
  Eye,
  X,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Compass,
  FileText,
  Activity,
  GitCompare,
  Radio,
} from 'lucide-react';
import { DatasetVersionComparePanel } from './DatasetVersionComparePanel.tsx';
import { TimeSeriesEventTrackerPanel } from './TimeSeriesEventTrackerPanel.tsx';

interface DatasetManagementSectionProps {
  onSelectCoordinate?: (lat: number, lon: number) => void;
  onDatasetUpdated?: () => void;
}

export const DatasetManagementSection: React.FC<DatasetManagementSectionProps> = ({
  onSelectCoordinate,
  onDatasetUpdated,
}) => {
  // Main Data States
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'RECORDS' | 'COMPARE' | 'EVENT_TRACKER'>('RECORDS');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [recordSearchQuery, setRecordSearchQuery] = useState('');
  const [leadDayFilter, setLeadDayFilter] = useState<string>('ALL');

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isLocationTrackerOpen, setIsLocationTrackerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Active edit / target states
  const [editingRecord, setEditingRecord] = useState<DatasetRecord | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{ datasetId: string; recordId: string; location: string } | null>(null);

  // Upload Wizard State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<DatasetType>('AUTO_DETECT');
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [validationResult, setValidationResult] = useState<DatasetValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Version Update Wizard State
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionSummary, setVersionSummary] = useState('');
  const [versionDiff, setVersionDiff] = useState<DatasetVersionDiffResult | null>(null);
  const [isComputingDiff, setIsComputingDiff] = useState(false);
  const [isApplyingVersion, setIsApplyingVersion] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilterDataset, setAuditFilterDataset] = useState<string>('');

  // Location Tracker State
  const [trackerLocation, setTrackerLocation] = useState('Jaipur');
  const [trackerData, setTrackerData] = useState<LocationTimelineData | null>(null);
  const [isLoadingTracker, setIsLoadingTracker] = useState(false);

  // Record Form State
  const [recordForm, setRecordForm] = useState({
    location: '',
    continent: 'Asia',
    country: 'India',
    state: '',
    district: '',
    latitude: 26.9124,
    longitude: 75.7873,
    forecast_date: new Date().toISOString().split('T')[0],
    forecast_day: 1,
    temperature: 35.0,
    historical_temperature: 30.0,
    rainfall: 0.0,
    historical_rainfall: 2.0,
    wind_speed: 15.0,
    historical_wind: 10.0,
    relative_humidity: 50,
    status_note: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Datasets
  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/datasets?include_archived=true&include_deleted=false');
      if (res.ok) {
        const json = await res.json();
        setDatasets(json.datasets || []);
        if (!selectedDatasetId && json.datasets?.length > 0) {
          setSelectedDatasetId(json.datasets[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to load datasets: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Fetch Audit Logs
  const fetchAuditLogs = async (dsId?: string) => {
    try {
      const url = dsId ? `/api/datasets/audit/logs?dataset_id=${dsId}` : '/api/datasets/audit/logs';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.logs || []);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs', e);
    }
  };

  // Fetch Location Timeline Tracker
  const fetchLocationTimeline = async (locName: string) => {
    setIsLoadingTracker(true);
    try {
      const res = await fetch(`/api/datasets/location-tracker?location=${encodeURIComponent(locName)}`);
      if (res.ok) {
        const json = await res.json();
        setTrackerData(json.data);
      }
    } catch (e) {
      console.warn('Failed to fetch location timeline', e);
    } finally {
      setIsLoadingTracker(false);
    }
  };

  // Currently Selected Dataset
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;
  }, [datasets, selectedDatasetId]);

  // Filtered Datasets for Library
  const filteredDatasets = useMemo(() => {
    return datasets.filter((ds) => {
      if (statusFilter !== 'ALL' && ds.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && ds.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ds.name.toLowerCase().includes(q);
        const matchesDesc = ds.description?.toLowerCase().includes(q);
        const matchesLoc = ds.locations_list?.some((l) => l.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesLoc) return false;
      }
      return true;
    });
  }, [datasets, statusFilter, typeFilter, searchQuery]);

  // Filtered Records inside Active Dataset
  const filteredRecords = useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.records.filter((rec) => {
      if (leadDayFilter !== 'ALL' && String(rec.forecast_day) !== leadDayFilter) return false;
      if (recordSearchQuery.trim()) {
        const q = recordSearchQuery.toLowerCase();
        const locMatch = rec.location.toLowerCase().includes(q);
        const countryMatch = rec.country?.toLowerCase().includes(q);
        const stateMatch = rec.state?.toLowerCase().includes(q);
        const noteMatch = rec.status_note?.toLowerCase().includes(q);
        if (!locMatch && !countryMatch && !stateMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [activeDataset, leadDayFilter, recordSearchQuery]);

  // Calculated Real-Time Anomaly & Physical Preview for Record Form
  const recordFormPreview = useMemo(() => {
    const tempAnom = Math.round((recordForm.temperature - recordForm.historical_temperature) * 10) / 10;
    const rainAnom = Math.round((recordForm.rainfall - recordForm.historical_rainfall) * 10) / 10;
    const windAnom = Math.round((recordForm.wind_speed - recordForm.historical_wind) * 10) / 10;

    let risk: RiskLevel = 'LOW';
    let hazard: HazardType | 'NORMAL' = 'NORMAL';

    if (tempAnom >= 6.0 || recordForm.temperature >= 42) {
      hazard = 'HEATWAVE';
      risk = tempAnom >= 7.5 ? 'CRITICAL' : 'SEVERE';
    } else if (tempAnom <= -5.0 || recordForm.temperature <= 4) {
      hazard = 'COLDWAVE';
      risk = tempAnom <= -7.0 ? 'SEVERE' : 'HIGH';
    } else if (rainAnom >= 50 || recordForm.rainfall >= 65) {
      hazard = 'EXTREME_PRECIPITATION';
      risk = recordForm.rainfall >= 100 ? 'CRITICAL' : 'SEVERE';
    } else if (windAnom >= 25 || recordForm.wind_speed >= 50) {
      hazard = 'HIGH_WIND';
      risk = recordForm.wind_speed >= 65 ? 'CRITICAL' : 'HIGH';
    } else if (tempAnom >= 3.5 || rainAnom >= 25 || windAnom >= 15) {
      risk = 'MODERATE';
    }

    return { tempAnom, rainAnom, windAnom, risk, hazard };
  }, [recordForm]);

  // 2. Validate File Before Import
  const handleValidateFile = async (file: File) => {
    setUploadFile(file);
    setIsValidating(true);
    setValidationResult(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_type', uploadType);

    try {
      const res = await fetch('/api/datasets/validate', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        setValidationResult(json.validation);
        if (!uploadName) {
          setUploadName(file.name.replace(/\.[^/.]+$/, ''));
        }
        if (uploadType === 'AUTO_DETECT' && json.validation.detected_type) {
          setUploadType(json.validation.detected_type);
        }
      } else {
        setErrorMsg(json.message || 'File validation failed.');
      }
    } catch (e: any) {
      setErrorMsg('Validation network error: ' + e.message);
    } finally {
      setIsValidating(false);
    }
  };

  // 3. Confirm Import Dataset
  const handleConfirmImport = async () => {
    if (!uploadFile) return;
    setIsImporting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName || uploadFile.name);
    formData.append('type', uploadType);
    formData.append('description', uploadDescription);
    formData.append('author', 'Meteorologist / Operator');

    try {
      const res = await fetch('/api/datasets/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(`Successfully imported dataset "${json.dataset.name}" with ${json.dataset.total_rows} records!`);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setValidationResult(null);
        await fetchDatasets();
        setSelectedDatasetId(json.dataset.id);
        onDatasetUpdated?.();
      } else {
        setErrorMsg(json.message || 'Import failed.');
      }
    } catch (e: any) {
      setErrorMsg('Import error: ' + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  // 4. Compute Version Diff
  const handleComputeVersionDiff = async (file: File) => {
    if (!activeDataset) return;
    setVersionFile(file);
    setIsComputingDiff(true);
    setVersionDiff(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/datasets/${activeDataset.id}/version?preview_only=true`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        setVersionDiff(json.diff);
      } else {
        setErrorMsg(json.message || 'Failed to analyze version changes.');
      }
    } catch (e: any) {
      setErrorMsg('Diff computation failed: ' + e.message);
    } finally {
      setIsComputingDiff(false);
    }
  };

  // 5. Apply New Version
  const handleApplyNewVersion = async () => {
    if (!activeDataset || !versionFile) return;
    setIsApplyingVersion(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', versionFile);
    formData.append('change_summary', versionSummary || `Version update with updated observations.`);
    formData.append('author', 'Meteorologist / Operator');

    try {
      const res = await fetch(`/api/datasets/${activeDataset.id}/version`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(`Deployed version v${json.dataset.current_version} for "${json.dataset.name}"!`);
        setIsVersionModalOpen(false);
        setVersionFile(null);
        setVersionDiff(null);
        setVersionSummary('');
        await fetchDatasets();
        onDatasetUpdated?.();
      } else {
        setErrorMsg(json.message || 'Version deployment failed.');
      }
    } catch (e: any) {
      setErrorMsg('Version update error: ' + e.message);
    } finally {
      setIsApplyingVersion(false);
    }
  };

  // 6. Restore Historical Version
  const handleRestoreVersion = async (targetVer: number) => {
    if (!activeDataset) return;
    if (!window.confirm(`Restore dataset "${activeDataset.name}" back to historical version v${targetVer}? Current active data will be updated safely.`)) return;

    try {
      const res = await fetch(`/api/datasets/${activeDataset.id}/restore-version/${targetVer}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Meteorologist / Operator' }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(`Restored to version v${targetVer} as active v${json.dataset.current_version}!`);
        setIsHistoryModalOpen(false);
        await fetchDatasets();
        onDatasetUpdated?.();
      } else {
        setErrorMsg(json.message || 'Failed to restore version.');
      }
    } catch (e: any) {
      setErrorMsg('Restore version error: ' + e.message);
    }
  };

  // 7. Save (Create or Edit) Record
  const handleSaveRecord = async () => {
    if (!activeDataset) return;
    if (!recordForm.location.trim()) {
      alert('Location name is required.');
      return;
    }

    try {
      let res: Response;
      if (editingRecord) {
        // Edit record
        res = await fetch(`/api/datasets/${activeDataset.id}/records/${editingRecord.record_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordForm),
        });
      } else {
        // Add new record
        res = await fetch(`/api/datasets/${activeDataset.id}/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordForm),
        });
      }

      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(editingRecord ? `Updated record at "${recordForm.location}"!` : `Added record at "${recordForm.location}"!`);
        setIsRecordModalOpen(false);
        setEditingRecord(null);
        await fetchDatasets();
        onDatasetUpdated?.();
      } else {
        setErrorMsg(json.message || 'Failed to save record.');
      }
    } catch (e: any) {
      setErrorMsg('Record save error: ' + e.message);
    }
  };

  // 8. Delete Record
  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      const res = await fetch(`/api/datasets/${recordToDelete.datasetId}/records/${recordToDelete.recordId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Deleted record at "${recordToDelete.location}".`);
        setRecordToDelete(null);
        await fetchDatasets();
        onDatasetUpdated?.();
      }
    } catch (e: any) {
      setErrorMsg('Delete record failed: ' + e.message);
    }
  };

  // 9. Archive / Restore Dataset
  const handleToggleArchive = async (ds: Dataset) => {
    const isArchiving = ds.status === 'ACTIVE';
    const endpoint = isArchiving ? `/api/datasets/${ds.id}/archive` : `/api/datasets/${ds.id}/restore`;
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg(isArchiving ? `Archived dataset "${ds.name}".` : `Restored dataset "${ds.name}".`);
        await fetchDatasets();
        onDatasetUpdated?.();
      }
    } catch (e: any) {
      setErrorMsg('Failed to update archive status: ' + e.message);
    }
  };

  // 10. Delete Dataset (Soft or Hard)
  const handleConfirmDeleteDataset = async (hard: boolean = false) => {
    if (!datasetToDelete) return;
    try {
      const res = await fetch(`/api/datasets/${datasetToDelete.id}?hard=${hard}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Dataset "${datasetToDelete.name}" successfully removed.`);
        setIsDeleteConfirmOpen(false);
        setDatasetToDelete(null);
        await fetchDatasets();
        onDatasetUpdated?.();
      }
    } catch (e: any) {
      setErrorMsg('Delete dataset error: ' + e.message);
    }
  };

  // Open Edit Record Modal
  const openEditModal = (rec: DatasetRecord) => {
    setEditingRecord(rec);
    setRecordForm({
      location: rec.location,
      continent: rec.continent || 'Asia',
      country: rec.country || 'India',
      state: rec.state || '',
      district: rec.district || '',
      latitude: rec.latitude,
      longitude: rec.longitude,
      forecast_date: rec.forecast_date,
      forecast_day: rec.forecast_day,
      temperature: rec.temperature,
      historical_temperature: rec.historical_temperature,
      rainfall: rec.rainfall,
      historical_rainfall: rec.historical_rainfall,
      wind_speed: rec.wind_speed,
      historical_wind: rec.historical_wind,
      relative_humidity: rec.relative_humidity ?? 50,
      status_note: rec.status_note || '',
    });
    setIsRecordModalOpen(true);
  };

  // Open Add Record Modal
  const openAddModal = () => {
    setEditingRecord(null);
    setRecordForm({
      location: '',
      continent: activeDataset?.type === 'GLOBAL_EXTREME_WEATHER' ? 'Asia' : 'Asia',
      country: activeDataset?.type === 'INDIA_EXTREME_WEATHER' ? 'India' : 'India',
      state: '',
      district: '',
      latitude: 26.9124,
      longitude: 75.7873,
      forecast_date: new Date().toISOString().split('T')[0],
      forecast_day: 1,
      temperature: 36.0,
      historical_temperature: 31.0,
      rainfall: 0.0,
      historical_rainfall: 2.0,
      wind_speed: 16.0,
      historical_wind: 11.0,
      relative_humidity: 48,
      status_note: 'Operator Ingestion',
    });
    setIsRecordModalOpen(true);
  };

  return (
    <div className="space-y-6" id="dataset-management-section">
      {/* Top Action & KPI Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Living Meteorological Repositories & CRUD
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Dataset Management System
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Fully editable Excel (.xlsx, .xls) and CSV datasets. Inspect, edit records, recalculate anomalies, deploy version updates with diff comparisons, and track all operations in real-time audit logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setUploadFile(null);
                setValidationResult(null);
                setUploadName('');
                setUploadDescription('');
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Dataset (.xlsx, .csv)
            </button>

            <button
              type="button"
              onClick={() => {
                fetchAuditLogs();
                setIsAuditModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <History className="w-4 h-4 text-indigo-400" />
              Audit Log
            </button>

            <button
              type="button"
              onClick={() => {
                fetchLocationTimeline(activeDataset?.locations_list?.[0] || 'Jaipur');
                setIsLocationTrackerOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              Unified Location Tracker
            </button>

            <button
              type="button"
              onClick={fetchDatasets}
              disabled={isLoading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Refresh Datasets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Active Datasets</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-white">{datasets.filter((d) => d.status === 'ACTIVE').length}</span>
              <span className="text-xs text-slate-400">of {datasets.length} total</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Stored Records</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-400">
                {datasets.reduce((acc, d) => acc + (d.status === 'ACTIVE' ? d.total_rows : 0), 0)}
              </span>
              <span className="text-xs text-slate-400">observations</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Unique Locations</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-400">
                {new Set(datasets.flatMap((d) => (d.status === 'ACTIVE' ? d.locations_list : []))).size}
              </span>
              <span className="text-xs text-slate-400">monitored</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Data Separation</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">User Data vs Live API</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Strict isolation with dual-evidence recalculation</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Library Selector / Right Interactive Record Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dataset Library (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Dataset Library ({filteredDatasets.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Select to Inspect</span>
            </div>

            {/* Library Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search dataset name, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">All Types</option>
                  <option value="GLOBAL_EXTREME_WEATHER">Global Weather</option>
                  <option value="INDIA_EXTREME_WEATHER">India Weather</option>
                  <option value="OTHER_WEATHER">Other</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 focus:outline-hidden"
                >
                  <option value="ACTIVE">Active Datasets</option>
                  <option value="ARCHIVED">Archived Datasets</option>
                  <option value="ALL">All Status</option>
                </select>
              </div>
            </div>

            {/* Dataset Cards List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredDatasets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No datasets match the current search filters.
                </div>
              ) : (
                filteredDatasets.map((ds) => {
                  const isSelected = activeDataset?.id === ds.id;
                  return (
                    <div
                      key={ds.id}
                      onClick={() => setSelectedDatasetId(ds.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                ds.type === 'INDIA_EXTREME_WEATHER'
                                  ? 'bg-amber-100 text-amber-900'
                                  : ds.type === 'GLOBAL_EXTREME_WEATHER'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {ds.type === 'INDIA_EXTREME_WEATHER' ? 'India' : ds.type === 'GLOBAL_EXTREME_WEATHER' ? 'Global' : 'Other'}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900">
                              v{ds.current_version}
                            </span>
                            {ds.status === 'ARCHIVED' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{ds.name}</h4>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-400'}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>{ds.total_rows} rows</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{ds.total_locations} locations</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2 text-[10px] text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Range: {ds.date_range.start} → {ds.date_range.end}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Dataset Workspace & Records (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeDataset ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
              {/* Dataset Header & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">{activeDataset.name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900">
                      Version {activeDataset.current_version}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {activeDataset.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{activeDataset.description}</p>
                </div>

                {/* Primary Operations on Selected Dataset */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Record
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVersionFile(null);
                      setVersionDiff(null);
                      setVersionSummary('');
                      setIsVersionModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    Upload v{activeDataset.current_version + 1}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  >
                    <History className="w-3.5 h-3.5" />
                    History ({activeDataset.versions?.length || 1})
                  </button>

                  {/* Export Dropdown */}
                  <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs">
                    <a
                      href={`/api/datasets/${activeDataset.id}/export?format=csv`}
                      download
                      className="px-2.5 py-1 text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Download as CSV"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </a>
                    <span className="text-slate-300">|</span>
                    <a
                      href={`/api/datasets/${activeDataset.id}/export?format=xlsx`}
                      download
                      className="px-2.5 py-1 text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Download as Excel"
                    >
                      XLSX
                    </a>
                  </div>

                  {/* Archive Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(activeDataset)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
                    title={activeDataset.status === 'ACTIVE' ? 'Archive Dataset' : 'Restore Dataset'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setDatasetToDelete(activeDataset);
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="p-1.5 text-rose-500 hover:text-rose-800 hover:bg-rose-50 rounded-xl cursor-pointer"
                    title="Delete Dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Records Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search records in this dataset..."
                    value={recordSearchQuery}
                    onChange={(e) => setRecordSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-[11px] text-slate-500 font-medium">Lead Day:</span>
                  <select
                    value={leadDayFilter}
                    onChange={(e) => setLeadDayFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                  >
                    <option value="ALL">All Days (D1-D7)</option>
                    <option value="1">Day 1</option>
                    <option value="2">Day 2</option>
                    <option value="3">Day 3</option>
                    <option value="4">Day 4</option>
                    <option value="5">Day 5</option>
                    <option value="6">Day 6</option>
                    <option value="7">Day 7</option>
                  </select>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {filteredRecords.length} records
                  </span>
                </div>
              </div>

              {/* Interactive Records Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Location & Coord</th>
                      <th className="py-3 px-3">Date / Day</th>
                      <th className="py-3 px-3">Temperature</th>
                      <th className="py-3 px-3">Rainfall</th>
                      <th className="py-3 px-3">Wind</th>
                      <th className="py-3 px-3">Physical Risk</th>
                      <th className="py-3 px-3">Notes</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                          No records match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => {
                        const tempAnomPositive = rec.temperature_anomaly > 0;
                        const rainAnomPositive = rec.rainfall_anomaly > 0;
                        const isSevere = rec.risk_level === 'CRITICAL' || rec.risk_level === 'SEVERE';

                        return (
                          <tr key={rec.record_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <span>{rec.location}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectCoordinate?.(rec.latitude, rec.longitude)}
                                  className="text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  {rec.latitude}°N, {rec.longitude}°E
                                </button>
                                {rec.district && <span>• {rec.district}</span>}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-medium text-slate-800">{rec.forecast_date}</div>
                              <span className="inline-block px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[9px] font-bold mt-0.5">
                                Day +{rec.forecast_day}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-bold">{rec.temperature}°C</div>
                              <div className="text-[10px] flex items-center gap-1">
                                <span className="text-slate-400">Hist: {rec.historical_temperature}°C</span>
                                <span
                                  className={`font-bold ${
                                    rec.temperature_anomaly >= 4.0
                                      ? 'text-rose-600'
                                      : tempAnomPositive
                                      ? 'text-amber-600'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  ({tempAnomPositive ? '+' : ''}{rec.temperature_anomaly}°)
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-bold">{rec.rainfall} mm</div>
                              <div className="text-[10px] flex items-center gap-1">
                                <span className="text-slate-400">Hist: {rec.historical_rainfall}mm</span>
                                <span
                                  className={`font-bold ${
                                    rec.rainfall_anomaly >= 30
                                      ? 'text-indigo-600'
                                      : rainAnomPositive
                                      ? 'text-blue-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  ({rainAnomPositive ? '+' : ''}{rec.rainfall_anomaly}mm)
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-bold">{rec.wind_speed} km/h</div>
                              <div className="text-[10px] text-slate-400">
                                Anom: {rec.wind_anomaly > 0 ? `+${rec.wind_anomaly}` : rec.wind_anomaly} km/h
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rec.risk_level === 'CRITICAL'
                                    ? 'bg-rose-600 text-white'
                                    : rec.risk_level === 'SEVERE'
                                    ? 'bg-rose-100 text-rose-800'
                                    : rec.risk_level === 'HIGH'
                                    ? 'bg-amber-100 text-amber-800'
                                    : rec.risk_level === 'MODERATE'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {rec.risk_level || 'LOW'}
                              </span>
                              {rec.hazard_type && (
                                <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
                                  {rec.hazard_type}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-slate-600">
                              {rec.status_note || '—'}
                            </td>

                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(rec)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                  title="Edit Record Values"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRecordToDelete({
                                      datasetId: activeDataset.id,
                                      recordId: rec.record_id,
                                      location: rec.location,
                                    })
                                  }
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No Dataset Selected</h3>
              <p className="text-xs text-slate-400">Select a dataset from the library or upload a new one to begin editing.</p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          MODAL 1: UPLOAD DATASET WIZARD (WITH PRE-IMPORT VALIDATION)
         ========================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Meteorological Dataset</h3>
                  <p className="text-xs text-slate-500">Supports .xlsx, .xls and .csv with schema validation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: File Selection & Configuration */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dataset Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as DatasetType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="AUTO_DETECT">Auto Detect</option>
                    <option value="GLOBAL_EXTREME_WEATHER">Global Extreme Weather</option>
                    <option value="INDIA_EXTREME_WEATHER">India Extreme Weather</option>
                    <option value="OTHER_WEATHER">Other Weather Dataset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dataset Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Monsoon Heatwave Grid 2026"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Metadata</label>
                <input
                  type="text"
                  placeholder="Notes about sensors, regional scope, or model run"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                  uploadFile ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleValidateFile(f);
                  }}
                />
                {uploadFile ? (
                  <div className="space-y-1">
                    <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-900">{uploadFile.name}</p>
                    <p className="text-[11px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB • Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">Click to select or drag and drop file</p>
                    <p className="text-[11px] text-slate-400">Excel (.xlsx, .xls) or CSV files up to 35MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Feedback & Preview */}
            {isValidating && (
              <div className="text-center py-4 text-xs text-blue-600 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating columns, dates, latitude, longitude, and weather variables...
              </div>
            )}

            {validationResult && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Pre-Import Validation Result</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      validationResult.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {validationResult.valid ? 'PASSED VALIDATION' : `${validationResult.errors.length} ERRORS DETECTED`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">TOTAL ROWS</span>
                    <span className="text-sm font-bold text-slate-800">{validationResult.total_rows}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">VALID ROWS</span>
                    <span className="text-sm font-bold text-emerald-600">{validationResult.valid_rows}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">DETECTED TYPE</span>
                    <span className="text-xs font-bold text-blue-600">{validationResult.detected_type}</span>
                  </div>
                </div>

                {/* Validation Errors List */}
                {validationResult.errors.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5 max-h-32 overflow-y-auto">
                    <div className="font-bold flex items-center gap-1 text-rose-900">
                      <AlertOctagon className="w-3.5 h-3.5" /> Validation Errors:
                    </div>
                    {validationResult.errors.map((err, i) => (
                      <div key={i} className="text-[11px] leading-tight">
                        • Row {err.row}: <strong>{err.field}</strong> — {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Table of First Few Rows */}
                {validationResult.preview_rows.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700">Preview (First {validationResult.preview_rows.length} rows):</span>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-40">
                      <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[9px] uppercase">
                          <tr>
                            <th className="p-1.5">Loc</th>
                            <th className="p-1.5">Date</th>
                            <th className="p-1.5">Temp</th>
                            <th className="p-1.5">Rain</th>
                            <th className="p-1.5">Wind</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResult.preview_rows.map((pr, idx) => (
                            <tr key={idx}>
                              <td className="p-1.5 font-medium">{pr.location}</td>
                              <td className="p-1.5">{pr.forecast_date}</td>
                              <td className="p-1.5">{pr.temperature}°C ({pr.temperature_anomaly}°)</td>
                              <td className="p-1.5">{pr.rainfall}mm</td>
                              <td className="p-1.5">{pr.wind_speed}km/h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!uploadFile || isImporting || (validationResult !== null && !validationResult.valid)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isImporting ? 'Importing Dataset...' : 'Confirm & Ingest Dataset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: UPDATE DATASET / NEW VERSION WITH DIFF PREVIEW
         ========================================================= */}
      {isVersionModalOpen && activeDataset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Deploy New Version: v{activeDataset.current_version + 1}</h3>
                  <p className="text-xs text-slate-500">Incremental update with automated differential inspection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Version Change Summary</label>
                <input
                  type="text"
                  placeholder="e.g., Added updated Day 3 temperatures and inserted 4 coastal stations"
                  value={versionSummary}
                  onChange={(e) => setVersionSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Version File Picker */}
              <div
                onClick={() => versionFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                  versionFile ? 'border-purple-400 bg-purple-50/40' : 'border-slate-300 hover:border-purple-500'
                }`}
              >
                <input
                  ref={versionFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleComputeVersionDiff(f);
                  }}
                />
                {versionFile ? (
                  <div className="space-y-1">
                    <FileCheck className="w-8 h-8 text-purple-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-900">{versionFile.name}</p>
                    <p className="text-[11px] text-slate-500">Analyzing diff against v{activeDataset.current_version}...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">Select newer Excel or CSV file</p>
                    <p className="text-[11px] text-slate-400">Automated diff comparison will categorize Added, Updated, and Removed records</p>
                  </div>
                )}
              </div>
            </div>

            {isComputingDiff && (
              <div className="text-center py-4 text-xs text-purple-600 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Computing version difference against v{activeDataset.current_version}...
              </div>
            )}

            {/* Differential Inspection Summary */}
            {versionDiff && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Version Diff Summary</span>
                  <span className="text-[10px] text-slate-500">Review before confirming</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-800">
                    <span className="text-[9px] font-bold block">ADDED</span>
                    <span className="text-sm font-bold">+{versionDiff.summary.added}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-amber-800">
                    <span className="text-[9px] font-bold block">UPDATED</span>
                    <span className="text-sm font-bold">~{versionDiff.summary.updated}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-700">
                    <span className="text-[9px] font-bold block">UNCHANGED</span>
                    <span className="text-sm font-bold">={versionDiff.summary.unchanged}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl text-rose-800">
                    <span className="text-[9px] font-bold block">REMOVED</span>
                    <span className="text-sm font-bold">-{versionDiff.summary.removed}</span>
                  </div>
                </div>

                {/* Diff items preview */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                  {versionDiff.diff_items.filter((d) => d.type !== 'UNCHANGED').slice(0, 20).map((item, idx) => (
                    <div key={idx} className="text-[11px] p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md ${
                            item.type === 'ADDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.type === 'UPDATED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="font-semibold text-slate-800">{item.location}</span>
                        <span className="text-slate-400">({item.forecast_date} Day {item.forecast_day})</span>
                      </div>

                      {item.changed_fields && item.changed_fields.length > 0 && (
                        <div className="text-[10px] text-amber-700 font-medium">
                          {item.changed_fields.map((cf) => `${cf.field}: ${cf.old_val} → ${cf.new_val}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyNewVersion}
                disabled={!versionFile || isApplyingVersion || !versionDiff}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isApplyingVersion ? 'Deploying...' : `Deploy Version v${activeDataset.current_version + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: VERSION HISTORY DRAWER & RESTORE
         ========================================================= */}
      {isHistoryModalOpen && activeDataset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Version History & Recovery</h3>
                  <p className="text-xs text-slate-500">{activeDataset.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {activeDataset.versions.map((ver) => {
                const isCurrent = ver.version === activeDataset.current_version;
                return (
                  <div
                    key={ver.version}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
                          v{ver.version}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            CURRENT ACTIVE
                          </span>
                        )}
                        <span className="text-xs text-slate-400">• {new Date(ver.created_at).toLocaleString()}</span>
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(ver.version)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore This Version
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 mt-2 font-medium">{ver.change_summary}</p>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Contains {ver.records_count} records • Author: {ver.created_by}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: ADD / EDIT INDIVIDUAL RECORD
         ========================================================= */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRecord ? `Edit Record (${editingRecord.record_id})` : 'Add New Meteorological Record'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Values are validated and physical anomalies are automatically recalculated.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Location / Station Name *</label>
                <input
                  type="text"
                  value={recordForm.location}
                  onChange={(e) => setRecordForm({ ...recordForm, location: e.target.value })}
                  placeholder="e.g., Jaipur, Rajasthan"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* State / District */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">State / District (Optional)</label>
                <input
                  type="text"
                  value={recordForm.state}
                  onChange={(e) => setRecordForm({ ...recordForm, state: e.target.value })}
                  placeholder="e.g., Rajasthan"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Coordinates */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Latitude (-90 to 90)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={recordForm.latitude}
                  onChange={(e) => setRecordForm({ ...recordForm, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Longitude (-180 to 180)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={recordForm.longitude}
                  onChange={(e) => setRecordForm({ ...recordForm, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Date & Lead Day */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Forecast Date</label>
                <input
                  type="date"
                  value={recordForm.forecast_date}
                  onChange={(e) => setRecordForm({ ...recordForm, forecast_date: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Forecast Day (1 - 7)</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={recordForm.forecast_day}
                  onChange={(e) => setRecordForm({ ...recordForm, forecast_day: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={recordForm.temperature}
                  onChange={(e) => setRecordForm({ ...recordForm, temperature: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Historical Normal Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={recordForm.historical_temperature}
                  onChange={(e) => setRecordForm({ ...recordForm, historical_temperature: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Rainfall */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Rainfall (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={recordForm.rainfall}
                  onChange={(e) => setRecordForm({ ...recordForm, rainfall: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Historical Rainfall (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={recordForm.historical_rainfall}
                  onChange={(e) => setRecordForm({ ...recordForm, historical_rainfall: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Wind & Humidity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Wind Speed (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={recordForm.wind_speed}
                  onChange={(e) => setRecordForm({ ...recordForm, wind_speed: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Relative Humidity (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={recordForm.relative_humidity}
                  onChange={(e) => setRecordForm({ ...recordForm, relative_humidity: parseInt(e.target.value, 10) || 50 })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Status Note */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observation Note / Hazard Description</label>
                <input
                  type="text"
                  placeholder="e.g., Developing heat dome signal over semi-arid plains"
                  value={recordForm.status_note}
                  onChange={(e) => setRecordForm({ ...recordForm, status_note: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Reactive Computed Metrics Box */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Automatic Anomaly & Risk Recalculation:
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-semibold">TEMP ANOMALY</span>
                  <span
                    className={`font-bold ${
                      recordFormPreview.tempAnom > 0 ? 'text-rose-600' : 'text-blue-600'
                    }`}
                  >
                    {recordFormPreview.tempAnom > 0 ? '+' : ''}
                    {recordFormPreview.tempAnom}°C
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-semibold">RAIN ANOMALY</span>
                  <span className="font-bold text-indigo-600">
                    {recordFormPreview.rainAnom > 0 ? '+' : ''}
                    {recordFormPreview.rainAnom} mm
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-semibold">WIND ANOMALY</span>
                  <span className="font-bold text-slate-800">
                    {recordFormPreview.windAnom > 0 ? '+' : ''}
                    {recordFormPreview.windAnom} km/h
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-semibold">CALCULATED RISK</span>
                  <span
                    className={`font-bold text-[11px] ${
                      recordFormPreview.risk === 'CRITICAL'
                        ? 'text-rose-600'
                        : recordFormPreview.risk === 'SEVERE'
                        ? 'text-rose-500'
                        : recordFormPreview.risk === 'HIGH'
                        ? 'text-amber-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {recordFormPreview.risk}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecord}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {editingRecord ? 'Save Changes' : 'Add Record to Dataset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 5: AUDIT LOG DRAWER
         ========================================================= */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dataset & Record Audit Trail</h3>
                  <p className="text-xs text-slate-500">Complete logging of who, when, and what changed across all datasets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter by Dataset */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-semibold">Filter Dataset:</span>
              <select
                value={auditFilterDataset}
                onChange={(e) => {
                  setAuditFilterDataset(e.target.value);
                  fetchAuditLogs(e.target.value || undefined);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="">All Datasets</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400 ml-auto">{auditLogs.length} audit records</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="pt-2 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            log.operation === 'UPLOAD_DATASET'
                              ? 'bg-blue-100 text-blue-800'
                              : log.operation === 'NEW_VERSION'
                              ? 'bg-purple-100 text-purple-800'
                              : log.operation === 'UPDATE_RECORD'
                              ? 'bg-amber-100 text-amber-800'
                              : log.operation === 'DELETE_RECORD' || log.operation === 'DELETE_DATASET'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.operation}
                        </span>
                        <span className="font-bold text-slate-900">{log.dataset_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 pl-1">{log.details}</p>
                    <div className="text-[10px] text-slate-400 pl-1 flex items-center gap-2">
                      <span>Actor: {log.actor}</span>
                      {log.record_id && <span>• Target: {log.record_id}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 6: UNIFIED LOCATION TRACKER (TIMELINE VIEW)
         ========================================================= */}
      {isLocationTrackerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Unified Location Timeline Tracker</h3>
                  <p className="text-xs text-slate-500">
                    Seamless convergence: Historical Baseline → User Upload → Live API Sensor → 7-Day Numerical Forecast
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationTrackerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Location Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Select Location:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Jaipur', 'Tokyo', 'London', 'Mumbai', 'Kolkata', 'Chennai', 'Cairo', 'Sydney'].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setTrackerLocation(loc);
                      fetchLocationTimeline(loc);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      trackerLocation === loc
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingTracker && (
              <div className="text-center py-8 text-xs text-blue-600 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Aggregating historical, user-uploaded, live telemetry, and numerical forecast...
              </div>
            )}

            {trackerData && !isLoadingTracker && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{trackerData.location_name}</h4>
                    <p className="text-[11px] text-slate-500">
                      Coordinates: {trackerData.latitude}°N, {trackerData.longitude}°E
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    4-Stage Integrated Chain
                  </span>
                </div>

                {/* Timeline Step Cards */}
                <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                  {trackerData.timeline.map((pt, i) => (
                    <div key={i} className="relative flex items-start gap-4 pl-2">
                      <div
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold z-10 ${
                          pt.stage === 'HISTORICAL_BASELINE'
                            ? 'bg-slate-300 text-slate-800'
                            : pt.stage === 'USER_UPLOADED'
                            ? 'bg-purple-600 text-white'
                            : pt.stage === 'LIVE_OBSERVED'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {i + 1}
                      </div>

                      <div className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{pt.stage_label}</span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                pt.stage === 'USER_UPLOADED'
                                  ? 'bg-purple-100 text-purple-800'
                                  : pt.stage === 'LIVE_OBSERVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pt.stage === 'HISTORICAL_BASELINE'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {pt.provenance_badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{pt.date}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Temperature:</span>
                            <span className="font-bold text-slate-800">
                              {pt.temperature}°C {pt.temp_anomaly !== undefined && `(${pt.temp_anomaly > 0 ? '+' : ''}${pt.temp_anomaly}°)`}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Rainfall:</span>
                            <span className="font-bold text-slate-800">{pt.rainfall} mm</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Wind Speed:</span>
                            <span className="font-bold text-slate-800">{pt.wind_speed} km/h</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 pt-1 italic">Source: {pt.source_citation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLocationTrackerOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Tracker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 7: DELETE CONFIRMATION DIALOG (DATASET OR RECORD)
         ========================================================= */}
      {isDeleteConfirmOpen && datasetToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Dataset</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong>"{datasetToDelete.name}"</strong>?
              </p>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-xl">
              By default, datasets are soft-deleted into the archive trash and can be recovered by an administrator. Permanent deletion completely wipes all records and version history.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDeleteDataset(false)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Soft Delete (Move to Trash / Recovery Enabled)
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteDataset(true)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-rose-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Permanent Wipe (Irreversible)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDatasetToDelete(null);
                }}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Record Confirmation */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-xl space-y-3 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Delete Record at {recordToDelete.location}?</h3>
            <p className="text-xs text-slate-500">This will remove this observation and trigger anomaly recalculations.</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRecord}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
