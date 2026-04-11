import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { HeaderLogo } from '../../components/shared/HeaderLogo';
import BottomNav from '../../components/shared/BottomNav';
import ArrowUpRightIcon from '../../components/ArrowUpRightIcon';

const IlpSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="ilp-screen home-screen">
      <AnimatedSection delay={0.03} className="ilp-top-section">
        <HeaderLogo />

        <button
          type="button"
          className="back-button"
          onClick={() => navigate('/ilp')}
        >
          ← Back to ILP
        </button>

        <div className="ilp-header">
          <h1 className="ilp-title">Select Application Type</h1>
          <p className="ilp-description">
            Choose the type of permit you want to apply for to enter Mizoram
          </p>
        </div>

        <div className="ilp-options-grid">
          <div className="ilp-option-card">
            <h3 className="ilp-option-title">Temporary ILP</h3>
            <p className="ilp-option-description">
              For temporary visits to Mizoram for tourism, business, or other purposes.
            </p>
            <button
              type="button"
              className="ilp-apply-main-btn"
              onClick={() => navigate('/ilp-application')}
            >
              Apply Now
              <ArrowUpRightIcon size={16} />
            </button>
          </div>

          <div className="ilp-option-card">
            <h3 className="ilp-option-title">Temporary Stay Permit</h3>
            <p className="ilp-option-description">
              For extended stays in Mizoram for work, study, or other long-term purposes.
            </p>
            <button
              type="button"
              className="ilp-apply-main-btn"
              onClick={() => navigate('/temporary-stay-permit')}
            >
              Apply Now
              <ArrowUpRightIcon size={16} />
            </button>
          </div>

          <div className="ilp-option-card">
            <h3 className="ilp-option-title">ILP Exemption</h3>
            <p className="ilp-option-description">
              Find out if you qualify for ILP exemption or verify your exemption status.
            </p>
            <button
              type="button"
              className="ilp-apply-main-btn"
              onClick={() => navigate('/ilp-exemption')}
            >
              Check Now
              <ArrowUpRightIcon size={16} />
            </button>
          </div>

          <div className="ilp-option-card">
            <h3 className="ilp-option-title">Fee Payment & Download</h3>
            <p className="ilp-option-description">
              Pay fees and download your approved permit if you have already applied.
            </p>
            <button
              type="button"
              className="ilp-apply-main-btn"
              onClick={() => navigate('/fee-payment-download')}
            >
              Pay & Download
              <ArrowUpRightIcon size={16} />
            </button>
          </div>
        </div>
      </AnimatedSection>

      <footer className="screen-footer">
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" width="121" height="32" loading="lazy" decoding="async" />
      </footer>

      <BottomNav />
    </Screen>
  );
};

export default IlpSelectionPage;
