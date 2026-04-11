import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import { useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Screen from '../../components/shared/Screen';
import {
  DestinationFilterConfig,
  FilterCategory,
  ManagedDestinationPayload,
  ManagedDestinationRecord
} from '../../types';
import { adminLogin } from '../../utils/ilpAdminApi';
import {
  createAdminDestination,
  deleteAdminDestination,
  fetchAdminDestinationFilterConfig,
  fetchAdminDestinations,
  updateAdminDestination,
  uploadDestinationImage
} from '../../utils/destinationApi';
import {
  DEFAULT_DESTINATION_FILTER_CONFIG,
  DESTINATION_CATEGORY_OPTIONS,
  getDefaultAppliesToCategoriesForFilterGroup
} from '../../data/destinationFilterConfig';
import DashboardIcon from '../../components/admin/DashboardIcon';
import DestinationIcon from '../../components/admin/DestinationIcon';
import CabIcon from '../../components/admin/CabIcon';
import HotelIcon from '../../components/admin/HotelIcon';
import EventIcon from '../../components/admin/EventIcon';

const TOKEN_KEY = 'tourism-admin-token';
const THEME_KEY = 'tourism-admin-theme';

type AdminSection = 'dashboard' | 'destinations' | 'cabs' | 'hotels' | 'events';
type AdminTheme = 'dark' | 'light';

const destinationCategoryOptions = DESTINATION_CATEGORY_OPTIONS;

const regionOptions = ['North', 'South', 'East', 'West', 'Central'];

const activityTagOptions: Array<{ value: string; label: string }> = [
  { value: 'trekking', label: 'Trekking' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'photography', label: 'Photography' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'relaxation', label: 'Relaxation' }
];

const durationOptions: Array<{ value: string; label: string }> = [
  { value: 'half-day', label: 'Half Day' },
  { value: 'full-day', label: 'Full Day' },
  { value: '2-days', label: 'Multi-Day' }
];

const destinationTypeTagOptions: Array<{ value: string; label: string }> = [
  { value: 'mountain', label: 'Mountain' },
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'cultural-site', label: 'Cultural Site' },
  { value: 'lake', label: 'Lake' },
  { value: 'national-park', label: 'National Park' },
  { value: 'wildlife-reserve', label: 'Wildlife Reserve' }
];

const defaultTypeTagByCategory: Record<string, string> = {
  nature: 'mountain',
  heritage: 'cultural-site',
  restaurant: 'cultural-site',
  cafe: 'cultural-site',
  parks: 'national-park'
};

const emptyFormState = (): ManagedDestinationPayload => ({
  slug: '',
  title: '',
  subtitle: '',
  curated_by: '',
  short_description: '',
  about: '',
  keyword_tags: [],
  region: 'Central',
  activity_type: [],
  destination_type: 'nature',
  destination_type_tags: [],
  destination_filter_tags: [],
  duration: 'half-day',
  best_time: '',
  entry_price: '₹ ',
  difficulty: 'easy',
  road_condition_status: 'good',
  rating: 4.5,
  travel_time: '1h drive',
  latitude: null,
  longitude: null,
  header_image_url: '',
  featured: false,
  is_published: true,
  gallery_images: [],
  folklore_stories: []
});

const parseCsv = (value: string): string[] => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const formatCsv = (items: string[]): string => {
  if (items.length === 0) {
    return '';
  }

  const hasTrailingComma = items[items.length - 1] === '';
  const cleanItems = hasTrailingComma ? items.slice(0, -1) : items;
  const joined = cleanItems.join(', ');

  return hasTrailingComma ? `${joined}${joined ? ', ' : ''}` : joined;
};

const sanitizeCsvItems = (items: string[]): string[] => items
  .map((item) => item.trim())
  .filter(Boolean);

const normalizeFilterConfig = (config: DestinationFilterConfig | null | undefined): DestinationFilterConfig => {
  if (!config || !Array.isArray(config.categories)) {
    return DEFAULT_DESTINATION_FILTER_CONFIG;
  }

  const categories = config.categories
    .map((category) => {
      const key = String(category.key || '').trim();
      const options = Array.isArray(category.options)
        ? category.options
          .map((option) => {
            const value = String(option.value || '').trim();
            if (!value) {
              return null;
            }

            return {
              value,
              label: String(option.label || value).trim() || value,
              description: String(option.description || '').trim(),
              bracketText: String(option.bracketText || '').trim() || undefined
            };
          })
          .filter(Boolean)
        : [];

      if (!key || options.length === 0) {
        return null;
      }

      return {
        key,
        title: String(category.title || key).trim() || key,
        appliesToCategories: (() => {
          const configuredScope = Array.isArray(category.appliesToCategories)
            ? category.appliesToCategories.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

          if (configuredScope.length > 0) {
            return configuredScope;
          }

          return getDefaultAppliesToCategoriesForFilterGroup(key);
        })(),
        options
      };
    })
    .filter(Boolean);

  if (categories.length === 0) {
    return DEFAULT_DESTINATION_FILTER_CONFIG;
  }

  const normalizedCategories = categories as FilterCategory[];
  const incomingByKey = new Map(normalizedCategories.map((category) => [category.key, category]));

  return {
    categories: DEFAULT_DESTINATION_FILTER_CONFIG.categories.map((defaultCategory) => (
      incomingByKey.get(defaultCategory.key) || defaultCategory
    ))
  };
};

