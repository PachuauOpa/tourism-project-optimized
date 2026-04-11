import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import { IlpLoginForm } from '../../types';
import { loginSponsor } from '../../utils/ilpSponsorApi';

const IlpSponsorLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IlpLoginForm>({
    phoneNumber: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<IlpLoginForm>>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  const updateFormData = (field: keyof IlpLoginForm, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<IlpLoginForm> = {};

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setSubmitError('');
    setIsLoading(true);

    try {
      const result = await loginSponsor({
        phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
        password: formData.password
      });

      localStorage.setItem('ilpSponsorToken', result.token);
      localStorage.setItem('ilpSponsorName', result.sponsor.fullName);
      localStorage.setItem('ilpSponsorMobileNo', result.sponsor.mobileNo);

      // Warm dashboard chunk only after auth succeeds so navigation is snappier.
      await import('./IlpSponsorDashboard');

      navigate('/ilp-sponsor/dashboard');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to login sponsor account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen className="ilp-login-screen">
      <div className="ilp-auth-container">
        <div className="ilp-auth-header">
          <button type="button" className="ilp-back-button" onClick={() => navigate('/ilp')}>
            ← Back to ILP
          </button>
          <div className="ilp-auth-logo">
            <img
              src="/icons/title-mark.svg"
              alt="Mizoram Government"
              className="auth-logo"
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            />
            <div className="auth-title">
              <h1>Sign In</h1>
              <p>Government of Mizoram - Inner Line Permit Portal</p>
            </div>
          </div>
        </div>

        <div className="ilp-auth-card login-card">
          <div className="auth-form-header">
            <h2>Account Login</h2>
            <p>Sign in to access your ILP applications and services</p>
          </div>

          <form className="ilp-auth-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {submitError && <p className="auth-submit-error">{submitError}</p>}

            <div className="form-field">
              <label>Phone Number <span className="required">*</span></label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                placeholder="Phone Number"
                className={errors.phoneNumber ? 'error' : ''}
              />
              {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
            </div>

            <div className="form-field">
              <label>Password <span className="required">*</span></label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  placeholder="Password"
                  className={errors.password ? 'error' : ''}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="login-options">
              <a href="#" className="link forgot-password" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button
                type="submit"
                className={`auth-submit-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Wait...' : 'Login'}
              </button>
            </div>

            <div className="auth-footer">
              <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/ilp-register'); }} className="link">Create Account</a></p>
            </div>
          </form>
        </div>
      </div>
    </Screen>
  );
};

export default IlpSponsorLoginPage;
