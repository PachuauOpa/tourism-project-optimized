import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './CabServiceListPage.css';

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_category: string;
  vehicle_type: string;
  manufacturer_model: string;
  fuel_type: string;
  seating_capacity: number;
  year_of_manufacture: number;
  owner_name: string;
  owner_contact: string;
  distance_km?: number;
  cover_image?: string;
  permit_type?: string;
  driver_name?: string;
  organization_name?: string;
  service_type?: string;
  operating_areas?: string;
}

type ServiceSlug = 'taxis' | 'private-services' | 'rentals';
type ServiceKey = 'taxi' | 'private' | 'rental';
type SortKey = 'distance-asc' | 'distance-desc' | 'seats-desc' | 'year-desc' | 'name-asc';

const slugToServiceKey: Record<ServiceSlug, ServiceKey> = {
  taxis: 'taxi',
  'private-services': 'private',
  rentals: 'rental',
};

const serviceMeta: Record<ServiceKey, {
  title: string;
  subtitle: string;
  callLabel: string;
  emptyLabel: string;
  countLabel: string;
}> = {
  taxi: {
    title: 'Taxi Services',
    subtitle: 'Browse approved taxis currently in service and connect with drivers instantly.',
    callLabel: 'Call Driver',
    emptyLabel: 'No taxis matched your filters.',
    countLabel: 'taxis',
  },
  private: {
    title: 'Private Services',
    subtitle: 'Find registered private vehicles currently in service for your trip.',
    callLabel: 'Call Driver',
    emptyLabel: 'No private service vehicles matched your filters.',
    countLabel: 'private vehicles',
  },
  rental: {
    title: 'Rental Services',
    subtitle: 'Explore rental vehicles currently in service and contact owners directly.',
    callLabel: 'Call Owner',
    emptyLabel: 'No rental services matched your filters.',
    countLabel: 'rental vehicles',
  },
};

const sanitizePhoneNumber = (phone: string) => phone.replace(/[^+\d]/g, '');

