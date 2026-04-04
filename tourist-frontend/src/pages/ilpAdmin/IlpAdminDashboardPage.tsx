import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IlpApplicantRecord, IlpApplicationStatus, IlpApplicationType } from '../../types';
import { clearAdminApplications, fetchAdminApplications, updateApplicantStatus } from '../../utils/ilpAdminApi';

const LeafletMapContainer = MapContainer as unknown as React.ComponentType<Record<string, unknown>>;
const LeafletTileLayer = TileLayer as unknown as React.ComponentType<Record<string, unknown>>;
const LeafletCircleMarker = CircleMarker as unknown as React.ComponentType<Record<string, unknown>>;

const STATE_COORDINATES: Record<string, [number, number]> = {
  mizoram: [23.1645, 92.9376],
  assam: [26.2006, 92.9376],
  tripura: [23.9408, 91.9882],
  meghalaya: [25.467, 91.3662],
  manipur: [24.6637, 93.9063],
  nagaland: [26.1584, 94.5624],
  'arunachal pradesh': [28.218, 94.7278],
  'west bengal': [22.9868, 87.855],
  delhi: [28.7041, 77.1025],
  maharashtra: [19.7515, 75.7139],
  karnataka: [15.3173, 75.7139],
  'tamil nadu': [11.1271, 78.6569],
  kerala: [10.8505, 76.2711]
};

const TYPE_LABELS: Record<IlpApplicationType, string> = {
  temporary_ilp: 'Temporary ILP',
  temporary_stay_permit: 'Temporary Stay Permit',
  ilp_exemption: 'ILP Exemption'
};

const TYPE_COLORS: Record<IlpApplicationType, string> = {
  temporary_ilp: '#90CEFF',
  temporary_stay_permit: '#6366f1',
  ilp_exemption: '#a78bfa'
};

const STATUS_COLORS: Record<IlpApplicationStatus, string> = {
  pending: '#f59e0b',
  accepted: '#10b981',
  declined: '#ef4444'
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatType = (value: IlpApplicationType): string => TYPE_LABELS[value];

const formatNumber = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

const toDisplayValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return 'Not provided';
  const text = String(value).trim();
  return text.length > 0 ? text : 'Not provided';
};

const formatFileSize = (size: number | null): string => {
  if (!size || size <= 0) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

type ApplicantDocument = {
  label: string;
  documentType: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  publicUrl: string | null;
};

const buildApplicantDocuments = (applicant: IlpApplicantRecord): ApplicantDocument[] => {
  const documents: ApplicantDocument[] = [];

  if (applicant.upload_document_type || applicant.upload_document_file_name) {
    documents.push({
      label: 'Uploaded Document',
      documentType: applicant.upload_document_type,
      fileName: applicant.upload_document_file_name,
      fileType: applicant.upload_document_file_type,
      fileSize: applicant.upload_document_file_size,
      storagePath: applicant.upload_document_storage_path,
      publicUrl: applicant.upload_document_public_url
    });
  }

  if (applicant.supporting_document_type || applicant.supporting_document_file_name) {
    documents.push({
      label: 'Supporting Document',
      documentType: applicant.supporting_document_type,
      fileName: applicant.supporting_document_file_name,
      fileType: applicant.supporting_document_file_type,
      fileSize: applicant.supporting_document_file_size,
      storagePath: applicant.supporting_document_storage_path,
      publicUrl: applicant.supporting_document_public_url
    });
  }

  return documents;
};

/* ── Derived data builders ── */

const calculateDerivedMetrics = (applicants: IlpApplicantRecord[]) => {
  const total = applicants.length;
  const domestic = applicants.filter((item) => item.country?.toLowerCase() === 'india').length;
  const foreign = total - domestic;
  const overstayers = applicants.filter((item) => item.is_overstayer).length;
  const pending = applicants.filter((item) => item.application_status === 'pending').length;
  const accepted = applicants.filter((item) => item.application_status === 'accepted').length;
  const declined = applicants.filter((item) => item.application_status === 'declined').length;

  return { total, domestic, foreign, overstayers, pending, accepted, declined };
};

const buildTimeline = (applicants: IlpApplicantRecord[]) => {
  const grouped = new Map<string, number>();

  applicants.forEach((item) => {
    const date = new Date(item.submitted_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, count]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count
      };
    });
};