const getCategoryScopedFilterGroups = (
  config: DestinationFilterConfig,
  category: string
): FilterCategory[] => config.categories.filter((filterCategory) => {
  const appliesTo = filterCategory.appliesToCategories || [];
  return appliesTo.length === 0 || appliesTo.includes(category);
});

const formatFilterOptionLabel = (option: { label: string; bracketText?: string }): string => {
  return option.bracketText ? `${option.label} (${option.bracketText})` : option.label;
};

const toPayloadFromRecord = (record: ManagedDestinationRecord): ManagedDestinationPayload => ({
  slug: record.slug,
  title: record.title,
  subtitle: record.subtitle || '',
  curated_by: record.curated_by || '',
  short_description: record.short_description,
  about: record.about,
  keyword_tags: record.keyword_tags,
  region: record.region,
  activity_type: record.activity_type,
  destination_type: record.destination_type,
  destination_type_tags: record.destination_type_tags || [],
  destination_filter_tags: record.destination_filter_tags || [],
  duration: record.duration,
  best_time: record.best_time || '',
  entry_price: record.entry_price || '₹ ',
  difficulty: record.difficulty,
  road_condition_status: record.road_condition_status,
  rating: Number(record.rating) || 4.5,
  travel_time: record.travel_time,
  latitude: record.latitude,
  longitude: record.longitude,
  header_image_url: record.header_image_url || '',
  featured: record.featured,
  is_published: record.is_published,
  gallery_images: record.gallery_images || [],
  folklore_stories: record.folklore_stories || []
});

const clonePayload = (payload: ManagedDestinationPayload): ManagedDestinationPayload => ({
  ...payload,
  keyword_tags: [...payload.keyword_tags],
  activity_type: [...payload.activity_type],
  destination_type_tags: [...payload.destination_type_tags],
  destination_filter_tags: [...(payload.destination_filter_tags || [])],
  gallery_images: payload.gallery_images.map((item) => ({ ...item })),
  folklore_stories: payload.folklore_stories.map((item) => ({ ...item }))
});

const toRadians = (value: number): number => (value * Math.PI) / 180;

const calculateDistanceInKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const buildAutoTravelText = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  userLocation: { latitude: number; longitude: number } | null
): string => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Set destination coordinates to auto-calculate from user location';
  }

  if (userLocation) {
    const distanceKm = calculateDistanceInKm(
      userLocation.latitude,
      userLocation.longitude,
      latitude as number,
      longitude as number
    );
    return `${distanceKm.toFixed(1)} km from your current location`;
  }

  return 'Auto-calculated from each user location';
};



