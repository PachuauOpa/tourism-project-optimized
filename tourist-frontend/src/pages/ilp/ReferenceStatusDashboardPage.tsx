import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { fetchApplicationByReference } from '../../utils/ilpAdminApi';
import { IlpApplicantRecord } from '../../types';

const TYPE_LABEL: Record<string, string> = {
  temporary_ilp: 'Temporary ILP',
  temporary_stay_permit: 'Temporary Stay Permit',
  ilp_exemption: 'ILP Exemption'
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Review',
  accepted: 'Accepted',
  declined: 'Declined'
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getStatusClassName = (status: string) => {
  if (status === 'accepted') {
    return 'accept';
  }

  if (status === 'declined') {
    return 'decline';
  }

  return 'pending';
};

const downloadAsImage = async (element: HTMLElement, fileName: string) => {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.download = fileName;
  link.click();
};

const downloadAsPdf = async (element: HTMLElement, fileName: string) => {
  const [{ default: html2canvas }, { default: JsPdf }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new JsPdf({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 20, 20, pageWidth - 40, pageHeight - 20);
  pdf.save(fileName);
};

const ApplicantDetails: React.FC<{ application: IlpApplicantRecord }> = ({ application }) => (
  <div className="ilp-reference-grid">
    <div>
      <strong>Full Name</strong>
      <p>{application.full_name}</p>
    </div>
    <div>
      <strong>Application Type</strong>
      <p>{TYPE_LABEL[application.application_type]}</p>
    </div>
    <div>
      <strong>Country / State</strong>
      <p>{application.country} / {application.state || '-'}</p>
    </div>
    <div>
      <strong>Purpose</strong>
      <p>{application.purpose_of_visit}</p>
    </div>
    <div>
      <strong>Stay Start</strong>
      <p>{formatDate(application.stay_start_date)}</p>
    </div>
    <div>
      <strong>Expiry Date</strong>
      <p>{formatDate(application.expiry_date)}</p>
    </div>
  </div>
);

const ReferenceStatusDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const permitRef = useRef<HTMLDivElement>(null);
  const { referenceNumber = '' } = useParams();

  const applicationQuery = useQuery({
    queryKey: ['application-by-reference', referenceNumber],
    queryFn: () => fetchApplicationByReference(referenceNumber),
    enabled: /^\d{12}$/.test(referenceNumber)
  });

  const application = applicationQuery.data?.application;

  const onDownloadPdf = async () => {
    if (!permitRef.current || !application) {
      return;
    }

    await downloadAsPdf(permitRef.current, `ILP-Permit-${application.reference_number}.pdf`);
  };

  const onDownloadJpg = async () => {
    if (!permitRef.current || !application) {
      return;
    }

    await downloadAsImage(permitRef.current, `ILP-Permit-${application.reference_number}.jpg`);
  };

  return (
    <Screen className="ilp-application-screen">
      <div className="ilp-application-header">
        <button type="button" className="ilp-back-button" onClick={() => navigate('/fee-payment-download')}>
          ← Back
        </button>
        <h1 className="ilp-form-title">Reference Dashboard</h1>
      </div>

      <div className="ilp-form-container">
        {applicationQuery.isLoading ? (
          <AnimatedSection className="ilp-form-step">
            <p>Loading application details...</p>
          </AnimatedSection>
        ) : null}

        {applicationQuery.isError ? (
          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">Reference Not Found</h3>
            <p>Please check your 12-digit reference number and try again.</p>
          </AnimatedSection>
        ) : null}

        {application ? (
          <>
            <AnimatedSection className="ilp-form-step">
              <h3 className="form-step-title">Application Status</h3>
              <div className={`ilp-status-pill ${getStatusClassName(application.application_status)}`}>
                {STATUS_LABEL[application.application_status]}
              </div>
              <p className="ilp-reference-note">Reference Number: {application.reference_number}</p>
              <p className="ilp-reference-note">
                Validity: {application.validity_days} days | Days Remaining: {application.days_remaining >= 0 ? application.days_remaining : 0}
              </p>
              {application.is_overstayer ? (
                <p className="ilp-reference-warning">Overstay Alert: {application.overstay_days} day(s) beyond validity.</p>
              ) : null}
            </AnimatedSection>

            <AnimatedSection className="ilp-form-step">
              <h3 className="form-step-title">Applicant Details</h3>
              <ApplicantDetails application={application} />
            </AnimatedSection>

            <AnimatedSection className="ilp-form-step">
              <h3 className="form-step-title">Generated Permit</h3>
              <div className="ilp-permit-card" ref={permitRef}>
                <p><strong>Reference:</strong> {application.reference_number}</p>
                <p><strong>Name:</strong> {application.full_name}</p>
                <p><strong>Type:</strong> {TYPE_LABEL[application.application_type]}</p>
                <p><strong>Status:</strong> {STATUS_LABEL[application.application_status]}</p>
                <p><strong>Valid From:</strong> {formatDate(application.stay_start_date)}</p>
                <p><strong>Valid Till:</strong> {formatDate(application.expiry_date)}</p>
                <p><strong>ID Document:</strong> {application.id_document_type} - {application.id_document_number}</p>
              </div>
            </AnimatedSection>

            <AnimatedSection className="ilp-form-step">
              <div className="ilp-permit-actions">
                <button type="button" className="primary-btn" onClick={onDownloadPdf}>Download PDF</button>
                <button type="button" className="primary-btn" onClick={onDownloadJpg}>Download JPG</button>
              </div>
            </AnimatedSection>
          </>
        ) : null}
      </div>
    </Screen>
  );
};

export default ReferenceStatusDashboardPage;