const buildTypeBreakdown = (applicants: IlpApplicantRecord[]) => {
  const breakdown = {
    temporary_ilp: 0,
    temporary_stay_permit: 0,
    ilp_exemption: 0
  } as Record<IlpApplicationType, number>;

  applicants.forEach((item) => {
    breakdown[item.application_type] += 1;
  });

  return [
    { name: TYPE_LABELS.temporary_ilp, value: breakdown.temporary_ilp, color: TYPE_COLORS.temporary_ilp },
    { name: TYPE_LABELS.temporary_stay_permit, value: breakdown.temporary_stay_permit, color: TYPE_COLORS.temporary_stay_permit },
    { name: TYPE_LABELS.ilp_exemption, value: breakdown.ilp_exemption, color: TYPE_COLORS.ilp_exemption }
  ];
};

const buildStatusBreakdown = (applicants: IlpApplicantRecord[]) => {
  const grouped = {
    pending: 0,
    accepted: 0,
    declined: 0
  } as Record<IlpApplicationStatus, number>;

  applicants.forEach((item) => {
    grouped[item.application_status] += 1;
  });

  return [
    { name: 'Pending', value: grouped.pending, color: STATUS_COLORS.pending },
    { name: 'Accepted', value: grouped.accepted, color: STATUS_COLORS.accepted },
    { name: 'Declined', value: grouped.declined, color: STATUS_COLORS.declined }
  ];
};

