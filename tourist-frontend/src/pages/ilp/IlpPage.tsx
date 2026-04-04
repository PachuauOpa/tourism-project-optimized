import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { HeaderLogo } from '../../components/shared/HeaderLogo';
import MandatoryIcon from '../../components/MandatoryIcon';
import ArrowUpRightIcon from '../../components/ArrowUpRightIcon';

const IlpPage: React.FC = () => {
  const navigate = useNavigate();
  const [showIlpGuide, setShowIlpGuide] = useState(false);

  return (
    <Screen className="ilp-screen">
      <AnimatedSection delay={0.03} className="ilp-top-section">
        <HeaderLogo />

        <button
          type="button"
          className="ilp-mandatory-badge"
          onClick={() => setShowIlpGuide(true)}
          aria-label="Open ILP information"
        >
          <MandatoryIcon size={20} />
          <span>Mandatory</span>
        </button>

        <div className="ilp-main-card">
          <h2 className="ilp-title">Inner Line Permit (ILP)</h2>
          <p className="ilp-subtitle">(For Non-Indigenous Persons of Mizoram)</p>

          <button
            type="button"
            className="ilp-apply-main-btn"
            onClick={() => navigate('/ilp-application-types')}
          >
            Apply ILP
            <ArrowUpRightIcon size={16} />
          </button>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="ilp-info-section">
        <p className="ilp-info-text">
          Sponsors may Register New Account or Login to Apply for Regular ILP
        </p>

        <div className="ilp-action-buttons">
          <button
            type="button"
            className="ilp-action-btn register"
            onClick={() => navigate('/ilp-register')}
          >
            Register Account
          </button>
          <button
            type="button"
            className="ilp-action-btn login"
            onClick={() => navigate('/ilp-login')}
          >
            Account Login
          </button>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.15} className="ilp-back-section">
        <button
          type="button"
          className="ilp-back-btn"
          onClick={() => navigate('/home')}
        >
          go back
        </button>
      </AnimatedSection>

      <footer className="screen-footer">
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" />
      </footer>

      {showIlpGuide && (
        <div className="ilp-guide-overlay" onClick={() => setShowIlpGuide(false)}>
          <section
            className="ilp-guide-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ilp-guide-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ilp-guide-header">
              <h3 id="ilp-guide-title">ILP Guide</h3>
              <button type="button" className="ilp-guide-close" onClick={() => setShowIlpGuide(false)}>
                Close
              </button>
            </header>

            <div className="ilp-guide-body">
              <section className="ilp-guide-section">
                <h4>What is ILP ?</h4>
                <p>
                  Inner Line Permit (ILP) is an official travel permit required for entering protected areas in
                  Mizoram for a limited period.
                </p>
              </section>

              <section className="ilp-guide-section">
                <h4>Who needs ILP ?</h4>
                <p>
                  ILP is required for non-indigenous persons visiting Mizoram, including domestic and international
                  visitors, depending on visit purpose and duration.
                </p>
              </section>

              <section className="ilp-guide-section">
                <h4>Process of applying online ILP</h4>
                <ol>
                  <li>Select the correct ILP type.</li>
                  <li>Fill applicant details and travel information.</li>
                  <li>Upload required documents.</li>
                  <li>Submit the application and note the reference number.</li>
                  <li>Track status using the reference dashboard.</li>
                </ol>
              </section>

              <section className="ilp-guide-section">
                <h4>ILP Types and Regular ILP Processing</h4>
                <ul>
                  <li><strong>Temporary ILP:</strong> Short-term permit for brief visits.</li>
                  <li><strong>Temporary Stay Permit:</strong> For longer temporary stays under approved conditions.</li>
                  <li><strong>ILP Exemption:</strong> For cases eligible under exemption criteria with supporting proof.</li>
                  <li><strong>Regular ILP:</strong> Processed through sponsor-based account registration and login workflow.</li>
                </ul>
              </section>
            </div>
          </section>
        </div>
      )}
    </Screen>
  );
};

export default IlpPage;
