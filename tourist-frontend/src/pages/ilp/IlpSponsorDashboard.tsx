import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSponsorLogs,
  logoutSponsor,
  promoteToRegularIlp,
  SponsorLogRecord
} from '../../utils/ilpSponsorApi';

type SponsorView = 'logs' | 'regular-ilp';
type PromotionType = 'fresh' | 'renewal';
type ValidityOption = '6_months' | '1_year' | '2_years';

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const IlpSponsorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = localStorage.getItem('ilpSponsorToken') || '';
  const sponsorName = localStorage.getItem('ilpSponsorName') || 'Sponsor';

  const [activeView, setActiveView] = useState<SponsorView>('logs');
  const [promotionType, setPromotionType] = useState<PromotionType>('fresh');
  const [temporaryReferenceNumber, setTemporaryReferenceNumber] = useState('');
  const [validityOption, setValidityOption] = useState<ValidityOption>('6_months');
  const [showPromotionForm, setShowPromotionForm] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const logsQuery = useQuery({
    queryKey: ['sponsor-regular-ilp-logs', token],
    queryFn: () => fetchSponsorLogs(token),
    enabled: Boolean(token)
  });

  const promoteMutation = useMutation({
    mutationFn: () =>
      promoteToRegularIlp(token, {
        promotionType,
        temporaryReferenceNumber: temporaryReferenceNumber.trim(),
        validityOption
      }),
    onSuccess: () => {
      setFormSuccess('Regular ILP issued successfully.');
      setFormError('');
      setTemporaryReferenceNumber('');
      queryClient.invalidateQueries({ queryKey: ['sponsor-regular-ilp-logs'] });
      setActiveView('logs');
    },
    onError: (error) => {
      setFormSuccess('');
      setFormError(error instanceof Error ? error.message : 'Failed to issue regular ILP.');
    }
  });

  if (!token) {
    return <Navigate to="/ilp-login" replace />;
  }

  const logs: SponsorLogRecord[] = logsQuery.data?.logs || [];

  const handleSubmitPromotion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{12}$/.test(temporaryReferenceNumber.trim())) {
      setFormError('Temporary pass number must be a 12 digit reference number.');
      setFormSuccess('');
      return;
    }

    promoteMutation.mutate();
  };

  const handleLogout = async () => {
    try {
      await logoutSponsor(token);
    } catch {
      // Ignore logout API failures and clear local session anyway.
    } finally {
      localStorage.removeItem('ilpSponsorToken');
      localStorage.removeItem('ilpSponsorName');
      localStorage.removeItem('ilpSponsorMobileNo');
      navigate('/ilp-login');
    }
  };

  return (
    <div className="ilp-sponsor-page">
      <aside className="ilp-sponsor-sidebar">
        <div className="ilp-sponsor-brand">
          <img src="/icons/title-mark.svg" alt="PermitPro" className="ilp-sponsor-brand-icon" width="38" height="85" />
          <div>
            <h2>PermitPro</h2>
            <p>Sponsor Portal</p>
          </div>
        </div>

        <nav className="ilp-sponsor-nav">
          <button
            type="button"
            className={`ilp-sponsor-nav-btn ${activeView === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveView('logs')}
          >
            Sponsor Log
          </button>
          <button
            type="button"
            className={`ilp-sponsor-nav-btn ${activeView === 'regular-ilp' ? 'active' : ''}`}
            onClick={() => setActiveView('regular-ilp')}
          >
            Regular ILP
          </button>
        </nav>

        <button type="button" className="ilp-sponsor-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="ilp-sponsor-main">
        <header className="ilp-sponsor-header">
          <div>
            <h1>{activeView === 'logs' ? 'Sponsor Log' : 'Regular ILP Promotion'}</h1>
            <p>Welcome, {sponsorName}</p>
          </div>

          {activeView === 'regular-ilp' && (
            <button
              type="button"
              className="ilp-sponsor-plus-btn"
              onClick={() => setShowPromotionForm((current) => !current)}
              aria-label="Toggle regular ILP promotion form"
            >
              +
            </button>
          )}
        </header>

        {activeView === 'logs' && (
          <section className="ilp-sponsor-panel">
            {logsQuery.isLoading && <p className="ilp-sponsor-info">Loading sponsor logs...</p>}
            {logsQuery.isError && <p className="ilp-sponsor-error">Failed to load sponsor logs.</p>}

            {!logsQuery.isLoading && logs.length === 0 && (
              <p className="ilp-sponsor-info">No regular ILP promotions found yet.</p>
            )}

            {logs.length > 0 && (
              <div className="ilp-sponsor-table-wrap">
                <table className="ilp-sponsor-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Pass No.</th>
                      <th>Valid From</th>
                      <th>Valid To</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Temp Ref#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((record) => (
                      <tr key={record.id}>
                        <td>{record.applicant_name}</td>
                        <td>{record.pass_no}</td>
                        <td>{formatDate(record.valid_from)}</td>
                        <td>{formatDate(record.valid_to)}</td>
                        <td>
                          <span className={`ilp-sponsor-status ${record.status.toLowerCase()}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>{record.promotion_type}</td>
                        <td>{record.temporary_reference_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeView === 'regular-ilp' && (
          <section className="ilp-sponsor-panel">
            {showPromotionForm && (
              <form className="ilp-sponsor-form" onSubmit={handleSubmitPromotion}>
                <div className="ilp-sponsor-form-row">
                  <label htmlFor="promotionType">Promotion Type</label>
                  <select
                    id="promotionType"
                    value={promotionType}
                    onChange={(event) => setPromotionType(event.target.value as PromotionType)}
                  >
                    <option value="fresh">Fresh</option>
                    <option value="renewal">Renewal</option>
                  </select>
                </div>

                <div className="ilp-sponsor-form-row">
                  <label htmlFor="temporaryReferenceNumber">Temporary Pass Number (Reference No.)</label>
                  <input
                    id="temporaryReferenceNumber"
                    type="text"
                    maxLength={12}
                    value={temporaryReferenceNumber}
                    onChange={(event) => setTemporaryReferenceNumber(event.target.value)}
                    placeholder="Enter 12 digit temporary reference number"
                  />
                </div>

                <div className="ilp-sponsor-form-row">
                  <label htmlFor="validityOption">Regular Pass Validity</label>
                  <select
                    id="validityOption"
                    value={validityOption}
                    onChange={(event) => setValidityOption(event.target.value as ValidityOption)}
                  >
                    <option value="6_months">6 Months</option>
                    <option value="1_year">1 Year</option>
                    <option value="2_years">2 Years</option>
                  </select>
                </div>

                {formError && <p className="ilp-sponsor-error">{formError}</p>}
                {formSuccess && <p className="ilp-sponsor-success">{formSuccess}</p>}

                <button
                  type="submit"
                  className="ilp-sponsor-submit-btn"
                  disabled={promoteMutation.isPending}
                >
                  {promoteMutation.isPending ? 'Issuing...' : 'Promote to Regular ILP'}
                </button>
              </form>
            )}

            {!showPromotionForm && (
              <p className="ilp-sponsor-info">Click the + icon to open the promotion form.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default IlpSponsorDashboard;