const compareDistance = (a?: number, b?: number) => {
  if (a === undefined && b === undefined) {
    return 0;
  }
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  return a - b;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CabServiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { serviceSlug } = useParams<{ serviceSlug: ServiceSlug }>();

  const serviceKey = serviceSlug ? slugToServiceKey[serviceSlug as ServiceSlug] : undefined;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('distance-asc');
  const [vehicleType, setVehicleType] = useState('all');
  const [fuelType, setFuelType] = useState('all');
  const [permitType, setPermitType] = useState('all');
  const [rentalServiceType, setRentalServiceType] = useState('all');
  const [minSeats, setMinSeats] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchVehicles = useCallback(async (lat?: number, lng?: number) => {
    if (!serviceKey) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `${API_BASE_URL}/api/vehicles?category=${serviceKey}&limit=200`;
      if (lat !== undefined && lng !== undefined) {
        url += `&lat=${lat}&lng=${lng}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        let backendMessage = 'Failed to fetch service vehicles.';
        try {
          const payload = await res.json();
          if (payload?.error && typeof payload.error === 'string') {
            backendMessage = payload.error;
          }
        } catch {
          // Keep default message when the response body is not JSON.
        }
        throw new Error(backendMessage);
      }

      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unable to load vehicles right now. Please try again in a moment.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [serviceKey]);

  useEffect(() => {
    if (!serviceKey) {
      return;
    }

    if (!navigator.geolocation) {
      fetchVehicles();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchVehicles(position.coords.latitude, position.coords.longitude);
      },
      () => {
        fetchVehicles();
      }
    );
  }, [fetchVehicles, serviceKey]);

  const vehicleTypeOptions = useMemo(
    () => Array.from(new Set(vehicles.map((item) => item.vehicle_type).filter(Boolean))).sort(),
    [vehicles]
  );

  const fuelTypeOptions = useMemo(
    () => Array.from(new Set(vehicles.map((item) => item.fuel_type).filter(Boolean))).sort(),
    [vehicles]
  );

  const permitTypeOptions = useMemo(
    () => Array.from(new Set(vehicles.map((item) => item.permit_type).filter(Boolean) as string[])).sort(),
    [vehicles]
  );

  const rentalServiceOptions = useMemo(
    () => Array.from(new Set(vehicles.map((item) => item.service_type).filter(Boolean) as string[])).sort(),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const seats = minSeats ? Number(minSeats) : null;
    const year = minYear ? Number(minYear) : null;
    const distance = maxDistance ? Number(maxDistance) : null;

    const filtered = vehicles.filter((item) => {
      if (query) {
        const searchableText = [
          item.registration_number,
          item.vehicle_type,
          item.manufacturer_model,
          item.owner_name,
          item.driver_name,
          item.organization_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      if (vehicleType !== 'all' && item.vehicle_type !== vehicleType) {
        return false;
      }

      if (fuelType !== 'all' && item.fuel_type !== fuelType) {
        return false;
      }

      if (seats !== null && item.seating_capacity < seats) {
        return false;
      }

      if (year !== null && item.year_of_manufacture < year) {
        return false;
      }

      if (distance !== null && (item.distance_km === undefined || item.distance_km > distance)) {
        return false;
      }

      if (serviceKey === 'taxi' && permitType !== 'all' && item.permit_type !== permitType) {
        return false;
      }

      if (serviceKey === 'rental' && rentalServiceType !== 'all' && item.service_type !== rentalServiceType) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'distance-asc') {
        return compareDistance(a.distance_km, b.distance_km);
      }
      if (sortBy === 'distance-desc') {
        return compareDistance(b.distance_km, a.distance_km);
      }
      if (sortBy === 'seats-desc') {
        return b.seating_capacity - a.seating_capacity;
      }
      if (sortBy === 'year-desc') {
        return b.year_of_manufacture - a.year_of_manufacture;
      }

      const nameA = (a.driver_name || a.organization_name || a.owner_name || '').toLowerCase();
      const nameB = (b.driver_name || b.organization_name || b.owner_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [vehicles, search, vehicleType, fuelType, minSeats, minYear, maxDistance, serviceKey, permitType, rentalServiceType, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setSortBy('distance-asc');
    setVehicleType('all');
    setFuelType('all');
    setPermitType('all');
    setRentalServiceType('all');
    setMinSeats('');
    setMinYear('');
    setMaxDistance('');
  };

  if (!serviceKey) {
    return <Navigate to="/service/cabs" replace />;
  }

  const meta = serviceMeta[serviceKey];

  return (
    <div className="tw-bg-m3-surface tw-text-m3-on-surface tw-pb-32 tw-min-h-screen tw-font-sans tw-flex tw-flex-col">
      {/* TopAppBar */}
      <header className="tw-bg-m3-surface/80 hover:tw-backdrop-blur-md tw-w-full tw-px-6 tw-py-4 tw-sticky tw-top-0 tw-z-40 tw-flex tw-justify-between tw-items-center">
        <button 
          onClick={() => navigate('/service/cabs')} 
          className="tw-text-m3-on-surface-variant hover:tw-bg-m3-surface-container tw-transition-colors tw-p-2 tw-rounded-full tw-flex tw-items-center tw-justify-center"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        
        <h1 className="tw-text-2xl tw-font-bold tw-text-m3-primary">{meta.title}</h1>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="tw-text-m3-primary tw-bg-m3-primary/10 hover:tw-bg-m3-surface-container tw-transition-colors tw-p-2 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow-sm"
        >
          <span className="material-symbols-outlined">tune</span>
        </button>
      </header>

      <main className="tw-px-6 tw-pt-2 tw-flex tw-flex-col tw-gap-4">
        {/* Location & Search */}
        <div className="tw-flex tw-flex-col tw-gap-2">
          <div className="tw-flex tw-items-center tw-gap-2 tw-text-m3-on-surface-variant">
            <span className="material-symbols-outlined tw-text-[18px]">location_on</span>
            <span className="tw-text-sm tw-font-medium">Current Location</span>
          </div>
          
          <div className="tw-relative tw-w-full">
            <span className="material-symbols-outlined tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-m3-outline">search</span>
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tw-w-full tw-bg-m3-surface-container tw-rounded-[16px] tw-py-3 tw-pl-12 tw-pr-4 tw-border-none focus:tw-ring-2 focus:tw-ring-m3-primary/50 tw-text-m3-on-surface placeholder:tw-text-m3-outline tw-transition-shadow" 
              placeholder="Where to? (Search model, driver...)" 
              type="text" 
            />
          </div>
        </div>

        {/* Horizontal Chips */}
        <div className="tw-flex tw-gap-3 tw-overflow-x-auto no-scrollbar tw-py-2 tw--mx-6 tw-px-6">
          <button 
            onClick={() => setVehicleType('all')}
            className={`tw-whitespace-nowrap tw-px-4 tw-py-2 tw-rounded-full tw-font-semibold tw-text-xs tw-transition-colors tw-shadow-sm ${vehicleType === 'all' ? 'tw-bg-m3-primary tw-text-m3-on-primary' : 'tw-bg-m3-surface-container tw-text-m3-on-surface-variant hover:tw-bg-m3-surface-container-high'}`}
          >
            All
          </button>
          {vehicleTypeOptions.map((type) => (
            <button 
              key={type}
              onClick={() => setVehicleType(type)}
              className={`tw-whitespace-nowrap tw-px-4 tw-py-2 tw-rounded-full tw-font-semibold tw-text-xs tw-transition-colors tw-shadow-sm tw-flex tw-items-center tw-gap-1 ${vehicleType === type ? 'tw-bg-m3-primary tw-text-m3-on-primary' : 'tw-bg-m3-surface-container tw-text-m3-on-surface-variant hover:tw-bg-m3-surface-container-high'}`}
            >
              {type === 'EV' && <span className="material-symbols-outlined tw-text-[14px]">bolt</span>} {type}
            </button>
          ))}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="tw-bg-m3-surface-container-lowest tw-rounded-[24px] tw-p-4 tw-shadow-[0px_10px_30px_rgba(0,0,0,0.04)] tw-border tw-border-m3-outline-variant tw-flex tw-flex-col tw-gap-3">
            <h3 className="tw-text-m3-on-surface tw-font-semibold">Advanced Filters</h3>
            <div className="tw-grid tw-grid-cols-2 tw-gap-4">
              <label className="tw-flex tw-flex-col tw-text-xs tw-text-m3-on-surface-variant tw-gap-1">
                Sort By
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="tw-bg-m3-surface-container tw-border-none tw-rounded-lg tw-py-2 tw-px-3 tw-text-m3-on-surface">
                  <option value="distance-asc">Nearest first</option>
                  <option value="distance-desc">Farthest first</option>
                  <option value="seats-desc">Higher seats first</option>
                  <option value="year-desc">Newer</option>
                  <option value="name-asc">A-Z</option>
                </select>
              </label>

              <label className="tw-flex tw-flex-col tw-text-xs tw-text-m3-on-surface-variant tw-gap-1">
                Fuel Type
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="tw-bg-m3-surface-container tw-border-none tw-rounded-lg tw-py-2 tw-px-3 tw-text-m3-on-surface">
                  <option value="all">All</option>
                  {fuelTypeOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>

              <label className="tw-flex tw-flex-col tw-text-xs tw-text-m3-on-surface-variant tw-gap-1">
                Min Seats
                <input type="number" min="1" value={minSeats} onChange={(e) => setMinSeats(e.target.value)} placeholder="Any" className="tw-bg-m3-surface-container tw-border-none tw-rounded-lg tw-py-2 tw-px-3 tw-text-m3-on-surface" />
              </label>

              <label className="tw-flex tw-flex-col tw-text-xs tw-text-m3-on-surface-variant tw-gap-1">
                Max Distance (km)
                <input type="number" min="1" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} placeholder="Any" className="tw-bg-m3-surface-container tw-border-none tw-rounded-lg tw-py-2 tw-px-3 tw-text-m3-on-surface" />
              </label>

              {serviceKey === 'taxi' && (
                <label className="tw-col-span-2 tw-flex tw-flex-col tw-text-xs tw-text-m3-on-surface-variant tw-gap-1">
                  Permit Type
                  <select value={permitType} onChange={(e) => setPermitType(e.target.value)} className="tw-bg-m3-surface-container tw-border-none tw-rounded-lg tw-py-2 tw-px-3 tw-text-m3-on-surface">
                    <option value="all">All</option>
                    {permitTypeOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              )}
            </div>
            
            <button type="button" onClick={resetFilters} className="tw-mt-2 tw-self-end tw-text-sm tw-text-m3-error tw-font-semibold">Reset Filters</button>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
          {loading && <p className="tw-text-m3-on-surface-variant tw-col-span-2 tw-text-center tw-py-8">Loading available rides...</p>}
          {!loading && error && <p className="tw-text-m3-error tw-col-span-2 tw-text-center tw-py-8">{error}</p>}
          {!loading && !error && filteredVehicles.length === 0 && (
            <p className="tw-text-m3-on-surface-variant tw-col-span-2 tw-text-center tw-py-8">{meta.emptyLabel}</p>
          )}
          
          {!loading && !error && filteredVehicles.map((item) => {
            const contactNumber = sanitizePhoneNumber(item.owner_contact || '');
            const contactName = serviceKey === 'rental' 
              ? (item.owner_name || item.organization_name || 'Owner') 
              : (item.driver_name || item.owner_name);

            return (
              <div key={item.id} className="tw-bg-m3-surface-container-lowest tw-rounded-[24px] tw-p-4 tw-shadow-[0px_10px_30px_rgba(0,0,0,0.04)] tw-border tw-border-m3-outline-variant tw-flex tw-flex-col tw-gap-3 tw-relative tw-overflow-hidden">
                <div className="tw-w-full tw-h-24 tw-rounded-lg tw-overflow-hidden tw-bg-m3-surface-container tw-flex tw-items-center tw-justify-center tw-mt-2 tw-text-m3-on-surface-variant">
                  {item.cover_image ? (
                    <img alt={`${item.vehicle_type} cover`} className="tw-w-full tw-h-full tw-object-cover" src={item.cover_image} />
                  ) : (
                    <span className="material-symbols-outlined tw-text-4xl tw-opacity-50">directions_car</span>
                  )}
                </div>
                
                <div className="tw-flex tw-flex-col tw-gap-1">
                  <div className="tw-flex tw-justify-between tw-items-start">
                    <h3 className="tw-font-bold tw-text-sm tw-text-m3-on-surface tw-leading-tight tw-line-clamp-1">{item.manufacturer_model || 'Unknown Model'}</h3>
                  </div>
                  <p className="tw-font-semibold tw-text-[10px] tw-tracking-wide tw-uppercase tw-text-m3-on-surface-variant tw-truncate">{item.vehicle_type}</p>
                </div>
                
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-m3-on-surface-variant tw-font-semibold tw-text-[10px] tw-uppercase tw-tracking-wide">
                  <div className="tw-flex tw-items-center tw-gap-0.5">
                    <span className="material-symbols-outlined tw-text-[14px]">local_gas_station</span> {item.fuel_type}
                  </div>
                  <div className="tw-w-1 tw-h-1 tw-rounded-full tw-bg-m3-outline-variant"></div>
                  <div className="tw-flex tw-items-center tw-gap-0.5">
                    <span className="material-symbols-outlined tw-text-[14px]">person</span> {item.seating_capacity}
                  </div>
                </div>
                
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-m3-on-surface-variant tw-font-semibold tw-text-[10px] tw-uppercase tw-tracking-wide tw-truncate">
                  <span>{item.distance_km !== undefined ? `${item.distance_km.toFixed(1)} km away` : 'Distance unknown'}</span>
                  <div className="tw-w-1 tw-h-1 tw-rounded-full tw-bg-m3-outline-variant"></div>
                  <span className="tw-truncate">{contactName}</span>
                </div>
                
                <div className="tw-mt-auto tw-pt-2 tw-flex tw-items-center tw-gap-2">
                  <a 
                    href={contactNumber ? `tel:${contactNumber}` : '#'} 
                    className={`tw-flex-1 tw-text-center tw-py-2 tw-rounded-full tw-font-semibold tw-text-sm tw-shadow-[0px_10px_20px_rgba(0,91,175,0.2)] tw-transition-opacity hover:tw-opacity-90 ${contactNumber ? 'tw-bg-m3-primary tw-text-m3-on-primary' : 'tw-bg-m3-outline tw-text-m3-on-surface-variant tw-pointer-events-none'}`}
                  >
                    {contactNumber ? meta.callLabel : 'Unavailable'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default CabServiceListPage;
