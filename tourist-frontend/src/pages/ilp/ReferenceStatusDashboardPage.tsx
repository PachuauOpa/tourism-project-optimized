import React, { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { fetchApplicationByReference } from '../../utils/ilpAdminApi';
import {
  createPaymentOrder,
  fetchPaymentStatus,
  verifyPayment,
  PaymentStatusResponse
} from '../../utils/ilpSponsorApi';
import { IlpApplicantRecord } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// Application types that require fee payment before pass download.
const PAYMENT_REQUIRED_TYPES = new Set(['temporary_ilp', 'temporary_stay_permit']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getStatusClassName = (status: string) => {
  if (status === 'accepted') return 'accept';
  if (status === 'declined') return 'decline';
  return 'pending';
};

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

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
  const pdf = new JsPdf({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 20, 20, pageWidth - 40, pageHeight - 20);
  pdf.save(fileName);
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Payment Gate Card
// ---------------------------------------------------------------------------

interface PaymentGateProps {
  application: IlpApplicantRecord;
  paymentInfo: PaymentStatusResponse | null;
  onPaymentSuccess: () => void;
}

const PaymentGate: React.FC<PaymentGateProps> = ({ application, paymentInfo, onPaymentSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handlePayment = useCallback(async () => {
    setIsLoading(true);
    setPaymentError('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError('Failed to load payment gateway. Please check your internet connection and try again.');
        setIsLoading(false);
        return;
      }

      const orderData = await createPaymentOrder({
        referenceNumber: application.reference_number,
        applicationType: application.application_type
      });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Mizoram Tourism ILP',
        description: `ILP Pass Fee — Ref: ${application.reference_number}`,
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              referenceNumber: application.reference_number,
              applicationType: application.application_type
            });
            onPaymentSuccess();
          } catch {
            setPaymentError(
              'Payment was received but verification failed. Please contact support with your reference number.'
            );
          }
        },
        prefill: {
          name: application.full_name,
          contact: application.mobile_no || ''
        },
        notes: {
          referenceNumber: application.reference_number
        },
        theme: {
          color: '#4f46e5'
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: { error: { description: string } }) => {
        setPaymentError(resp?.error?.description || 'Payment failed. Please try again.');
        setIsLoading(false);
      });
      rzp.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initiate payment.';
      setPaymentError(
        message.includes('already been completed')
          ? 'Payment already completed. Refreshing...'
          : message
      );
      if (message.includes('already been completed')) {
        onPaymentSuccess();
      }
      setIsLoading(false);
    }
  }, [application, onPaymentSuccess]);

  const isPending = paymentInfo?.paymentStatus === 'created';

  return (
    <div className="ilp-payment-gate">
      <div className="ilp-payment-gate-icon">💳</div>
      <h3 className="ilp-payment-gate-title">Payment Required to Download Pass</h3>
      <p className="ilp-payment-gate-subtitle">
        Your application has been <strong>approved</strong>. A one-time fee of{' '}
        <strong>₹50</strong> is required to generate and download your ILP Pass.
      </p>

      <div className="ilp-payment-amount-badge">
        <span className="ilp-payment-amount-label">Fee Amount</span>
        <span className="ilp-payment-amount-value">₹50.00</span>
      </div>

      {isPending && (
        <p className="ilp-payment-gate-note">
          ⏳ A payment session is already open. Click below to resume it.
        </p>
      )}

      {paymentError && (
        <p className="ilp-payment-error">{paymentError}</p>
      )}

      <button
        type="button"
        className="ilp-payment-btn"
        onClick={handlePayment}
        disabled={isLoading}
        id="razorpay-pay-btn"
      >
        {isLoading ? (
          <span className="ilp-payment-btn-loading">
            <span className="ilp-payment-spinner" />
            Opening Payment Gateway...
          </span>
        ) : (
          <span>Pay ₹50 &amp; Download Pass</span>
        )}
      </button>

      <p className="ilp-payment-secure-note">
        🔒 Secured by Razorpay · UPI, Cards, Net Banking & Wallets accepted
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const ReferenceStatusDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const permitRef = useRef<HTMLDivElement>(null);
  const { referenceNumber = '' } = useParams();

  const [paymentVerified, setPaymentVerified] = useState(false);

  const applicationQuery = useQuery({
    queryKey: ['application-by-reference', referenceNumber],
    queryFn: () => fetchApplicationByReference(referenceNumber),
    enabled: /^\d{12}$/.test(referenceNumber)
  });

  const application = applicationQuery.data?.application;

  const requiresPayment =
    application && PAYMENT_REQUIRED_TYPES.has(application.application_type);

  const paymentStatusQuery = useQuery({
    queryKey: ['payment-status', referenceNumber],
    queryFn: () => fetchPaymentStatus(referenceNumber),
    enabled: Boolean(application) && requiresPayment === true,
    refetchInterval: paymentVerified ? false : 10_000
  });

  const paymentInfo = paymentStatusQuery.data ?? null;
  const isPaid =
    paymentVerified ||
    paymentInfo?.paymentStatus === 'paid' ||
    !requiresPayment;

  // When payment is confirmed, invalidate both queries so UI refreshes.
  const handlePaymentSuccess = useCallback(() => {
    setPaymentVerified(true);
    queryClient.invalidateQueries({ queryKey: ['payment-status', referenceNumber] });
    queryClient.invalidateQueries({ queryKey: ['application-by-reference', referenceNumber] });
  }, [queryClient, referenceNumber]);

  // Show download buttons only if accepted and payment done (or exemption).
  const canDownload =
    application?.application_status === 'accepted' && isPaid;

  const onDownloadPdf = async () => {
    if (!permitRef.current || !application) return;
    await downloadAsPdf(permitRef.current, `ILP-Permit-${application.reference_number}.pdf`);
  };

  const onDownloadJpg = async () => {
    if (!permitRef.current || !application) return;
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
                Validity: {application.validity_days} days | Days Remaining:{' '}
                {application.days_remaining >= 0 ? application.days_remaining : 0}
              </p>
              {application.is_overstayer ? (
                <p className="ilp-reference-warning">
                  Overstay Alert: {application.overstay_days} day(s) beyond validity.
                </p>
              ) : null}
            </AnimatedSection>

            <AnimatedSection className="ilp-form-step">
              <h3 className="form-step-title">Applicant Details</h3>
              <ApplicantDetails application={application} />
            </AnimatedSection>

            {/* Payment gate — shown only when accepted & payment not yet done & payment required */}
            {application.application_status === 'accepted' &&
              requiresPayment &&
              !isPaid ? (
              <AnimatedSection className="ilp-form-step ilp-payment-step">
                <PaymentGate
                  application={application}
                  paymentInfo={paymentInfo}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              </AnimatedSection>
            ) : null}

            {/* Payment success confirmation */}
            {application.application_status === 'accepted' &&
              requiresPayment &&
              isPaid ? (
              <AnimatedSection className="ilp-form-step">
                <div className="ilp-payment-success-banner">
                  <span className="ilp-payment-success-icon">✅</span>
                  <div>
                    <strong>Payment Successful!</strong>
                    <p>Your ILP Pass is now available for download.</p>
                  </div>
                </div>
              </AnimatedSection>
            ) : null}

            {/* Generated permit — always visible for non-accepted, visible + downloadable for accepted+paid */}
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
                <button
                  type="button"
                  className="primary-btn"
                  onClick={onDownloadPdf}
                  disabled={!canDownload}
                  title={!canDownload ? 'Complete payment to download' : 'Download as PDF'}
                  id="download-pdf-btn"
                >
                  {requiresPayment && !isPaid ? '🔒 Download PDF' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={onDownloadJpg}
                  disabled={!canDownload}
                  title={!canDownload ? 'Complete payment to download' : 'Download as JPG'}
                  id="download-jpg-btn"
                >
                  {requiresPayment && !isPaid ? '🔒 Download JPG' : 'Download JPG'}
                </button>
              </div>
              {requiresPayment && !isPaid && application.application_status === 'accepted' && (
                <p className="ilp-payment-download-hint">
                  Complete the ₹50 payment above to unlock your ILP Pass download.
                </p>
              )}
            </AnimatedSection>
          </>
        ) : null}
      </div>
    </Screen>
  );
};

export default ReferenceStatusDashboardPage;
