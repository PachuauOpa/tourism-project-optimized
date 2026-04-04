import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { FeePaymentForm } from '../../types';

const FeePaymentDownloadPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FeePaymentForm>({ referenceNumber: '' });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!/^\d{12}$/.test(formData.referenceNumber.trim())) {
      alert('Reference number must be 12 digits.');
      return;
    }

    navigate(`/verify-document/${formData.referenceNumber.trim()}`);
  };

  return (
    <Screen className="ilp-application-screen">
      <div className="ilp-application-header">
        <button type="button" className="ilp-back-button" onClick={() => navigate('/ilp-application-types')}>
          ← Back
        </button>
        <h1 className="ilp-form-title">Fee Payment & Download Pass</h1>
      </div>

      <div className="ilp-form-container">
        <form onSubmit={handleSubmit}>
          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">Search Application</h3>
            <div className="form-grid" style={{ display: 'block' }}>
              <div className="ilp-form-field full-width" style={{ marginBottom: '24px' }}>
                <label>Reference Number (for Temporary Pass) <span className="required">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ referenceNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  required
                />
              </div>
            </div>
            <div className="form-navigation">
              <button type="submit" className="primary-btn" style={{ width: 'auto', padding: '12px 32px' }}>Search</button>
            </div>
          </AnimatedSection>
        </form>
      </div>
    </Screen>
  );
};

export default FeePaymentDownloadPage;
