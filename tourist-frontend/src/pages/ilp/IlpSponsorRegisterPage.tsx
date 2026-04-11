import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import { IlpRegistrationForm } from '../../types';
import { registerSponsor } from '../../utils/ilpSponsorApi';

const IlpSponsorRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IlpRegistrationForm>({
    fullName: '',
    email: '',
    mobileNo: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<IlpRegistrationForm>>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const updateFormData = (field: keyof IlpRegistrationForm, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<IlpRegistrationForm> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.mobileNo.trim()) newErrors.mobileNo = 'Mobile number is required';
    else if (!/^\d{10}$/.test(formData.mobileNo.replace(/\D/g, ''))) newErrors.mobileNo = 'Invalid mobile number';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitError('');

    try {
      await registerSponsor({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        mobileNo: formData.mobileNo.replace(/\D/g, ''),
        password: formData.password
      });

      setShowSuccessModal(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to register sponsor account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen className="ilp-register-screen">
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
              <h1>Create Your Account</h1>
              <p>Government of Mizoram - Inner Line Permit Portal</p>
            </div>
          </div>
        </div>

        <div className="ilp-auth-card">
          <div className="auth-form-header">
            <h2>Sponsor Registration</h2>
            <p>Create an account to apply for Inner Line Permits</p>
          </div>

          <form className="ilp-auth-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

            {submitError && <p className="auth-submit-error">{submitError}</p>}

            <div className="form-field">
              <label>Full Name of Sponsor <span className="required">*</span></label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
                placeholder="(As Official Record (EPIC or Birth Certificate))"
                className={errors.fullName ? 'error' : ''}
              />
              {errors.fullName && <span className="error-text">{errors.fullName}</span>}
            </div>

            <div className="form-field">
              <label>Valid e-Mail <span className="required">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="Personal e-mail"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-field">
              <label>Mobile Number of Sponsor <span className="required">*</span></label>
              <input
                type="tel"
                value={formData.mobileNo}
                onChange={(e) => updateFormData('mobileNo', e.target.value)}
                placeholder="10 Digit Mobile Number"
                className={errors.mobileNo ? 'error' : ''}
              />
              {errors.mobileNo && <span className="error-text">{errors.mobileNo}</span>}
            </div>

            <div className="form-field">
              <label>Password <span className="required">*</span></label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  placeholder="Minimum 6 Characters"
                  className={errors.password ? 'error' : ''}
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

            <div className="form-field">
              <label>Password Confirmation <span className="required">*</span></label>
              <div className="password-input">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  placeholder="Minimum 6 Characters"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button type="submit" className={`auth-submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            <div className="auth-footer">
              <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/ilp-login'); }} className="link">Sign In</a></p>
            </div>
          </form>
        </div>
      </div>

      {showSuccessModal && (
        <div className="ilp-auth-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <section className="ilp-auth-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Registration Successful</h3>
            <p>Your sponsor account has been created.</p>
            <button
              type="button"
              className="ilp-auth-modal-btn"
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/ilp-login');
              }}
            >
              OK
            </button>
          </section>
        </div>
      )}
    </Screen>
  );
};

export default IlpSponsorRegisterPage;