// Sidebar Component
interface SidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, onLogout }) => {
  const navigate = useNavigate();
  return (
  <aside className="admin-sidebar">
    <div className="sidebar-brand" onClick={() => navigate('/home')} role="button" tabIndex={0} aria-label="Go home">
      <img src="/icons/title-mark.svg" alt="Tourism Project" className="sidebar-brand-mark" width="38" height="85" />
      <div className="sidebar-brand-text" aria-hidden="true">
        <span>TOURISM</span>
        <span>PROJECT</span>
      </div>
    </div>

    <nav className="admin-nav-menu">
      <button
        className={`admin-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
        onClick={() => onSectionChange('dashboard')}
        title="Dashboard"
        aria-label="Dashboard"
      >
        <div className="admin-nav-icon"><AutoGraphRoundedIcon /></div>
        <span className="admin-nav-label">Dashboard</span>
      </button>
      <button
        className={`admin-nav-item ${activeSection === 'destinations' ? 'active' : ''}`}
        onClick={() => onSectionChange('destinations')}
        title="Destinations"
        aria-label="Destinations"
      >
        <div className="admin-nav-icon"><DestinationIcon /></div>
        <span className="admin-nav-label">Destinations</span>
      </button>
      <button
        className={`admin-nav-item ${activeSection === 'cabs' ? 'active' : ''}`}
        onClick={() => onSectionChange('cabs')}
        title="Cabs"
        aria-label="Cabs"
      >
        <div className="admin-nav-icon"><DirectionsCarFilledRoundedIcon /></div>
        <span className="admin-nav-label">Cabs</span>
      </button>
      <button
        className={`admin-nav-item ${activeSection === 'hotels' ? 'active' : ''}`}
        onClick={() => onSectionChange('hotels')}
        title="Hotels"
        aria-label="Hotels"
      >
        <div className="admin-nav-icon"><HotelIcon /></div>
        <span className="admin-nav-label">Hotels</span>
      </button>
      <button
        className={`admin-nav-item ${activeSection === 'events' ? 'active' : ''}`}
        onClick={() => onSectionChange('events')}
        title="Events"
        aria-label="Events"
      >
        <div className="admin-nav-icon"><EventIcon /></div>
        <span className="admin-nav-label">Events</span>
      </button>
    </nav>

    <div className="admin-sidebar-footer">
      <button className="admin-logout-btn" onClick={onLogout} title="Logout" aria-label="Logout">
        <span className="admin-logout-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </span>
        <span className="admin-logout-label">Logout</span>
      </button>
    </div>
  </aside>
  );
};

// TopBar Component
interface TopBarProps {
  activeSection: AdminSection;
  theme: AdminTheme;
  onToggleTheme: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ activeSection, theme, onToggleTheme }) => {
  const sectionTitles: Record<AdminSection, string> = {
    dashboard: 'Dashboard',
    destinations: 'Destinations',
    cabs: 'Cabs',
    hotels: 'Hotels',
    events: 'Events'
  };

  return (
    <header className="admin-topbar">
      <div className="admin-breadcrumbs">
        <span className="admin-breadcrumb-item">Admin</span>
        <span className="admin-breadcrumb-separator">›</span>
        <span className="admin-breadcrumb-current">{sectionTitles[activeSection]}</span>
      </div>
      <div className="admin-topbar-actions">
        <button
          type="button"
          className="admin-theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2.5v2.3M12 19.2v2.3M4.93 4.93l1.62 1.62M17.45 17.45l1.62 1.62M2.5 12h2.3M19.2 12h2.3M4.93 19.07l1.62-1.62M17.45 6.55l1.62-1.62"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20.2 14.4A8.7 8.7 0 0 1 9.6 3.8a.7.7 0 0 0-.95-.75 9.5 9.5 0 1 0 12.3 12.3.7.7 0 0 0-.75-.95z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

// Coming Soon Section
interface ComingSoonProps {
  title: string;
}

const ComingSoonSection: React.FC<ComingSoonProps> = ({ title }) => (
  <div className="admin-coming-soon">
    <div className="admin-coming-soon-icon">🚧</div>
    <h3>{title} Management</h3>
    <p>This section is under development and will be available soon.</p>
  </div>
);

const AdminPage: React.FC = () => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [theme, setTheme] = useState<AdminTheme>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
  });
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [records, setRecords] = useState<ManagedDestinationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreatingNewDraft, setIsCreatingNewDraft] = useState<boolean>(false);
  const [pendingDraft, setPendingDraft] = useState<{
    form: ManagedDestinationPayload;
    tagsInput: string;
  } | null>(null);
  const [form, setForm] = useState<ManagedDestinationPayload>(emptyFormState());
  const [tagsInput, setTagsInput] = useState<string>('');
  const [selectedActivityOption, setSelectedActivityOption] = useState<string>('trekking');
  const [selectedTypeOption, setSelectedTypeOption] = useState<string>('mountain');
  const [selectedDynamicFilterOption, setSelectedDynamicFilterOption] = useState<Record<string, string>>({});
  const [filterConfig, setFilterConfig] = useState<DestinationFilterConfig>(DEFAULT_DESTINATION_FILTER_CONFIG);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleExpiredSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setRecords([]);
    setSelectedId(null);
    setIsCreatingNewDraft(false);
    setPendingDraft(null);
    setForm(emptyFormState());
    setTagsInput('');
    setSelectedDynamicFilterOption({});
    setFilterConfig(DEFAULT_DESTINATION_FILTER_CONFIG);
    setError('Session expired. Please sign in again.');
  };

  const isUnauthorizedError = (error: unknown): boolean => {
    return error instanceof Error && /unauthorized/i.test(error.message);
  };

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedId) || null,
    [records, selectedId]
  );

  useEffect(() => {
    if (activeSection !== 'destinations' || !mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current).setView([23.7271, 92.7176], 9);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    });

    mapRef.current = map;

    const resizeTimeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(resizeTimeout);
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [activeSection]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (Number.isFinite(form.latitude) && Number.isFinite(form.longitude)) {
      markerRef.current = L.circleMarker([form.latitude as number, form.longitude as number], {
        radius: 8,
        color: '#0a74da',
        fillColor: '#0a74da',
        fillOpacity: 0.7
      }).addTo(mapRef.current);

      mapRef.current.setView([form.latitude as number, form.longitude as number], 10);
    }
  }, [form.latitude, form.longitude]);

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

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const resizeTimeout = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 120);

    return () => window.clearTimeout(resizeTimeout);
  }, [isMapFullScreen]);

  const loadDestinations = async (authToken: string) => {
    setLoading(true);
    setError('');
    try {
      const destinations = await fetchAdminDestinations(authToken);
      setRecords(destinations);
      if (destinations.length > 0 && selectedId === null) {
        setSelectedId(destinations[0].id);
        const nextForm = toPayloadFromRecord(destinations[0]);
        setForm(nextForm);
        setTagsInput(formatCsv(nextForm.keyword_tags));
      }
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        handleExpiredSession();
        return;
      }

      const message = requestError instanceof Error ? requestError.message : 'Failed to load destinations';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterConfig = async (authToken: string) => {
    try {
      const response = await fetchAdminDestinationFilterConfig(authToken);
      const normalized = normalizeFilterConfig(response);
      setFilterConfig(normalized);
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        handleExpiredSession();
        return;
      }
      setFilterConfig(DEFAULT_DESTINATION_FILTER_CONFIG);
    }
  };

  useEffect(() => {
    if (token) {
      void loadDestinations(token);
      void loadFilterConfig(token);
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!token || !('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6))
        });
      },
      () => {
        setUserLocation(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000
      }
    );
  }, [token]);

  const scopedFilterGroups = useMemo(
    () => getCategoryScopedFilterGroups(filterConfig, form.destination_type),
    [filterConfig, form.destination_type]
  );

  useEffect(() => {
    if (scopedFilterGroups.length === 0) {
      setSelectedDynamicFilterOption({});
      return;
    }

    setSelectedDynamicFilterOption((prev) => {
      const next: Record<string, string> = {};
      for (const group of scopedFilterGroups) {
        const options = group.options || [];
        if (options.length === 0) {
          continue;
        }

        const previousValue = prev[group.key];
        const hasPrevious = options.some((option) => option.value === previousValue);
        next[group.key] = hasPrevious ? String(previousValue) : options[0].value;
      }

      return next;
    });
  }, [scopedFilterGroups]);

  useEffect(() => {
    const allowedTags = new Set(
      scopedFilterGroups.flatMap((group) => group.options.map((option) => option.value))
    );

    setForm((prev) => {
      const existing = prev.destination_filter_tags || [];
      const nextTags = existing.filter((tag) => allowedTags.has(tag));
      if (nextTags.length === existing.length) {
        return prev;
      }

      return {
        ...prev,
        destination_filter_tags: nextTags
      };
    });
  }, [scopedFilterGroups]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await adminLogin(username, password);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setUsername('');
      setPassword('');
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setRecords([]);
    setSelectedId(null);
    setIsCreatingNewDraft(false);
    setPendingDraft(null);
    setIsPreviewOpen(false);
    setUserLocation(null);
    setForm(emptyFormState());
    setTagsInput('');
    setSelectedDynamicFilterOption({});
    setFilterConfig(DEFAULT_DESTINATION_FILTER_CONFIG);
  };

  const handleSelectRecord = (record: ManagedDestinationRecord) => {
    if (isCreatingNewDraft) {
      setPendingDraft({
        form: clonePayload(form),
        tagsInput
      });
    }

    const nextForm = toPayloadFromRecord(record);
    setSelectedId(record.id);
    setIsCreatingNewDraft(false);
    setForm(nextForm);
    setTagsInput(formatCsv(nextForm.keyword_tags));
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setIsCreatingNewDraft(true);

    // Restore unsaved draft when returning from an existing record.
    if (pendingDraft && !isCreatingNewDraft) {
      setForm(clonePayload(pendingDraft.form));
      setTagsInput(pendingDraft.tagsInput);
      return;
    }

    setPendingDraft(null);
    setForm(emptyFormState());
    setTagsInput('');
  };

  const addTagToField = (field: 'activity_type' | 'destination_type_tags', value: string) => {
    if (!value) {
      return;
    }

    setForm((prev) => {
      const existing = prev[field] || [];
      if (existing.includes(value)) {
        return prev;
      }

      return {
        ...prev,
        [field]: [...existing, value]
      };
    });
  };

  const removeTagFromField = (field: 'activity_type' | 'destination_type_tags', value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((item) => item !== value)
    }));
  };

  const addDynamicFilterTag = (value: string) => {
    if (!value) {
      return;
    }

    setForm((prev) => {
      const existing = prev.destination_filter_tags || [];
      if (existing.includes(value)) {
        return prev;
      }

      return {
        ...prev,
        destination_filter_tags: [...existing, value]
      };
    });
  };

  const removeDynamicFilterTag = (value: string) => {
    setForm((prev) => ({
      ...prev,
      destination_filter_tags: (prev.destination_filter_tags || []).filter((item) => item !== value)
    }));
  };

  const handleDestinationTypeChange = (nextDestinationType: string) => {
    setSelectedDynamicFilterOption({});

    setForm((previous) => {
      const allowedTags = new Set(
        getCategoryScopedFilterGroups(filterConfig, nextDestinationType)
          .flatMap((group) => group.options.map((option) => option.value))
      );

      const nextFilterTags = (previous.destination_filter_tags || [])
        .filter((tag) => allowedTags.has(tag));

      return {
        ...previous,
        destination_type: nextDestinationType,
        destination_filter_tags: nextFilterTags
      };
    });
  };

  const normalizeEntryPrice = (value: string): string => {
    const raw = String(value || '').replace(/^₹\s*/, '');
    return `₹ ${raw}`.trimEnd();
  };

  const handleSave = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload: ManagedDestinationPayload = {
        ...form,
        keyword_tags: sanitizeCsvItems(form.keyword_tags),
        activity_type: sanitizeCsvItems(form.activity_type),
        destination_type_tags: sanitizeCsvItems(form.destination_type_tags),
        destination_filter_tags: sanitizeCsvItems(form.destination_filter_tags || []),
        entry_price: normalizeEntryPrice(form.entry_price || ''),
        travel_time: buildAutoTravelText(form.latitude, form.longitude, userLocation),
        rating: Number.isFinite(form.rating) ? form.rating : 4.5
      };

      if (payload.destination_type_tags.length === 0) {
        const fallbackTypeTag = defaultTypeTagByCategory[form.destination_type] || 'mountain';
        payload.destination_type_tags = [fallbackTypeTag];
      }

      if (form.destination_type === 'restaurant' || form.destination_type === 'cafe') {
        payload.curated_by = '';
        payload.difficulty = 'easy';
        payload.road_condition_status = 'good';
      }

      if (selectedId) {
        await updateAdminDestination(token, selectedId, payload);
      } else {
        const created = await createAdminDestination(token, payload);
        setSelectedId(created.id);
        setIsCreatingNewDraft(false);
        setPendingDraft(null);
      }

      await loadDestinations(token);
    } catch (saveError) {
      if (isUnauthorizedError(saveError)) {
        handleExpiredSession();
        return;
      }

      const message = saveError instanceof Error ? saveError.message : 'Failed to save destination';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedId) {
      return;
    }

    const confirmed = window.confirm('Delete this destination? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await deleteAdminDestination(token, selectedId);
      await loadDestinations(token);
      setSelectedId(null);
      setForm(emptyFormState());
    } catch (deleteError) {
      if (isUnauthorizedError(deleteError)) {
        handleExpiredSession();
        return;
      }

      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete destination';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderUpload = async (file?: File) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadDestinationImage(file, 'destination-headers');
      setForm((prev) => ({ ...prev, header_image_url: publicUrl }));
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload header image';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (file?: File) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadDestinationImage(file, 'destination-gallery');

      setForm((prev) => ({
        ...prev,
        gallery_images: [
          ...prev.gallery_images,
          {
            image_url: publicUrl,
            caption: '',
            sort_order: prev.gallery_images.length
          }
        ]
      }));
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload gallery image';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFolkloreImageUpload = async (index: number, file?: File) => {
    if (!file) {
      return;
    }

    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadDestinationImage(file, 'destination-folklore');
      setForm((prev) => ({
        ...prev,
        folklore_stories: prev.folklore_stories.map((story, storyIndex) =>
          storyIndex === index ? { ...story, image_url: publicUrl } : story
        )
      }));
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload folklore image';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  if (!token) {
    return (
      <Screen className="admin-destination-login-screen">
        <div className="admin-destination-login-card">
          <h1>Tourism Admin</h1>
          <p>Manage destination templates and folklore content.</p>
          <form onSubmit={handleLogin} className="admin-destination-login-form">
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
            </label>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            {error ? <p className="admin-destination-error">{error}</p> : null}
          </form>
        </div>
      </Screen>
    );
  }

  const renderDestinationsManager = () => {
    const selectedCategory = destinationCategoryOptions.find((option) => option.value === form.destination_type);
    const categoryLabel = selectedCategory ? selectedCategory.label : form.destination_type;
    const isFoodCategory = form.destination_type === 'restaurant' || form.destination_type === 'cafe';
    const isNatureCategory = form.destination_type === 'nature';
    const isHeritageCategory = form.destination_type === 'heritage';
    const isParksCategory = form.destination_type === 'parks';
    const showFolkloreStories = isNatureCategory || isHeritageCategory;
    const categoryFilterGroups = scopedFilterGroups;
    const filterLabelByValue = new Map<string, string>();

    for (const group of categoryFilterGroups) {
      for (const option of group.options) {
        filterLabelByValue.set(option.value, formatFilterOptionLabel(option));
      }
    }

    const subtitlePlaceholder = isNatureCategory
      ? 'A ridge above Aizawl with panoramic views'
      : form.destination_type === 'restaurant'
        ? 'Authentic Mizo flavors in a warm dining space'
        : form.destination_type === 'cafe'
          ? 'Cozy cafe with mountain views and local brews'
        : isParksCategory
          ? 'Green urban escape with trails and open spaces'
          : 'Historic location with rich heritage value';

    const tagsPlaceholder = isNatureCategory
      ? 'sunrise, viewpoint, forest trail'
      : form.destination_type === 'restaurant'
        ? 'Chinese cuisine, Thai food, Mizo theme food'
        : form.destination_type === 'cafe'
          ? 'artisan coffee, bakery cafe, Mizo fusion cafe'
        : isParksCategory
          ? 'garden trail, bird watching, family picnic'
          : 'heritage, museum, culture';

    const tagsLabel = isFoodCategory ? 'Theme of Food (comma separated)' : 'Tags (comma separated)';

    const activitiesLabel = isFoodCategory ? 'Offerings' : 'Activities';

    const bestTimeLabel = isFoodCategory ? 'Opening Days / Best Time' : 'Best Time';
    const bestTimePlaceholder = isNatureCategory
      ? 'October to March'
      : isFoodCategory
        ? 'Daily, 8 AM to 10 PM'
      : isParksCategory
        ? 'Early morning and late afternoon'
        : 'Morning and late afternoon';

    const entryPriceLabel = isFoodCategory ? 'Average Cost' : 'Entry Price';
    const entryPricePlaceholder = isNatureCategory
      ? 'Rs. 50 per person'
      : form.destination_type === 'restaurant'
        ? 'Rs. 600 for two people'
        : form.destination_type === 'cafe'
          ? 'Rs. 300 for two people'
        : isParksCategory
          ? 'Free or nominal ticket'
          : 'Rs. 20 per person';

    const autoTravelValue = buildAutoTravelText(form.latitude, form.longitude, userLocation);

    const shortDescriptionPlaceholder = isNatureCategory
      ? 'Short teaser shown in cards and gallery previews.'
      : form.destination_type === 'restaurant'
        ? 'Highlight cuisine, signature dishes, and the dining vibe.'
        : form.destination_type === 'cafe'
          ? 'Highlight beverages, ambience, and who this cafe is ideal for.'
        : isParksCategory
          ? 'Highlight the park vibe, activities, and best visitor type.'
          : 'Briefly capture why this heritage place is important and unique.';

    const aboutPlaceholder = isNatureCategory
      ? 'Describe the location, route, what to expect, and local tips.'
      : form.destination_type === 'restaurant'
        ? 'Describe menu highlights, opening hours, seating, and special recommendations.'
        : form.destination_type === 'cafe'
          ? 'Describe coffee/food options, ambience, timings, and best picks.'
        : isParksCategory
          ? 'Describe activities, facilities, timings, and what visitors should carry.'
          : 'Describe the historical background, significance, and what visitors should explore.';

    const previewTitle = form.title || 'Untitled destination';
    const previewSubtitle = form.subtitle || subtitlePlaceholder;
    const previewDescription = form.short_description || shortDescriptionPlaceholder;
    const previewAbout = form.about || aboutPlaceholder;

    return (
      <>
        <header className="admin-destination-header" style={{ marginBottom: "32px", width: "100%", padding: "32px", borderRadius: "16px" }}>
          <div className="admin-destination-title-block">
            <h1>Destination Content Manager</h1>
            <p>Turning places into compelling digital experiences</p>
          </div>
          <div className="admin-destination-stats-row">
            <span className="admin-destination-stat-chip">Total: {records.length}</span>
            <span className="admin-destination-stat-chip">Selected: {selectedRecord ? selectedRecord.title : 'Draft'}</span>
          </div>
        </header>

        <div className="admin-destination-layout">
          <aside className="admin-destination-sidebar">
            <div className="admin-destination-sidebar-head">
              <h3>Destinations</h3>
              <button
                type="button"
                className="admin-tag-add-btn admin-destination-create-btn"
                onClick={handleCreateNew}
                aria-label="Add destination"
                title="Add destination"
              >
                <svg className="admin-tag-add-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {isCreatingNewDraft ? (
              <div className="admin-destination-list-item admin-destination-list-item-draft active">
                <button
                  type="button"
                  className="admin-destination-list-main"
                  onClick={handleCreateNew}
                >
                  <strong>New destination</strong>
                  <span>Draft (not saved yet)</span>
                </button>
                <button
                  type="button"
                  className="admin-preview-trigger admin-preview-trigger-inline"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M2.8 12s3.6-6 9.2-6 9.2 6 9.2 6-3.6 6-9.2 6-9.2-6-9.2-6z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  Preview Page
                </button>
              </div>
            ) : null}
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`admin-destination-list-item ${selectedId === record.id ? 'active' : ''}`}
                onClick={() => handleSelectRecord(record)}
              >
                <strong>{record.title}</strong>
                <span>{record.slug}</span>
              </button>
            ))}
          </aside>

          <section className="admin-destination-editor">
            <div className="admin-destination-category-chip">Category: {categoryLabel}</div>

            <div className="admin-destination-grid">
              <label>
                Title
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Reiek Tlang" />
              </label>
              <label>
                Slug
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="reiek-tlang" />
              </label>
              <label>
                Category
                <select value={form.destination_type} onChange={(e) => handleDestinationTypeChange(e.target.value)}>
                  {destinationCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  {!destinationCategoryOptions.some((option) => option.value === form.destination_type) && form.destination_type ? (
                    <option value={form.destination_type}>{form.destination_type}</option>
                  ) : null}
                </select>
              </label>
              <label>
                Subtitle
                <input value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder={subtitlePlaceholder} />
              </label>
              <label>
                Region
                <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </label>
              <label>
                {tagsLabel}
                <input
                  value={tagsInput}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setTagsInput(nextValue);
                    setForm({ ...form, keyword_tags: parseCsv(nextValue) });
                  }}
                  placeholder={tagsPlaceholder}
                />
              </label>
              <label>
                {activitiesLabel}
                <div className="admin-tag-picker">
                  <div className="admin-tag-picker-controls">
                    <select
                      value={selectedActivityOption}
                      onChange={(e) => setSelectedActivityOption(e.target.value)}
                    >
                      {activityTagOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="tiny-outline admin-tag-add-btn"
                      onClick={() => addTagToField('activity_type', selectedActivityOption)}
                      aria-label="Add activity"
                    >
                      <svg className="admin-tag-add-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="admin-tag-list">
                    {form.activity_type.map((activity) => (
                      <span key={activity} className="admin-tag-chip">
                        {activityTagOptions.find((option) => option.value === activity)?.label || activity}
                        <button
                          type="button"
                          onClick={() => removeTagFromField('activity_type', activity)}
                          aria-label={`Remove ${activity}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </label>
              <label>
                Type
                <div className="admin-tag-picker">
                  <div className="admin-tag-picker-controls">
                    <select
                      value={selectedTypeOption}
                      onChange={(e) => setSelectedTypeOption(e.target.value)}
                    >
                      {destinationTypeTagOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="tiny-outline admin-tag-add-btn"
                      onClick={() => addTagToField('destination_type_tags', selectedTypeOption)}
                      aria-label="Add destination type"
                    >
                      <svg className="admin-tag-add-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="admin-tag-list">
                    {form.destination_type_tags.map((typeTag) => (
                      <span key={typeTag} className="admin-tag-chip">
                        {destinationTypeTagOptions.find((option) => option.value === typeTag)?.label || typeTag}
                        <button
                          type="button"
                          onClick={() => removeTagFromField('destination_type_tags', typeTag)}
                          aria-label={`Remove ${typeTag}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </label>
              <label className="admin-destination-filter-tags-field">
                Dynamic Filter Tags
                {categoryFilterGroups.length > 0 ? (
                  <div className="admin-destination-dynamic-tag-groups">
                    {categoryFilterGroups.map((group) => {
                      const selectedValue = selectedDynamicFilterOption[group.key] || group.options[0]?.value || '';
                      const selectedTagsForGroup = (form.destination_filter_tags || [])
                        .filter((tag) => group.options.some((option) => option.value === tag));

                      return (
                        <div key={group.key} className="admin-tag-picker admin-destination-dynamic-tag-group">
                          <span className="admin-destination-dynamic-tag-title">{group.title}</span>
                          <div className="admin-tag-picker-controls">
                            <select
                              value={selectedValue}
                              onChange={(event) => setSelectedDynamicFilterOption((prev) => ({
                                ...prev,
                                [group.key]: event.target.value
                              }))}
                            >
                              {group.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {formatFilterOptionLabel(option)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="tiny-outline admin-tag-add-btn"
                              onClick={() => addDynamicFilterTag(selectedValue)}
                              aria-label={`Add ${group.title} filter`}
                            >
                              <svg className="admin-tag-add-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                          <div className="admin-tag-list">
                            {selectedTagsForGroup.map((tagValue) => (
                              <span key={`${group.key}-${tagValue}`} className="admin-tag-chip">
                                {filterLabelByValue.get(tagValue) || tagValue}
                                <button
                                  type="button"
                                  onClick={() => removeDynamicFilterTag(tagValue)}
                                  aria-label={`Remove ${tagValue}`}
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-destination-dynamic-tag-empty">
                    No dynamic filter groups are configured for this category yet.
                  </p>
                )}
              </label>
              <label>
                Duration
                <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                {bestTimeLabel}
                <input value={form.best_time || ''} onChange={(e) => setForm({ ...form, best_time: e.target.value })} placeholder={bestTimePlaceholder} />
              </label>
              <label>
                {entryPriceLabel}
                <input
                  value={form.entry_price || '₹ '}
                  onChange={(e) => setForm({ ...form, entry_price: normalizeEntryPrice(e.target.value) })}
                  onFocus={() => {
                    if (!form.entry_price || form.entry_price.trim() === '') {
                      setForm({ ...form, entry_price: '₹ ' });
                    }
                  }}
                  placeholder={entryPricePlaceholder}
                />
              </label>
              {!isFoodCategory ? (
                <label>
                  Difficulty
                  <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="challenging">Challenging</option>
                  </select>
                </label>
              ) : null}
              {!isFoodCategory ? (
                <label>
                  Road Condition
                  <select
                    value={form.road_condition_status}
                    onChange={(e) => setForm({ ...form, road_condition_status: e.target.value })}
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </label>
              ) : null}
              <label>
                How to Reach (Auto)
                <input value={autoTravelValue} readOnly />
              </label>
              <label>
                Latitude
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitude ?? ''}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })}
                  placeholder="23.727100"
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitude ?? ''}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })}
                  placeholder="92.717600"
                />
              </label>
            </div>

            <label>
              Short Description
              <textarea
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                rows={2}
                placeholder={shortDescriptionPlaceholder}
              />
            </label>

            <label>
              {isFoodCategory ? 'About Place' : 'About Destination'}
              <textarea
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                rows={5}
                placeholder={aboutPlaceholder}
              />
            </label>

            <section className="admin-destination-media">
            <h3>Header Image</h3>
            <div className="admin-destination-upload-row">
              <input
                value={form.header_image_url || ''}
                onChange={(e) => setForm({ ...form, header_image_url: e.target.value })}
                placeholder="https://example.com/images/reiek-cover.jpg"
              />
              <input type="file" accept="image/*" onChange={(e) => void handleHeaderUpload(e.target.files?.[0])} />
              {form.header_image_url && (
                <button
                  type="button"
                  className="tiny-outline"
                  onClick={() => window.open(form.header_image_url, '_blank')}
                >
                    <VisibilityRoundedIcon fontSize="small" titleAccess="View Image"/>
                </button>
              )}
            </div>
          </section>

            <section className="admin-destination-media">
            <h3>Gallery Images</h3>
            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleGalleryUpload(file);
                e.currentTarget.value = '';
              }}
            />
            <div className="admin-gallery-list">
              {form.gallery_images.map((image, index) => (
                <div key={`${image.image_url}-${index}`} className="admin-gallery-item">
                  <input
                    value={image.image_url}
                    onChange={(e) => setForm({
                      ...form,
                      gallery_images: form.gallery_images.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, image_url: e.target.value } : item
                      )
                    })}
                    placeholder="https://example.com/images/reiek-view-1.jpg"
                  />
                  <input
                    value={image.caption || ''}
                    onChange={(e) => setForm({
                      ...form,
                      gallery_images: form.gallery_images.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, caption: e.target.value } : item
                      )
                    })}
                    placeholder="Sunrise point overlooking valley"
                  />
                  {image.image_url && (
                    <button
                      type="button"
                      className="tiny-outline"
                      onClick={() => window.open(image.image_url, '_blank')}
                    >
                    <VisibilityRoundedIcon fontSize="small" titleAccess="View Image"/>
                    </button>
                  )}
                  <button
                    type="button"
                    className="tiny-outline"
                    onClick={() => setForm({
                      ...form,
                      gallery_images: form.gallery_images.filter((_, itemIndex) => itemIndex !== index)
                    })}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="tiny-outline"
                disabled={uploading}
                onClick={() => galleryFileInputRef.current?.click()}
              >
                {uploading ? 'Uploading...' : '+ Add Image'}
              </button>
            </div>
            </section>

            {showFolkloreStories ? (
              <section className="admin-destination-media">
                <h3>Folklore Stories</h3>
                <button
                  type="button"
                  className="tiny-outline"
                  onClick={() => setForm({
                    ...form,
                    folklore_stories: [
                      ...form.folklore_stories,
                      { title: '', body: '', image_url: '', sort_order: form.folklore_stories.length }
                    ]
                  })}
                >
                  + Add Story
                </button>
                {form.folklore_stories.map((story, index) => (
                  <div key={`story-${index}`} className="admin-folklore-card">
                    <input
                      value={story.title}
                      onChange={(e) => setForm({
                        ...form,
                        folklore_stories: form.folklore_stories.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: e.target.value } : item
                        )
                      })}
                      placeholder="The Guardian of Reiek"
                    />
                    <textarea
                      rows={4}
                      value={story.body}
                      onChange={(e) => setForm({
                        ...form,
                        folklore_stories: form.folklore_stories.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, body: e.target.value } : item
                        )
                      })}
                      placeholder="Narrate the folklore in paragraphs..."
                    />
                    <div className="admin-destination-upload-row">
                      <input
                        value={story.image_url || ''}
                        onChange={(e) => setForm({
                          ...form,
                          folklore_stories: form.folklore_stories.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, image_url: e.target.value } : item
                          )
                        })}
                        placeholder="https://example.com/images/folklore-scene.jpg"
                      />
                      <input type="file" accept="image/*" onChange={(e) => void handleFolkloreImageUpload(index, e.target.files?.[0])} />
                      {story.image_url && (
                        <button
                          type="button"
                          className="tiny-outline"
                          onClick={() => {
                            if (story.image_url) {
                              window.open(story.image_url, '_blank');
                            }
                          }}
                        >
                    <VisibilityRoundedIcon fontSize="small" titleAccess="View Image"/>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="tiny-outline"
                      onClick={() => setForm({
                        ...form,
                        folklore_stories: form.folklore_stories.filter((_, itemIndex) => itemIndex !== index)
                      })}
                    >
                      Remove Story
                    </button>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="admin-destination-map-section">
            <div className="admin-destination-map-head">
              <h3>Pick Coordinates on Map</h3>
              <button
                type="button"
                className="admin-destination-map-fs-btn"
                onClick={() => setIsMapFullScreen((current) => !current)}
              >
                {isMapFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
            <div className={`admin-destination-map-wrap${isMapFullScreen ? ' full-screen' : ''}`}>
              {isMapFullScreen && (
                <button
                  type="button"
                  className="admin-destination-map-close-btn"
                  onClick={() => setIsMapFullScreen(false)}
                >
                  Exit Fullscreen
                </button>
              )}
              <div
                ref={mapElementRef}
                className="admin-destination-map-canvas"
                style={{ height: isMapFullScreen ? '100vh' : '260px', width: '100%' }}
              />
            </div>
            <p>Click anywhere on the map to set latitude/longitude. Distance to this destination will be automatically calculated based on each user's location (requires user location access).</p>
            </section>

            <div className="admin-destination-form-actions">
              <button type="button" className="primary-btn" disabled={loading || uploading} onClick={() => void handleSave()}>
                {loading ? 'Saving...' : selectedRecord ? 'Update Destination' : 'Create Destination'}
              </button>
              {selectedRecord ? (
                <button type="button" className="tiny-outline" disabled={loading} onClick={() => void handleDelete()}>
                  Delete Destination
                </button>
              ) : null}
            </div>
          </section>
        </div>

        {isPreviewOpen ? (
          <div
            className="admin-destination-preview-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Destination preview"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div className="admin-destination-preview-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-destination-preview-head">
                <h3>Preview Page</h3>
                <button
                  type="button"
                  className="tiny-outline"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close
                </button>
              </div>
              <article className="admin-destination-preview-card">
                <div
                  className="admin-destination-preview-hero"
                  style={form.header_image_url
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.68) 100%), url(${form.header_image_url})`
                      }
                    : undefined}
                >
                  <span className="admin-destination-preview-category">{categoryLabel}</span>
                  <h4>{previewTitle}</h4>
                  <p>{previewSubtitle}</p>
                </div>
                <div className="admin-destination-preview-body">
                  <p>{previewDescription}</p>
                  <div className="admin-destination-preview-chips">
                    {(form.keyword_tags.length > 0 ? form.keyword_tags : parseCsv(tagsPlaceholder)).map((tag) => (
                      <span key={tag} className="admin-destination-preview-chip">{tag}</span>
                    ))}
                  </div>
                  <p className="admin-destination-preview-about">{previewAbout}</p>
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <div className={`admin-page admin-theme-${theme}`}>
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} onLogout={handleLogout} />
      <div className="admin-main-wrapper">
        <TopBar
          activeSection={activeSection}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        />
        <main className="admin-content">
          {error ? <p className="admin-destination-error">{error}</p> : null}

          {activeSection === 'destinations' ? renderDestinationsManager() : null}
          {activeSection === 'dashboard' ? <ComingSoonSection title="Dashboard" /> : null}
          {activeSection === 'cabs' ? <ComingSoonSection title="Cabs" /> : null}
          {activeSection === 'hotels' ? <ComingSoonSection title="Hotels" /> : null}
          {activeSection === 'events' ? <ComingSoonSection title="Events" /> : null}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
