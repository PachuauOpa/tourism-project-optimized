import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CarRentalIcon from '@mui/icons-material/CarRental';
import { Screen } from '../../components/shared/Screen';
import './TransportFeaturesPage.css';

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

type Tab = 'routes' | 'fares' | 'rentals';

const TransportFeaturesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('routes');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fare calculator state
  const [fareType, setFareType] = useState('sumo');
  const [fareDistance, setFareDistance] = useState('');
  const [farePassengers, setFarePassengers] = useState('1');
  const [calculatedFare, setCalculatedFare] = useState<number | null>(null);

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

  const handleCalculateFare = () => {
    const dist = parseFloat(fareDistance);
    const pass = parseInt(farePassengers, 10);
    if (!isNaN(dist) && !isNaN(pass)) {
      let baseRate = 1.5; // per km per passenger
      if (fareType === 'taxi') baseRate = 12; // per km total
      else if (fareType === 'sumo') baseRate = 2; // per km per passenger
      
      let total = dist * baseRate;
      if (fareType !== 'taxi') total *= pass;
      setCalculatedFare(Math.round(total));
    }
  };

  const taxiVehicles = vehicles.filter(v => v.vehicle_category === 'taxi');
  const rentalVehicles = vehicles.filter(v => v.vehicle_category === 'rental');

  return (
    <Screen className="transport-page">
      <div className="transport-header">
        <button className="transport-back" onClick={() => navigate('/home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1>Transport & Cabs</h1>
      </div>

      <div className="transport-tabs-scroll">
        <div className="transport-tabs">
          <button 
            className={`transport-tab ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            Routes
          </button>
          <button 
            className={`transport-tab ${activeTab === 'fares' ? 'active' : ''}`}
            onClick={() => setActiveTab('fares')}
          >
            Fare Rates
          </button>
          <button 
            className={`transport-tab ${activeTab === 'rentals' ? 'active' : ''}`}
            onClick={() => setActiveTab('rentals')}
          >
            Car Rentals
          </button>
        </div>
      </div>

      <main className="transport-content">
        {/* TAB: ROUTES */}
        {activeTab === 'routes' && (
          <div className="tab-pane-routes">
            <div className="routes-search-box">
              <input type="text" placeholder="Search destinations (e.g. Aizawl to Champhai)" />
              <button className="routes-filter-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </button>
            </div>
            
            <div className="routes-filters">
              <span className="route-pill active">All</span>
              <span className="route-pill">Sumo</span>
              <span className="route-pill">State Bus</span>
              <span className="route-pill">Shared Cab</span>
            </div>

            <div className="route-cards">
              {/* Route Card 1 */}
              <div className="route-card">
                <div className="route-head">
                  <h3 className="route-title">Aizawl → Champhai</h3>
                  <span className="route-type"><DirectionsCarIcon sx={{ fontSize: 16 }} /> Sumo</span>
                </div>
                
                <div className="route-metrics">
                  <div className="metric">
                    <span className="metric-lbl">Cost</span>
                    <span className="metric-val">₹400</span>
                  </div>
                  <div className="metric">
                    <span className="metric-lbl">Duration</span>
                    <span className="metric-val">4h 30m</span>
                  </div>
                  <div className="metric">
                    <span className="metric-lbl">Distance</span>
                    <span className="metric-val">192 km</span>
                  </div>
                </div>

                <div className="route-slots">
                  <div className="slot-pill slot-available">05:30 (4 left)</div>
                  <div className="slot-pill slot-available">07:00 (2 left)</div>
                  <div className="slot-pill slot-full">11:00 (Full)</div>
                </div>

                <div className="route-alert">Via Khawzawl. Scenic route.</div>

                <div className="route-actions">
                  <button className="route-btn-call">Call</button>
                  <button className="route-btn-book">Book Now</button>
                </div>
              </div>

              {/* Route Card 2 */}
              <div className="route-card">
                <div className="route-head">
                  <h3 className="route-title">Aizawl → Lunglei</h3>
                  <span className="route-type"><DirectionsCarIcon sx={{ fontSize: 16 }} /> Sumo</span>
                </div>
                
                <div className="route-metrics">
                  <div className="metric">
                    <span className="metric-lbl">Cost</span>
                    <span className="metric-val">₹350</span>
                  </div>
                  <div className="metric">
                    <span className="metric-lbl">Duration</span>
                    <span className="metric-val">3h 45m</span>
                  </div>
                  <div className="metric">
                    <span className="metric-lbl">Distance</span>
                    <span className="metric-val">165 km</span>
                  </div>
                </div>

                <div className="route-slots">
                  <div className="slot-pill slot-available">06:00 (6 left)</div>
                  <div className="slot-pill slot-available">08:00 (1 left)</div>
                </div>

                <div className="route-actions">
                  <button className="route-btn-call">Call</button>
                  <button className="route-btn-book">Book Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FARES */}
        {activeTab === 'fares' && (
          <div className="tab-pane-fares">
            <div className="fare-calculator">
              <h3>Fare Estimator</h3>
              
              <div className="fare-form">
                <div className="fare-field">
                  <label>Vehicle Type</label>
                  <select value={fareType} onChange={(e) => setFareType(e.target.value)}>
                    <option value="sumo">Shared Sumo</option>
                    <option value="bus_ord">MST Bus (Ordinary)</option>
                    <option value="taxi">City Taxi</option>
                  </select>
                </div>

                <div className="fare-field-row">
                  <div className="fare-field">
                    <label>Distance (km)</label>
                    <input 
                      type="number" 
                      placeholder="E.g. 50" 
                      value={fareDistance}
                      onChange={(e) => setFareDistance(e.target.value)}
                    />
                  </div>
                  <div className="fare-field">
                    <label>Passengers</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={farePassengers}
                      onChange={(e) => setFarePassengers(e.target.value)}
                    />
                  </div>
                </div>

                <button className="fare-calc-btn" onClick={handleCalculateFare}>Calculate Fare</button>
              </div>

              {calculatedFare !== null && (
                <div className="fare-result">
                  <span className="fare-result-lbl">Estimated Total</span>
                  <span className="fare-result-val">₹{calculatedFare}</span>
                </div>
              )}
            </div>

            <div className="fare-guidelines">
              <h3>Official Tariffs</h3>
              <div className="tariff-grid">
                <div className="tariff-item">
                  <strong>MST Bus (Ordinary)</strong>
                  <span>₹1.5 / km per pax</span>
                </div>
                <div className="tariff-item">
                  <strong>MST Bus (Express)</strong>
                  <span>₹2.0 / km per pax</span>
                </div>
                <div className="tariff-item">
                  <strong>Shared Sumo</strong>
                  <span>₹2.0 - ₹2.5 / km per pax</span>
                </div>
                <div className="tariff-item">
                  <strong>City Taxi</strong>
                  <span>₹12 - ₹15 / km (Total)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: RENTALS */}
        {activeTab === 'rentals' && (
          <div className="tab-pane-rentals">
            <div className="rental-rates-card">
              <h3>Official Private Hire Rates</h3>
              <div className="rental-rate-list">
                <div className="rental-rate-item">
                  <div className="rate-item-left">
                    <strong>Sumo / Bolero (Standard)</strong>
                  </div>
                  <div className="rate-item-right">
                    <span>Min: ₹1500</span>
                    <span>₹25/km</span>
                  </div>
                </div>
                <div className="rental-rate-item">
                  <div className="rate-item-left">
                    <strong>Mid-range SUV (Scorpio)</strong>
                  </div>
                  <div className="rate-item-right">
                    <span>Min: ₹1800</span>
                    <span>₹30/km</span>
                  </div>
                </div>
                <div className="rental-rate-item">
                  <div className="rate-item-left">
                    <strong>Premium SUV (Innova)</strong>
                  </div>
                  <div className="rate-item-right">
                    <span>Min: ₹2000</span>
                    <span>₹35/km</span>
                  </div>
                </div>
                <div className="rental-rate-item">
                  <div className="rate-item-left">
                    <strong>Luxury SUV (Fortuner)</strong>
                  </div>
                  <div className="rate-item-right">
                    <span>Min: ₹3500</span>
                    <span>₹45/km</span>
                  </div>
                </div>
              </div>
              <p className="rental-note">* Waiting charges apply per hour after initial limit.</p>
            </div>

            <div className="rental-operators">
              <h3>Registered Operators</h3>
              
              {loading ? (
                <p>Loading operators...</p>
              ) : rentalVehicles.length > 0 ? (
                rentalVehicles.map(v => (
                  <div key={v.id} className="operator-card">
                    <div className="operator-info">
                      <h4>{v.organization_name || v.owner_name}</h4>
                      <p>{v.vehicle_type} - {v.manufacturer_model}</p>
                    </div>
                    <button className="operator-call-btn">Call</button>
                  </div>
                ))
              ) : (
                <>
                  <div className="operator-card">
                    <div className="operator-info">
                      <h4>TBC Car Rental - Khatla</h4>
                      <p>SUVs, Sedans, 2-Wheelers</p>
                    </div>
                    <button className="operator-call-btn">Call</button>
                  </div>
                  <div className="operator-card">
                    <div className="operator-info">
                      <h4>Velox Rent a Car - Chanmari</h4>
                      <p>Premium SUVs, Scorpios</p>
                    </div>
                    <button className="operator-call-btn">Call</button>
                  </div>
                  <div className="operator-card">
                    <div className="operator-info">
                      <h4>City Car Bazar - Upper Republic</h4>
                      <p>Standard Cars, Taxis</p>
                    </div>
                    <button className="operator-call-btn">Call</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </Screen>
  );
};

export default TransportFeaturesPage;
