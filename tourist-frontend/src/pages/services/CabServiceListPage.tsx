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
    <Screen className="cab-list-page">
      <header className="cab-list-header">
        <button type="button" onClick={() => navigate('/service/cabs')} className="cab-list-back" aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="cab-list-title">{meta.title}</h1>
          <p className="cab-list-subtitle">{meta.subtitle}</p>
          <p className="cab-list-count">{filteredVehicles.length} available {meta.countLabel} currently in service</p>
        </div>
      </header>

      <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <button 
          type="button" 
          onClick={() => setShowFilters(prev => !prev)}
          style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
        >
          {showFilters ? 'Hide Filters & Sorting' : 'Show Filters & Sorting'}
        </button>
      </div>

      {showFilters && (
      <section className="cab-list-filter-panel" data-purpose="sort-filter-panel">
        <div className="cab-list-filter-grid">
          <label className="cab-list-control">
            Search
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by type, model, owner, driver"
            />
          </label>

          <label className="cab-list-control">
            Sort
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
              <option value="distance-asc">Nearest first</option>
              <option value="distance-desc">Farthest first</option>
              <option value="seats-desc">Higher seats first</option>
              <option value="year-desc">Newer vehicles first</option>
              <option value="name-asc">Driver/Owner A-Z</option>
            </select>
          </label>

          <label className="cab-list-control">
            Vehicle Type
            <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
              <option value="all">All</option>
              {vehicleTypeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="cab-list-control">
            Fuel Type
            <select value={fuelType} onChange={(event) => setFuelType(event.target.value)}>
              <option value="all">All</option>
              {fuelTypeOptions.map((fuel) => (
                <option key={fuel} value={fuel}>{fuel}</option>
              ))}
            </select>
          </label>

          <label className="cab-list-control">
            Min Seats
            <input
              type="number"
              min={1}
              value={minSeats}
              onChange={(event) => setMinSeats(event.target.value)}
              placeholder="Any"
            />
          </label>

          <label className="cab-list-control">
            Min Year
            <input
              type="number"
              min={1980}
              value={minYear}
              onChange={(event) => setMinYear(event.target.value)}
              placeholder="Any"
            />
          </label>

          <label className="cab-list-control">
            Max Distance (km)
            <input
              type="number"
              min={1}
              value={maxDistance}
              onChange={(event) => setMaxDistance(event.target.value)}
              placeholder="Any"
            />
          </label>

          {serviceKey === 'taxi' && (
            <label className="cab-list-control">
              Permit Type
              <select value={permitType} onChange={(event) => setPermitType(event.target.value)}>
                <option value="all">All</option>
                {permitTypeOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          )}

          {serviceKey === 'rental' && (
            <label className="cab-list-control">
              Rental Type
              <select value={rentalServiceType} onChange={(event) => setRentalServiceType(event.target.value)}>
                <option value="all">All</option>
                {rentalServiceOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="cab-list-filter-footer">
          <p>{filteredVehicles.length} of {vehicles.length} registered listings match current filters</p>
          <button type="button" onClick={resetFilters}>Reset Filters</button>
        </div>
      </section>
      )}

      <main className="cab-list-results">
        {loading && <p className="cab-list-state">Loading registered vehicles...</p>}

        {!loading && error && <p className="cab-list-state cab-list-state-error">{error}</p>}

        {!loading && !error && filteredVehicles.length === 0 && (
          <p className="cab-list-state">{meta.emptyLabel}</p>
        )}

        {!loading && !error && filteredVehicles.map((item) => {
          const contactNumber = sanitizePhoneNumber(item.owner_contact || '');
          const contactName = serviceKey === 'rental'
            ? (item.owner_name || item.organization_name || 'Owner')
            : (item.driver_name || item.owner_name);

          return (
            <article key={item.id} className="cab-list-card">
              {item.cover_image && (
                <img
                  src={item.cover_image}
                  alt={`${item.vehicle_type} cover`}
                  className="cab-list-image"
                  loading="lazy"
                />
              )}

              <div className="cab-list-card-body">
                <div className="cab-list-card-head">
                  <h2>{item.vehicle_type} - {item.manufacturer_model}</h2>
                  <span>{item.registration_number}</span>
                </div>

                <div className="cab-list-card-grid">
                  <p><strong>Fuel:</strong> {item.fuel_type}</p>
                  <p><strong>Seats:</strong> {item.seating_capacity}</p>
                  <p><strong>Year:</strong> {item.year_of_manufacture}</p>
                  <p><strong>Owner:</strong> {item.owner_name}</p>
                </div>

                {serviceKey === 'taxi' && (
                  <div className="cab-list-extra">
                    <p><strong>Driver:</strong> {item.driver_name || item.owner_name}</p>
                    <p><strong>Permit:</strong> {item.permit_type || 'Not specified'}</p>
                  </div>
                )}

                {serviceKey === 'rental' && (
                  <div className="cab-list-extra">
                    <p><strong>Organization:</strong> {item.organization_name || 'Individual owner'}</p>
                    <p><strong>Service:</strong> {item.service_type || 'Rental service'}</p>
                    <p><strong>Operating Areas:</strong> {item.operating_areas || 'Not specified'}</p>
                  </div>
                )}

                <div className="cab-list-card-footer">
                  <div>
                    <p className="cab-list-contact-label">Contact: {contactName}</p>
                    <p className="cab-list-distance-label">
                      {item.distance_km !== undefined ? `${item.distance_km.toFixed(1)} km away` : 'Distance unavailable'}
                    </p>
                  </div>

                  {contactNumber ? (
                    <a href={`tel:${contactNumber}`} className="cab-list-call-btn">
                      {meta.callLabel}
                    </a>
                  ) : (
                    <button type="button" className="cab-list-call-btn is-disabled" disabled>
                      No Contact
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </main>
    </Screen>
  );
};

export default CabServiceListPage;