const buildMapPoints = (applicants: IlpApplicantRecord[]) => {
  const grouped = new Map<string, number>();

  applicants.forEach((item) => {
    if (!item.state) return;
    const key = item.state.toLowerCase();
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([state, count]) => {
      const coordinates = STATE_COORDINATES[state];
      return coordinates ? { state, count, coordinates } : null;
    })
    .filter(Boolean) as { state: string; count: number; coordinates: [number, number] }[];
};

const buildCountryBreakdown = (applicants: IlpApplicantRecord[]) => {
  const grouped = new Map<string, number>();
  applicants.forEach((item) => {
    const country = item.country || 'Unknown';
    grouped.set(country, (grouped.get(country) || 0) + 1);
  });

  const total = applicants.length || 1;
  return Array.from(grouped.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => ({
      country,
      count,
      pct: Math.round((count / total) * 100)
    }));
};

const buildPurposeBreakdown = (applicants: IlpApplicantRecord[]) => {
  const grouped = new Map<string, number>();
  applicants.forEach((item) => {
    const purpose = item.purpose_of_visit || 'Other';
    grouped.set(purpose, (grouped.get(purpose) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([purpose, count]) => ({ name: purpose, value: count }));
};

const CSV_EXPORT_COLUMNS: Array<{ key: keyof IlpApplicantRecord; label: string }> = [
  { key: 'reference_number', label: 'Reference Number' },
  { key: 'application_type', label: 'Application Type' },
  { key: 'application_status', label: 'Application Status' },
  { key: 'submitted_at', label: 'Submitted At' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date Of Birth' },
  { key: 'identity_mark', label: 'Identity Mark' },
  { key: 'mobile_no', label: 'Mobile Number' },
  { key: 'id_document_type', label: 'ID Document Type' },
  { key: 'id_document_number', label: 'ID Document Number' },
  { key: 'relation_type', label: 'Relation Type' },
  { key: 'relation_name', label: 'Relation Name' },
  { key: 'full_address', label: 'Full Address' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'purpose_of_visit', label: 'Purpose Of Visit' },
  { key: 'place_of_stay', label: 'Place Of Stay' },
  { key: 'proposed_date_of_entry', label: 'Proposed Date Of Entry' },
  { key: 'exemption_from_date', label: 'Exemption From Date' },
  { key: 'exemption_to_date', label: 'Exemption To Date' },
  { key: 'sponsor_full_name', label: 'Sponsor Full Name' },
  { key: 'sponsor_father_name', label: 'Sponsor Father Name' },
  { key: 'sponsor_epic_no', label: 'Sponsor EPIC Number' },
  { key: 'sponsor_mobile_no', label: 'Sponsor Mobile Number' },
  { key: 'sponsorship_type', label: 'Sponsorship Type' },
  { key: 'sponsor_district', label: 'Sponsor District' },
  { key: 'upload_document_type', label: 'Upload Document Type' },
  { key: 'upload_document_file_name', label: 'Upload Document File Name' },
  { key: 'upload_document_file_type', label: 'Upload Document File Type' },
  { key: 'upload_document_file_size', label: 'Upload Document File Size' },
  { key: 'upload_document_storage_path', label: 'Upload Document Storage Path' },
  { key: 'upload_document_public_url', label: 'Upload Document Public URL' },
  { key: 'supporting_document_type', label: 'Supporting Document Type' },
  { key: 'supporting_document_file_name', label: 'Supporting Document File Name' },
  { key: 'supporting_document_file_type', label: 'Supporting Document File Type' },
  { key: 'supporting_document_file_size', label: 'Supporting Document File Size' },
  { key: 'supporting_document_storage_path', label: 'Supporting Document Storage Path' },
  { key: 'supporting_document_public_url', label: 'Supporting Document Public URL' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'validity_days', label: 'Validity Days' },
  { key: 'stay_start_date', label: 'Stay Start Date' },
  { key: 'expiry_date', label: 'Expiry Date' },
  { key: 'days_remaining', label: 'Days Remaining' },
  { key: 'overstay_days', label: 'Overstay Days' },
  { key: 'is_overstayer', label: 'Is Overstayer' }
];

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const createApplicantsCsv = (applicants: IlpApplicantRecord[]): string => {
  const header = CSV_EXPORT_COLUMNS.map((column) => escapeCsvCell(column.label)).join(',');
  const rows = applicants.map((applicant) =>
    CSV_EXPORT_COLUMNS.map((column) => escapeCsvCell(applicant[column.key])).join(',')
  );

  return [header, ...rows].join('\r\n');
};

const downloadCsvFile = (content: string, fileName: string) => {
  const csvBlob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(csvBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
};

/* ── Donut SVG ── */
const DonutChart: React.FC<{ data: { name: string; value: number; color: string }[]; total: number }> = ({ data, total }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const sumValues = data.reduce((s, d) => s + d.value, 0) || 1;

  let offset = 0;
  const arcs = data.map((d) => {
    const pct = d.value / sumValues;
    const dasharray = `${pct * circumference} ${circumference}`;
    const dashoffset = -offset * circumference;
    offset += pct;
    return { ...d, dasharray, dashoffset };
  });

  return (
    <div className="ilp-admin-donut-container">
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
        {arcs.map((arc) => (
          <circle
            key={arc.name}
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="3"
            strokeDasharray={arc.dasharray}
            strokeDashoffset={arc.dashoffset}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="ilp-admin-donut-center">
        <span className="big-number">{formatNumber(total)}</span>
        <span className="big-label">Total</span>
      </div>
    </div>
  );
};

type ViewMode = 'analytics' | 'applications';

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */
const IlpAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('ilpAdminToken') || '';
  const adminUsername = localStorage.getItem('ilpAdminUsername') || 'Admin';

  const [activeView, setActiveView] = useState<ViewMode>('analytics');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IlpApplicationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<IlpApplicationType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'submitted_at' | 'full_name' | 'application_status' | 'reference_number' | 'days_remaining'>('submitted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<IlpApplicantRecord | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const pageSize = 15;

  useEffect(() => {
    if (!isMapFullScreen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMapFullScreen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMapFullScreen]);

  const applicantsQuery = useQuery({
    queryKey: ['admin-applicants', token, search, statusFilter, typeFilter, sortBy, sortOrder],
    queryFn: () =>
      fetchAdminApplications({
        token,
        search,
        status: statusFilter,
        type: typeFilter,
        sortBy,
        sortOrder
      }),
    enabled: Boolean(token)
  });

  const statusMutation = useMutation({
    mutationFn: ({ applicationType, id, status }: { applicationType: IlpApplicationType; id: number; status: IlpApplicationStatus }) =>
      updateApplicantStatus(token, applicationType, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applicants'] });
    }
  });

  const clearRecordsMutation = useMutation({
    mutationFn: () => clearAdminApplications(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applicants'] });
      setCurrentPage(1);
      setSelectedApplicant(null);
      setShowClearConfirmModal(false);
    }
  });

  const applicants = applicantsQuery.data?.applicants || [];
  const metrics = useMemo(() => calculateDerivedMetrics(applicants), [applicants]);
  const timeline = useMemo(() => buildTimeline(applicants), [applicants]);
  const typeBreakdown = useMemo(() => buildTypeBreakdown(applicants), [applicants]);
  const statusBreakdown = useMemo(() => buildStatusBreakdown(applicants), [applicants]);
  const mapPoints = useMemo(() => buildMapPoints(applicants), [applicants]);
  const countryBreakdown = useMemo(() => buildCountryBreakdown(applicants), [applicants]);
  const purposeBreakdown = useMemo(() => buildPurposeBreakdown(applicants), [applicants]);

  // Pagination
  const totalPages = Math.ceil(applicants.length / pageSize);
  const paginatedApplicants = applicants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Region progress bars from map points
  const regionTotal = mapPoints.reduce((s, p) => s + p.count, 0) || 1;
  const topRegions = [...mapPoints].sort((a, b) => b.count - a.count).slice(0, 4);

  if (!token) {
    return <Navigate to="/ilpadmin" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('ilpAdminToken');
    localStorage.removeItem('ilpAdminUsername');
    navigate('/ilpadmin');
  };

  const handleOpenPendingApplications = () => {
    setActiveView('applications');
    setStatusFilter('pending');
    setCurrentPage(1);
    setShowNotifications(false);
  };

  const openApplicantDetails = (applicant: IlpApplicantRecord) => {
    setSelectedApplicant(applicant);
  };

  const closeApplicantDetails = () => {
    setSelectedApplicant(null);
  };

  const handleExportCsv = () => {
    if (applicants.length === 0) {
      window.alert('No applicant records available to export.');
      return;
    }

    const csvContent = createApplicantsCsv(applicants);
    const dateSuffix = new Date().toISOString().slice(0, 10);
    downloadCsvFile(csvContent, `applicants-${dateSuffix}.csv`);
  };

  const handleClearRecords = () => {
    setShowClearConfirmModal(true);
  };

  const handleCloseClearConfirmModal = () => {
    if (clearRecordsMutation.isPending) {
      return;
    }

    setShowClearConfirmModal(false);
  };

  const handleConfirmClearRecords = () => {
    clearRecordsMutation.mutate();
  };

  const navItems = [
    { icon: '📊', label: 'Dashboard', view: 'analytics' as ViewMode },
    { icon: '📋', label: 'Applications', view: 'applications' as ViewMode }

  ];

  const activeSectionLabel = activeView === 'analytics' ? 'Dashboard' : 'Applications';

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </div>
          <div className="admin-brand-text">
            <h1>ILP Admin</h1>
            <p>Permit Console</p>
          </div>
        </div>

        <nav className="admin-nav-menu">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`admin-nav-item ${activeView === item.view ? 'active' : ''}`}
              onClick={() => { setActiveView(item.view); setCurrentPage(1); }}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="ilp-admin-sidebar-user-card" style={{ marginBottom: '12px' }}>
            <div className="user-avatar">{adminUsername.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <p className="user-name">{adminUsername}</p>
              <p className="user-role">Super Admin</p>
            </div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <div className="admin-breadcrumbs">
            <span className="admin-breadcrumb-item">ILP Admin</span>
            <span className="admin-breadcrumb-separator">›</span>
            <span className="admin-breadcrumb-current">{activeSectionLabel}</span>
          </div>
        </header>

        <main className="admin-content">
        <header className="ilp-admin-header">
          <div className="ilp-admin-search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="ilp-admin-search-input"
              placeholder="Search applications, reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ilp-admin-header-actions">
            <button
              type="button"
              className="ilp-admin-header-btn"
              onClick={() => setShowNotifications((current) => !current)}
              aria-label="Show notifications"
              aria-expanded={showNotifications}
            >
              🔔
              {metrics.pending > 0 && <span className="notif-dot" />}
            </button>

            {showNotifications && (
              <div className="ilp-admin-notif-panel">
                <button type="button" className="ilp-admin-notif-item" onClick={handleOpenPendingApplications}>
                  <span>Pending Applications</span>
                  <strong>= {metrics.pending}</strong>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="ilp-admin-body">

          {/* ══════════════════════════════════════
             ANALYTICS VIEW
             ══════════════════════════════════════ */}
          {activeView === 'analytics' && (
            <>
              {/* Hero KPI Section */}
              <section className="ilp-admin-hero">
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h1 className="ilp-admin-hero-title">Applications Distribution</h1>
                  <p className="ilp-admin-hero-subtitle">Summary of permit activity for the current period</p>

                  <div className="ilp-admin-kpis">
                    <div className="ilp-admin-kpi-card">
                      <p className="ilp-admin-kpi-label">Total Apps</p>
                      <h3 className="ilp-admin-kpi-value">{formatNumber(metrics.total)}</h3>
                      <div className="ilp-admin-kpi-trend up">
                        <span className="trend-icon">↑</span> Active
                        <span className="trend-note">all time</span>
                      </div>
                    </div>
                    <div className="ilp-admin-kpi-card">
                      <p className="ilp-admin-kpi-label">Domestic</p>
                      <h3 className="ilp-admin-kpi-value">{formatNumber(metrics.domestic)}</h3>
                      <div className="ilp-admin-kpi-trend up">
                        <span className="trend-icon">↑</span> Indian nationals
                      </div>
                    </div>
                    <div className="ilp-admin-kpi-card">
                      <p className="ilp-admin-kpi-label">Foreign</p>
                      <h3 className="ilp-admin-kpi-value">{formatNumber(metrics.foreign)}</h3>
                      <div className="ilp-admin-kpi-trend down">
                        <span className="trend-icon">↓</span> International
                      </div>
                    </div>
                    <div className="ilp-admin-kpi-card">
                      <p className="ilp-admin-kpi-label">Overstayers</p>
                      <h3 className="ilp-admin-kpi-value">{metrics.overstayers}</h3>
                      <div className="ilp-admin-kpi-trend warn">
                        Action Required
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ilp-admin-hero-shape">
                  <svg viewBox="0 0 200 200">
                    <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-46.2C87.4,-33.3,89.9,-17.7,89.6,-2.1C89.3,13.5,86.2,29.1,78.2,42.4C70.2,55.7,57.3,66.7,43.1,74.1C28.9,81.5,13.4,85.3,-1.6,88C-16.6,90.8,-32.1,92.5,-45.8,86C-59.5,79.5,-71.4,64.8,-79.1,49.5C-86.8,34.2,-90.3,18.3,-89.9,2.6C-89.5,-13.1,-85.2,-28.6,-76.4,-41.8C-67.6,-55,-54.3,-65.9,-40,-73.1C-25.7,-80.3,-10.4,-83.8,3,-88.9C16.4,-94,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
                  </svg>
                </div>
              </section>

              {/* Charts Grid */}
              <div className="ilp-admin-charts-row">
                {/* Left Column */}
                <div className="ilp-admin-charts-col">
                  {/* Application Type Overview (Donut) */}
                  <div className="ilp-admin-panel">
                    <div className="ilp-admin-panel-header">
                      <h2>Application Type Overview</h2>
                    </div>
                    <div className="ilp-admin-donut-wrap">
                      <DonutChart data={typeBreakdown} total={metrics.total} />

                      <div className="ilp-admin-donut-legend">
                        {typeBreakdown.map((item) => {
                          const pct = metrics.total > 0 ? Math.round((item.value / metrics.total) * 100) : 0;
                          return (
                            <div key={item.name} className="ilp-admin-donut-legend-item">
                              <div className="legend-left">
                                <span className="legend-dot" style={{ backgroundColor: item.color }} />
                                <span className="legend-name">{item.name}</span>
                              </div>
                              <span className="legend-pct">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="ilp-admin-status-summary">
                        <div className="ilp-admin-status-summary-item">
                          <p className="ss-label">Accepted</p>
                          <h5 className="ss-value green">{formatNumber(metrics.accepted)}</h5>
                        </div>
                        <div className="ilp-admin-status-summary-item">
                          <p className="ss-label">Declined</p>
                          <h5 className="ss-value red">{formatNumber(metrics.declined)}</h5>
                        </div>
                        <div className="ilp-admin-status-summary-item">
                          <p className="ss-label">Overstayers</p>
                          <h5 className="ss-value amber">{metrics.overstayers}</h5>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Regions */}
                  <div className="ilp-admin-panel">
                    <div className="ilp-admin-panel-header">
                      <h2>Active Regions</h2>
                      <span className="panel-badge">Live</span>
                    </div>
                    <div className="ilp-admin-progress-list">
                      {topRegions.map((region) => {
                        const pct = Math.round((region.count / regionTotal) * 100);
                        return (
                          <div key={region.state} className="ilp-admin-progress-item">
                            <div className="progress-meta">
                              <span className="progress-name" style={{ textTransform: 'capitalize' }}>{region.state}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="ilp-admin-progress-track">
                              <div className="ilp-admin-progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="ilp-admin-view-detail-btn"
                      onClick={() => {
                        const mapEl = document.getElementById('admin-map-section');
                        mapEl?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      View detailed map
                    </button>
                  </div>
                </div>

                {/* Right Column */}
                <div className="ilp-admin-charts-col">
                  {/* Timeline Area Chart */}
                  <div className="ilp-admin-panel">
                    <div className="ilp-admin-panel-header">
                      <div>
                        <h2>Application Timeline</h2>
                        <p>Monthly application submissions</p>
                      </div>
                    </div>
                    <div className="ilp-admin-chart-wrap">
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={timeline}>
                          <defs>
                            <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#90CEFF" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#90CEFF" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip />
                          <Area dataKey="count" stroke="#90CEFF" strokeWidth={2} fill="url(#timelineGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Distribution */}
                  <div className="ilp-admin-panel">
                    <div className="ilp-admin-panel-header">
                      <h2>Status Distribution</h2>
                    </div>
                    <div className="ilp-admin-chart-wrap">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={statusBreakdown}>
                          <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                            {statusBreakdown.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Countries */}
                  <div className="ilp-admin-panel">
                    <div className="ilp-admin-panel-header">
                      <h2>Top Countries</h2>
                      <span className="panel-badge">This Period</span>
                    </div>
                    <div className="ilp-admin-hbar-list">
                      {countryBreakdown.map((item, idx) => (
                        <div key={item.country} className="ilp-admin-hbar-item">
                          <span className="hbar-label">{item.country}</span>
                          <div className="ilp-admin-hbar-track">
                            <div
                              className={`ilp-admin-hbar-fill ${idx === 1 ? 'dim' : ''} ${idx >= 2 ? 'faint' : ''}`}
                              style={{ width: `${item.pct}%` }}
                            />
                            <span className="hbar-pct">{item.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Purpose of Visit */}
              <div className="ilp-admin-panel">
                <div className="ilp-admin-panel-header">
                  <h2>Purpose of Visit Breakdown</h2>
                </div>
                <div className="ilp-admin-chart-wrap">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={purposeBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#90CEFF" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Visitor Regions Map */}
              <div className="ilp-admin-panel" id="admin-map-section">
                <div className="ilp-admin-panel-header">
                  <h2>Visitor Regions (Map)</h2>
                  <div className="ilp-admin-map-header-actions">
                    <button
                      type="button"
                      className="ilp-admin-map-fullscreen-btn"
                      onClick={() => setIsMapFullScreen((current) => !current)}
                    >
                      {isMapFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                    <span className="panel-badge">Live</span>
                  </div>
                </div>
                <div className={`ilp-admin-map-wrap${isMapFullScreen ? ' full-screen' : ''}`}>
                  {isMapFullScreen && (
                    <button
                      type="button"
                      className="ilp-admin-map-close-btn"
                      onClick={() => setIsMapFullScreen(false)}
                    >
                      Exit Fullscreen
                    </button>
                  )}

                  <LeafletMapContainer
                    key={isMapFullScreen ? 'ilp-map-full' : 'ilp-map-default'}
                    center={[23.7, 92.7]}
                    zoom={4.5}
                    scrollWheelZoom={isMapFullScreen}
                    style={{ width: '100%', height: isMapFullScreen ? '100vh' : '300px' }}
                  >
                    <LeafletTileLayer
                      attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    {mapPoints.map((point) => (
                      <LeafletCircleMarker
                        key={point.state}
                        center={point.coordinates}
                        radius={Math.min(18, 6 + point.count * 0.8)}
                        pathOptions={{ color: '#90CEFF', fillColor: '#90CEFF', fillOpacity: 0.7 }}
                      >
                        <Popup>
                          <strong>{point.state.toUpperCase()}</strong>
                          <br />
                          Applicants: {point.count}
                        </Popup>
                      </LeafletCircleMarker>
                    ))}
                  </LeafletMapContainer>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════
             APPLICATIONS VIEW
             ══════════════════════════════════════ */}
          {activeView === 'applications' && (
            <div className="ilp-admin-table-section">
              <div className="ilp-admin-table-header">
                <h2>Recent Applications</h2>
                <div className="ilp-admin-table-actions">
                  <select
                    className="ilp-admin-filter-select"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as IlpApplicationStatus | 'all'); setCurrentPage(1); }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                  <select
                    className="ilp-admin-filter-select"
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value as IlpApplicationType | 'all'); setCurrentPage(1); }}
                  >
                    <option value="all">All Types</option>
                    <option value="temporary_ilp">Temporary ILP</option>
                    <option value="temporary_stay_permit">Temporary Stay Permit</option>
                    <option value="ilp_exemption">ILP Exemption</option>
                  </select>
                  <select
                    className="ilp-admin-filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="submitted_at">Sort: Submitted</option>
                    <option value="full_name">Sort: Name</option>
                    <option value="application_status">Sort: Status</option>
                    <option value="reference_number">Sort: Reference</option>
                    <option value="days_remaining">Sort: Days Remaining</option>
                  </select>
                  <select
                    className="ilp-admin-filter-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                  <button type="button" className="ilp-admin-export-btn" onClick={handleExportCsv}>Export CSV</button>
                  <button
                    type="button"
                    className="ilp-admin-export-btn ilp-admin-clear-btn"
                    onClick={handleClearRecords}
                    disabled={clearRecordsMutation.isPending}
                  >
                    {clearRecordsMutation.isPending ? 'Clearing...' : 'Clear Records'}
                  </button>
                </div>
              </div>

              {applicantsQuery.isLoading && <p className="ilp-admin-loading">Loading applicants...</p>}
              {applicantsQuery.isError && <p className="ilp-admin-error">Failed to load applicant data.</p>}

              <div className="ilp-admin-table-wrap">
                <table className="ilp-admin-table">
                  <thead>
                    <tr>
                      <th>Ref#</th>
                      <th>Full Name</th>
                      <th>Type</th>
                      <th>Country</th>
                      <th>Entry Date</th>
                      <th>Expiry</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Overstay</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedApplicants.map((item) => (
                      <tr key={`${item.application_type}-${item.id}`}>
                        <td className="ref-cell">{item.reference_number}</td>
                        <td className="name-cell">
                          <div>
                            <strong>{item.full_name}</strong>
                            <p>{item.mobile_no}</p>
                          </div>
                        </td>
                        <td>{formatType(item.application_type)}</td>
                        <td>{item.country}</td>
                        <td>{formatDate(item.stay_start_date)}</td>
                        <td>{formatDate(item.expiry_date)}</td>
                        <td>{item.validity_days} days</td>
                        <td>
                          <select
                            value={item.application_status}
                            onChange={(e) =>
                              statusMutation.mutate({
                                applicationType: item.application_type,
                                id: item.id,
                                status: e.target.value as IlpApplicationStatus
                              })
                            }
                            disabled={statusMutation.isPending}
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                          </select>
                        </td>
                        <td>
                          {item.is_overstayer ? (
                            <span className="ilp-admin-badge decline">{item.overstay_days} day(s)</span>
                          ) : (
                            <span className="ilp-admin-badge accept">Valid stay</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ilp-admin-action-btn"
                            title="View"
                            onClick={() => openApplicantDetails(item)}
                          >
                            👁
                          </button>
                          <button type="button" className="ilp-admin-action-btn" title="Edit" style={{ marginLeft: 8 }}>✏️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ilp-admin-table-footer">
                <p className="footer-info">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, applicants.length)} of {applicants.length.toLocaleString()} entries
                </p>
                <div className="ilp-admin-pagination">
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={currentPage === page ? 'active' : ''}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="ilp-admin-footer">
            <p>© 2024 PermitPro Systems</p>
            <div className="ilp-admin-footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Support</a>
            </div>
          </footer>
        </div>
        </main>
      </div>

      {showClearConfirmModal && (
        <div className="ilp-admin-confirm-overlay" onClick={handleCloseClearConfirmModal}>
          <section
            className="ilp-admin-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ilp-admin-clear-records-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="ilp-admin-clear-records-title">Clear all applicant records?</h3>
            <p>This will permanently delete all applicant records from Supabase. Do you want to continue?</p>
            <div className="ilp-admin-confirm-actions">
              <button
                type="button"
                className="ilp-admin-confirm-cancel"
                onClick={handleCloseClearConfirmModal}
                disabled={clearRecordsMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ilp-admin-confirm-danger"
                onClick={handleConfirmClearRecords}
                disabled={clearRecordsMutation.isPending}
              >
                {clearRecordsMutation.isPending ? 'Clearing...' : 'Yes, Clear Records'}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedApplicant && (
        <div className="ilp-admin-detail-overlay" onClick={closeApplicantDetails}>
          <section className="ilp-admin-detail-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="ilp-admin-detail-header">
              <div>
                <h3>Applicant Details</h3>
                <p>{selectedApplicant.reference_number} · {formatType(selectedApplicant.application_type)}</p>
              </div>
              <button type="button" className="ilp-admin-detail-close" onClick={closeApplicantDetails}>
                Close
              </button>
            </header>

            <div className="ilp-admin-detail-body">
              <section className="ilp-admin-detail-block">
                <h4>Application</h4>
                <div className="ilp-admin-detail-grid">
                  <div><span>Status</span><strong>{toDisplayValue(selectedApplicant.application_status)}</strong></div>
                  <div><span>Submitted On</span><strong>{formatDate(selectedApplicant.submitted_at)}</strong></div>
                  <div><span>Entry Date</span><strong>{formatDate(selectedApplicant.stay_start_date)}</strong></div>
                  <div><span>Expiry Date</span><strong>{formatDate(selectedApplicant.expiry_date)}</strong></div>
                  <div><span>Validity</span><strong>{toDisplayValue(`${selectedApplicant.validity_days} day(s)`)}</strong></div>
                  <div><span>Days Remaining</span><strong>{toDisplayValue(selectedApplicant.days_remaining)}</strong></div>
                </div>
              </section>

              <section className="ilp-admin-detail-block">
                <h4>Applicant Profile</h4>
                <div className="ilp-admin-detail-grid">
                  <div><span>Full Name</span><strong>{toDisplayValue(selectedApplicant.full_name)}</strong></div>
                  <div><span>Gender</span><strong>{toDisplayValue(selectedApplicant.gender)}</strong></div>
                  <div><span>Date of Birth</span><strong>{formatDate(selectedApplicant.date_of_birth)}</strong></div>
                  <div><span>Mobile Number</span><strong>{toDisplayValue(selectedApplicant.mobile_no)}</strong></div>
                  <div><span>Identity Mark</span><strong>{toDisplayValue(selectedApplicant.identity_mark)}</strong></div>
                  <div><span>ID Type</span><strong>{toDisplayValue(selectedApplicant.id_document_type)}</strong></div>
                  <div><span>ID Number</span><strong>{toDisplayValue(selectedApplicant.id_document_number)}</strong></div>
                  <div><span>Relation</span><strong>{toDisplayValue(`${selectedApplicant.relation_type}: ${selectedApplicant.relation_name}`)}</strong></div>
                  <div><span>Country</span><strong>{toDisplayValue(selectedApplicant.country)}</strong></div>
                  <div><span>State</span><strong>{toDisplayValue(selectedApplicant.state)}</strong></div>
                  <div><span>District</span><strong>{toDisplayValue(selectedApplicant.district)}</strong></div>
                  <div><span>Full Address</span><strong>{toDisplayValue(selectedApplicant.full_address)}</strong></div>
                </div>
              </section>

              <section className="ilp-admin-detail-block">
                <h4>Visit and Sponsor</h4>
                <div className="ilp-admin-detail-grid">
                  <div><span>Purpose of Visit</span><strong>{toDisplayValue(selectedApplicant.purpose_of_visit)}</strong></div>
                  <div><span>Place of Stay</span><strong>{toDisplayValue(selectedApplicant.place_of_stay)}</strong></div>
                  <div><span>Sponsor Name</span><strong>{toDisplayValue(selectedApplicant.sponsor_full_name)}</strong></div>
                  <div><span>Sponsor Father Name</span><strong>{toDisplayValue(selectedApplicant.sponsor_father_name)}</strong></div>
                  <div><span>Sponsor EPIC</span><strong>{toDisplayValue(selectedApplicant.sponsor_epic_no)}</strong></div>
                  <div><span>Sponsor Mobile</span><strong>{toDisplayValue(selectedApplicant.sponsor_mobile_no)}</strong></div>
                  <div><span>Sponsorship Type</span><strong>{toDisplayValue(selectedApplicant.sponsorship_type)}</strong></div>
                  <div><span>Sponsor District</span><strong>{toDisplayValue(selectedApplicant.sponsor_district)}</strong></div>
                  <div><span>Exemption From</span><strong>{toDisplayValue(selectedApplicant.exemption_from_date ? formatDate(selectedApplicant.exemption_from_date) : null)}</strong></div>
                  <div><span>Exemption To</span><strong>{toDisplayValue(selectedApplicant.exemption_to_date ? formatDate(selectedApplicant.exemption_to_date) : null)}</strong></div>
                  <div><span>Remarks</span><strong>{toDisplayValue(selectedApplicant.remarks)}</strong></div>
                </div>
              </section>

              <section className="ilp-admin-detail-block">
                <h4>Uploaded Documents</h4>
                <div className="ilp-admin-doc-list">
                  {buildApplicantDocuments(selectedApplicant).length === 0 && (
                    <p className="ilp-admin-doc-empty">No uploaded document metadata available.</p>
                  )}

                  {buildApplicantDocuments(selectedApplicant).map((doc) => (
                    <article className="ilp-admin-doc-item" key={`${doc.label}-${doc.fileName || 'none'}`}>
                      <h5>{doc.label}</h5>
                      <p><strong>Document Type:</strong> {toDisplayValue(doc.documentType)}</p>
                      <p><strong>File Name:</strong> {toDisplayValue(doc.fileName)}</p>
                      <p><strong>File Type:</strong> {toDisplayValue(doc.fileType)}</p>
                      <p><strong>File Size:</strong> {formatFileSize(doc.fileSize)}</p>
                      <p><strong>Storage Path:</strong> {toDisplayValue(doc.storagePath)}</p>
                      {doc.publicUrl && (
                        <p>
                          <strong>File Link:</strong>{' '}
                          <a href={doc.publicUrl} target="_blank" rel="noreferrer">
                            Open uploaded file
                          </a>
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default IlpAdminDashboardPage;
