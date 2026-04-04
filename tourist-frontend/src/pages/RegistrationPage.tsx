import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';
import HeaderLogo from '../components/shared/HeaderLogo';

interface RegistrationForm {
  name: string;
  email: string;
  mobile: string;
  purpose: string;
}

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationForm>({ name: '', email: '', mobile: '', purpose: '' });

  const canContinue = form.name && form.email && form.mobile && form.purpose;

  return (
    <Screen className="registration-screen">
      <HeaderLogo />
      <div className="registration-card">
        <h2>Traveler Registration</h2>
        <p>Register once for personalized itineraries, SOS support and local travel updates.</p>

        <label>
          Full Name
          <input
            value={form.name}
            onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
            placeholder="Enter your full name"
          />
        </label>
        <label>
          Email Address
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))}
            placeholder="name@email.com"
          />
        </label>
        <label>
          Mobile Number
          <input
            value={form.mobile}
            onChange={(event) => setForm((old) => ({ ...old, mobile: event.target.value }))}
            placeholder="+91 xxxxxxxxxx"
          />
        </label>
        <label>
          Purpose of Visit
          <select value={form.purpose} onChange={(event) => setForm((old) => ({ ...old, purpose: event.target.value }))}>
            <option value="">Select purpose</option>
            <option value="leisure">Leisure</option>
            <option value="adventure">Adventure</option>
            <option value="business">Business</option>
            <option value="family">Family Visit</option>
          </select>
        </label>

        <button type="button" className="primary-btn" disabled={!canContinue} onClick={() => navigate('/home')}>
          Continue To Dashboard
        </button>
      </div>
    </Screen>
  );
};

export default RegistrationPage;
