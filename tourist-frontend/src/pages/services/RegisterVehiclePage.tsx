import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './RegisterVehiclePage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const RegisterVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_category: 'taxi',
    registration_number: '',
    vehicle_type: 'Car',
    manufacturer_model: '',
    fuel_type: 'Petrol',
    seating_capacity: '',
    year_of_manufacture: '',
    owner_name: '',
    owner_contact: '',
    owner_address: '',
    latitude: '',
    longitude: '',
    // Taxi fields
    permit_type: '',
    permit_number: '',
    taxi_license_number: '',
    driver_name: '',
    driver_license: '',
    badge_number: '',
    // Rental fields
    organization_name: '',
    business_type: 'Company',
    contact_person: '',
    service_type: 'Self-drive rental',
    operating_areas: ''
  });

  useEffect(() => {
    // Request location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        () => {
          console.warn('Geolocation denied or failed. Providers must provide location.');
          alert('Please enable location services to complete your registration accurately.');
        }
      );
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        seating_capacity: parseInt(formData.seating_capacity) || 0,
        year_of_manufacture: parseInt(formData.year_of_manufacture) || 0,
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
      };

      const res = await fetch(`${API_BASE_URL}/api/vehicles/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register');
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/service/cabs'), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'register-input';
  const labelClass = 'register-label';

  if (success) {
    return (
      <Screen className="register-page register-page-success">
        <div className="register-success-card">
          <div className="register-success-icon">✅</div>
          <h2 className="register-success-title">Registration Submitted!</h2>
          <p className="register-success-copy">Your application has been sent for admin review. You will be redirected shortly.</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="register-page">
      <header className="register-header">
        <button onClick={() => navigate(-1)} className="register-back-btn" aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="register-title">Register Vehicle</h1>
      </header>

      <main className="register-main">
        <div className="register-card">
          <p className="register-intro-copy">
            Offer your vehicle services to thousands of travelers. Registration requires admin approval.
          </p>

          <form onSubmit={handleSubmit} className="register-form">
            <label className={labelClass}>Service Type</label>
            <div className="register-category-grid">
              {['taxi', 'private', 'rental'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, vehicle_category: cat }))}
                  className={`register-category-btn ${formData.vehicle_category === cat ? 'is-active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="register-section">
              <h3 className="register-section-title">
                <span className="register-step-badge">1</span>
                Core Details
              </h3>

              <div>
                <label className={labelClass}>Category & Make</label>
                <div className="register-inline-row">
                  <select name="vehicle_type" value={formData.vehicle_type} onChange={handleChange} className={`${inputClass} register-input-sm`}>
                    <option>Car</option>
                    <option>Van</option>
                    <option>Bus</option>
                    <option>Auto</option>
                    <option>Scooty</option>
                    <option>Bike</option>
                  </select>
                  <input required name="manufacturer_model" value={formData.manufacturer_model} onChange={handleChange} placeholder="e.g. Maruti Swift" className={`${inputClass} register-input-lg`} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Registration No.</label>
                <input required name="registration_number" value={formData.registration_number} onChange={handleChange} placeholder="e.g. MZ-01-A-1234" className={inputClass} />
              </div>

              <div className="register-grid-three">
                <div>
                  <label className={labelClass}>Fuel</label>
                  <select name="fuel_type" value={formData.fuel_type} onChange={handleChange} className={inputClass}>
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>EV</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Seats</label>
                  <input required type="number" name="seating_capacity" value={formData.seating_capacity} onChange={handleChange} placeholder="4" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Year</label>
                  <input required type="number" name="year_of_manufacture" value={formData.year_of_manufacture} onChange={handleChange} placeholder="2020" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="register-section">
              <h3 className="register-section-title">
                <span className="register-step-badge">2</span>
                Owner Details
              </h3>

              <div>
                <label className={labelClass}>Owner Name</label>
                <input required name="owner_name" value={formData.owner_name} onChange={handleChange} placeholder="Full Name" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Contact Number</label>
                <input required name="owner_contact" value={formData.owner_contact} onChange={handleChange} placeholder="Phone Number" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <textarea required name="owner_address" value={formData.owner_address} onChange={handleChange} placeholder="Full Address" className={`${inputClass} register-textarea`} />
              </div>
            </div>

            {formData.vehicle_category === 'taxi' && (
              <div className="register-section register-section-taxi">
                <h3 className="register-section-title register-section-title-taxi">
                  <span className="register-step-badge register-step-badge-taxi">3</span>
                  Taxi Operating Details
                </h3>

                <div>
                  <label className={labelClass}>Permit Type</label>
                  <select name="permit_type" value={formData.permit_type} onChange={handleChange} className={inputClass}>
                    <option value="">Select Permit</option>
                    <option>City</option>
                    <option>State</option>
                    <option>All India</option>
                  </select>
                </div>

                <div className="register-grid-two">
                  <div>
                    <label className={labelClass}>Permit No.</label>
                    <input name="permit_number" value={formData.permit_number} onChange={handleChange} placeholder="Permit Number" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>License No.</label>
                    <input name="taxi_license_number" value={formData.taxi_license_number} onChange={handleChange} placeholder="Lic Number" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Driver Name</label>
                  <input name="driver_name" value={formData.driver_name} onChange={handleChange} placeholder="Driver Name" className={inputClass} />
                </div>

                <div className="register-grid-two">
                  <div>
                    <label className={labelClass}>Driver Lic</label>
                    <input name="driver_license" value={formData.driver_license} onChange={handleChange} placeholder="DL Number" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Badge No.</label>
                    <input name="badge_number" value={formData.badge_number} onChange={handleChange} placeholder="Badge Number" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {formData.vehicle_category === 'rental' && (
              <div className="register-section register-section-rental">
                <h3 className="register-section-title register-section-title-rental">
                  <span className="register-step-badge register-step-badge-rental">3</span>
                  Rental Provider Details
                </h3>

                <div>
                  <label className={labelClass}>Organization Name</label>
                  <input name="organization_name" value={formData.organization_name} onChange={handleChange} placeholder="Company Name" className={inputClass} />
                </div>

                <div className="register-grid-two">
                  <div>
                    <label className={labelClass}>Biz Type</label>
                    <select name="business_type" value={formData.business_type} onChange={handleChange} className={inputClass}>
                      <option>Company</option>
                      <option>Individual</option>
                      <option>Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Service</label>
                    <select name="service_type" value={formData.service_type} onChange={handleChange} className={inputClass}>
                      <option>Self-drive</option>
                      <option>Chauffeur</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Contact Person</label>
                  <input name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="Contact Person" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Operating Areas</label>
                  <input name="operating_areas" value={formData.operating_areas} onChange={handleChange} placeholder="e.g. Aizawl, Lunglei" className={inputClass} />
                </div>
              </div>
            )}

            <div className="register-submit-wrap">
              <button
                type="submit"
                disabled={loading || !formData.latitude}
                className="register-submit-btn"
              >
                {loading ? 'Submitting...' : 'Register Vehicle'}
                {!loading && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {!formData.latitude && (
                <p className="register-location-warning">
                  Please allow location access to register a vehicle.
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
    </Screen>
  );
};

export default RegisterVehiclePage;
