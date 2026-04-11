import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';

const TYPE_LABEL_MAP: Record<string, string> = {
  temporary_ilp: 'Temporary ILP',
  temporary_stay_permit: 'Temporary Stay Permit',
  ilp_exemption: 'ILP Exemption'
};

const ApplicationReferencePage: React.FC = () => {
  const navigate = useNavigate();
  const { applicationType, referenceNumber } = useParams();

  if (!referenceNumber || !/^\d{12}$/.test(referenceNumber)) {
    return <Navigate to="/ilp-application-types" replace />;
  }

  return (
    <Screen className="ilp-application-screen">
      <div className="ilp-application-header">
        <button type="button" className="ilp-back-button" onClick={() => navigate('/ilp-application-types')}>
          ← Back
        </button>
        <h1 className="ilp-form-title">Application Submitted</h1>
      </div>

      <div className="ilp-form-container">
        <AnimatedSection className="ilp-form-step ilp-reference-step">
          <h3 className="form-step-title">Reference Number Generated</h3>
          <p className="ilp-reference-type">{TYPE_LABEL_MAP[applicationType || ''] || 'ILP Application'}</p>
          <div className="ilp-reference-number">{referenceNumber}</div>
          <p className="ilp-reference-note">
            Keep this 12-digit reference number to verify status, download permit documents, and check stay validity.
          </p>
          <div className="form-navigation">
            <button
              type="button"
              className="primary-btn"
              style={{ width: 'auto', padding: '12px 32px' }}
              onClick={() => navigate('/fee-payment-download')}
            >
              Verify Document
            </button>
          </div>
        </AnimatedSection>
      </div>
    </Screen>
  );
};

export default ApplicationReferencePage;
