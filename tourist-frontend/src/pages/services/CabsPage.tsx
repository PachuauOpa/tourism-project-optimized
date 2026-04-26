import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CarRentalIcon from '@mui/icons-material/CarRental';
import { Screen } from '../../components/shared/Screen';
import './CabsPage.css';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CabsPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const theme = {
    bgSoftGreen: 'rgba(46, 146, 241, 0.12)',
    accentGreen: '#2E92F1',
    bgSoftGold: 'rgba(48, 149, 236, 0.12)',
    accentGold: '#3095EC',
    bgSoftBlue: 'rgba(46, 127, 240, 0.12)',
    accentBlue: '#2E7FF0',
  };

  const fetchVehicles = useCallback(async (lat?: number, lng?: number) => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/vehicles`;
      if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          fetchVehicles(loc.lat, loc.lng);
        },
        () => {
          fetchVehicles();
        }
      );
    } else {
      fetchVehicles();
    }
  }, [fetchVehicles]);

  const taxiVehicles = vehicles.filter(v => v.vehicle_category === 'taxi');
  const privateVehicles = vehicles.filter(v => v.vehicle_category === 'private');
  const rentalVehicles = vehicles.filter(v => v.vehicle_category === 'rental');
  const formatVendors = (count: number) => (count > 0 ? `${count}+ Vendors` : '0 Vendors');

  return (
    <Screen className="cab-page">
      <div className="cab-top-actions">
        <div className="cab-top-actions-row">
          <button onClick={() => navigate('/home')} className="cab-icon-button" aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="cab-icon-button" aria-label="Toggle menu">
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </div>

      <header className="cab-header" data-purpose="page-header">
        <h1 className="cab-header-title">Our Services</h1>
        <p className="cab-header-subtitle">Choose the right cab service for your journey</p>
        <p className="cab-location-note">
          {userLocation ? 'Showing options near your current location' : 'Enable location for nearest cab options'}
        </p>
      </header>

      {menuOpen && (
        <div className="cab-menu-popover">
          <button onClick={() => { setMenuOpen(false); navigate('/service/register-vehicle'); }} className="cab-menu-action">
            Register your vehicle
          </button>
        </div>
      )}

      {menuOpen && <div className="cab-menu-overlay" onClick={() => setMenuOpen(false)} />}

      <main className="cab-services-list" data-purpose="services-list">
        <article className="cab-service-card">
          <div className="cab-service-head">
            <div className="cab-service-title-wrap">
              <div className="cab-service-icon" style={{ backgroundColor: theme.bgSoftGreen }}><LocalTaxiIcon style={{ color: theme.accentGreen }} /></div>
              <h2 className="cab-service-title" style={{ color: theme.accentGreen }}>Taxi Services</h2>
            </div>
          </div>
          <div className="cab-tag-row">
            <span className="cab-tag">City Taxi</span>
            <span className="cab-tag">Cab Service</span>
          </div>
          <div className="cab-stats-grid">
            <div>
              <p className="cab-stat-label">Network</p>
              <p className="cab-stat-value">{formatVendors(taxiVehicles.length)}</p>
            </div>
            <div>
              <p className="cab-stat-label">Rating</p>
              <p className="cab-stat-value">4.6/5 <span className="cab-star">★</span></p>
            </div>
            <div className="cab-stat-full">
              <p className="cab-stat-label">Starts from</p>
              <p className="cab-start-price" style={{ color: theme.accentGreen }}>₹12/km</p>
            </div>
          </div>
          {loading ? (
            <div className="cab-loading-text">Loading nearby taxis...</div>
          ) : taxiVehicles.length > 0 ? (
            <div className="cab-nearby-list">
              <h3 className="cab-nearby-title">Available Nearby</h3>
              {taxiVehicles.slice(0, 3).map(v => (
                <div key={v.id} className="cab-nearby-item">
                  <div>
                    <p className="cab-nearby-vehicle">{v.vehicle_type} - {v.manufacturer_model}</p>
                    <p className="cab-nearby-owner">{v.driver_name || v.owner_name}</p>
                  </div>
                  {v.distance_km !== undefined && <span className="cab-distance-pill">{v.distance_km.toFixed(1)} km</span>}
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="cab-cta cab-cta-button"
            style={{ backgroundColor: theme.accentGreen }}
            onClick={() => navigate('/service/cabs/taxis')}
          >
            Explore Taxis →
          </button>
        </article>

        <article className="cab-service-card">
          <div className="cab-service-head">
            <div className="cab-service-title-wrap">
              <div className="cab-service-icon" style={{ backgroundColor: theme.bgSoftGold }}><DirectionsCarIcon style={{ color: theme.accentGold }} /></div>
              <h2 className="cab-service-title" style={{ color: theme.accentGold }}>Private Service</h2>
            </div>
          </div>
          <div className="cab-tag-row">
            <span className="cab-tag">4-Wheeler Sedan</span>
            <span className="cab-tag">4-Wheeler SUV</span>
            <span className="cab-tag">Tempo Traveller</span>
            <span className="cab-tag">Premium Cars</span>
          </div>
          <div className="cab-stats-grid">
            <div>
              <p className="cab-stat-label">Network</p>
              <p className="cab-stat-value">{formatVendors(privateVehicles.length)}</p>
            </div>
            <div>
              <p className="cab-stat-label">Rating</p>
              <p className="cab-stat-value">4.7/5 <span className="cab-star">★</span></p>
            </div>
            <div className="cab-stat-full">
              <p className="cab-stat-label">Starts from</p>
              <p className="cab-start-price" style={{ color: theme.accentGold }}>₹18/km</p>
            </div>
          </div>
          {loading ? (
            <div className="cab-loading-text">Loading nearby private cars...</div>
          ) : privateVehicles.length > 0 ? (
            <div className="cab-nearby-list">
              <h3 className="cab-nearby-title">Available Nearby</h3>
              {privateVehicles.slice(0, 3).map(v => (
                <div key={v.id} className="cab-nearby-item">
                  <div>
                    <p className="cab-nearby-vehicle">{v.vehicle_type} - {v.manufacturer_model}</p>
                    <p className="cab-nearby-owner">Seats: {v.seating_capacity}</p>
                  </div>
                  {v.distance_km !== undefined && <span className="cab-distance-pill">{v.distance_km.toFixed(1)} km</span>}
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="cab-cta cab-cta-button"
            style={{ backgroundColor: theme.accentGold }}
            onClick={() => navigate('/service/cabs/private-services')}
          >
            Explore Private Services →
          </button>
        </article>

        <article className="cab-service-card">
          <div className="cab-service-head">
            <div className="cab-service-title-wrap">
              <div className="cab-service-icon" style={{ backgroundColor: theme.bgSoftBlue }}><CarRentalIcon style={{ color: theme.accentBlue }} /></div>
              <h2 className="cab-service-title" style={{ color: theme.accentBlue }}>Rental Vehicles</h2>
            </div>
          </div>
          <div className="cab-tag-row">
            <span className="cab-tag">2-Wheeler</span>
            <span className="cab-tag">Scooter</span>
            <span className="cab-tag">Bike</span>
          </div>
          <div className="cab-stats-grid">
            <div>
              <p className="cab-stat-label">Inventory</p>
              <p className="cab-stat-value">{formatVendors(rentalVehicles.length)}</p>
            </div>
            <div>
              <p className="cab-stat-label">Rating</p>
              <p className="cab-stat-value">4.4/5 <span className="cab-star">★</span></p>
            </div>
            <div className="cab-stat-full">
              <p className="cab-stat-label">Starts from</p>
              <p className="cab-start-price" style={{ color: theme.accentBlue }}>₹300/day</p>
            </div>
          </div>
          {loading ? (
            <div className="cab-loading-text">Loading nearby rentals...</div>
          ) : rentalVehicles.length > 0 ? (
            <div className="cab-nearby-list">
              <h3 className="cab-nearby-title">Available Nearby</h3>
              {rentalVehicles.slice(0, 3).map(v => (
                <div key={v.id} className="cab-nearby-item">
                  <div>
                    <p className="cab-nearby-vehicle">{v.vehicle_type} - {v.manufacturer_model}</p>
                    <p className="cab-nearby-owner">{v.organization_name || v.owner_name}</p>
                  </div>
                  {v.distance_km !== undefined && <span className="cab-distance-pill">{v.distance_km.toFixed(1)} km</span>}
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="cab-cta cab-cta-button"
            style={{ backgroundColor: theme.accentBlue }}
            onClick={() => navigate('/service/cabs/rentals')}
          >
            Explore Rentals →
          </button>
        </article>
      </main>
    </Screen>
  );
};

export default CabsPage;

