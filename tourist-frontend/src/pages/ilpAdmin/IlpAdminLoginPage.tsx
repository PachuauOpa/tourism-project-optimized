import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../utils/ilpAdminApi';

const IlpAdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await adminLogin(username.trim(), password);
      localStorage.setItem('ilpAdminToken', result.token);
      localStorage.setItem('ilpAdminUsername', result.username);

      // Warm dashboard chunk only after auth succeeds so navigation is snappier.
      await import('./IlpAdminDashboardPage');

      navigate('/ilpadmin/dashboard');
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ilp-admin-login-page">
      <div className="ilp-admin-login-card">
        <p className="ilp-admin-chip">ILP Control Room</p>
        <h1>ILP Admin Login</h1>
        <p className="ilp-admin-muted">Access applicant analytics, approvals, and overstay monitoring.</p>

        <form onSubmit={handleSubmit} className="ilp-admin-login-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="ilp-admin-error">{error}</div> : null}

          <button type="submit" className="ilp-admin-primary-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IlpAdminLoginPage;
