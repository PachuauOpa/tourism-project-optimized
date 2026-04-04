import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { IlpExemptionForm, IlpSubmissionResponse } from '../../types';
import { COUNTRIES } from '../../data/countries';
import { postForm } from '../../utils/api';
import { uploadDocumentToMizTour } from '../../utils/supabaseStorage';

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const IlpExemptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IlpExemptionForm>({
    fullName: '',
    gender: '',
    dateOfBirth: '',
    identityMark: '',
    mobileNo: '',
    idDocumentType: '',
    idDocumentNumber: '',
    relationType: '',
    relationName: '',
    fullAddress: '',
    country: 'India',
    state: '',
    district: '',
    purposeOfVisit: '',
    placeOfStay: '',
    exemptionFromDate: '',
    exemptionToDate: '',
    supportingDocumentType: '',
    supportingDocumentFile: null,
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const todayString = formatDate(today);

  const sanitizePhoneNumber = (value: string): string => value.replace(/\D/g, '').slice(0, 15);

  const updateFormData = (field: keyof IlpExemptionForm, value: string | File | null): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (country: string): void => {
    setFormData((prev) => ({
      ...prev,
      country,
      state: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const { supportingDocumentFile, ...rest } = formData;

    try {
      const uploadedDocument = supportingDocumentFile
        ? await uploadDocumentToMizTour(supportingDocumentFile, 'ilp-exemption')
        : null;

      const result = await postForm('/api/forms/ilp-exemption', {
        ...rest,
        supportingDocumentFileName: uploadedDocument?.fileName || null,
        supportingDocumentFileType: uploadedDocument?.fileType || null,
        supportingDocumentFileSize: uploadedDocument?.fileSize || null,
        supportingDocumentStoragePath: uploadedDocument?.storagePath || null,
        supportingDocumentPublicUrl: uploadedDocument?.publicUrl || null
      }) as IlpSubmissionResponse;

      navigate(`/application-reference/${result.applicationType}/${result.referenceNumber}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen className="ilp-application-screen">
      <div className="ilp-application-header">
        <button type="button" className="ilp-back-button" onClick={() => navigate('/ilp-application-types')}>
          ← Back
        </button>
        <h1 className="ilp-form-title">Apply ILP Exemption</h1>
      </div>

      <div className="ilp-form-container">
        <form onSubmit={handleSubmit}>
          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">1. Applicant Detail</h3>
            <div className="form-grid">
              <div className="ilp-form-field">
                <label>Full Name <span className="required">*</span></label>
                <input type="text" maxLength={20} value={formData.fullName} onChange={(e) => updateFormData('fullName', e.target.value.slice(0, 20))} required />
              </div>

              <div className="ilp-form-field">
                <label>Gender <span className="required">*</span></label>
                <select value={formData.gender} onChange={(e) => updateFormData('gender', e.target.value)} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Third Gender">Third Gender</option>
                </select>
              </div>

              <div className="ilp-form-field">
                <label>DOB <span className="required">*</span></label>
                <input type="date" value={formData.dateOfBirth} onChange={(e) => updateFormData('dateOfBirth', e.target.value)} required />
              </div>

              <div className="ilp-form-field">
                <label>Identity Mark <span className="required">*</span></label>
                <input type="text" value={formData.identityMark} onChange={(e) => updateFormData('identityMark', e.target.value)} required />
              </div>

              <div className="ilp-form-field">
                <label>Mobile Number <span className="required">*</span></label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{1,15}"
                  maxLength={15}
                  value={formData.mobileNo}
                  onChange={(e) => updateFormData('mobileNo', sanitizePhoneNumber(e.target.value))}
                  required
                />
              </div>

              <div className="inline-pair-row full-width">
                <div className="ilp-form-field inline-1-4">
                  <label>Select (ID Document) <span className="required">*</span></label>
                  <select value={formData.idDocumentType} onChange={(e) => updateFormData('idDocumentType', e.target.value)} required>
                    <option value="">Select</option>
                    <option value="EPIC">EPIC (Voter ID)</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div className="ilp-form-field inline-3-4">
                  <label>{formData.idDocumentType || 'ID'} Number <span className="required">*</span></label>
                  <input type="text" placeholder={`${formData.idDocumentType || 'ID'} Number`} value={formData.idDocumentNumber} onChange={(e) => updateFormData('idDocumentNumber', e.target.value)} required />
                </div>
              </div>

              <div className="inline-pair-row full-width">
                <div className="ilp-form-field inline-1-4">
                  <label>Select (Relation) <span className="required">*</span></label>
                  <select value={formData.relationType} onChange={(e) => updateFormData('relationType', e.target.value)} required>
                    <option value="">Select</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div className="ilp-form-field inline-3-4">
                  <label>{formData.relationType || 'Relation'} Name <span className="required">*</span></label>
                  <input type="text" maxLength={20} placeholder={`${formData.relationType || 'Relation'} Name`} value={formData.relationName} onChange={(e) => updateFormData('relationName', e.target.value.slice(0, 20))} required />
                </div>
              </div>

              <div className="ilp-form-field full-width">
                <label>Full Address of Applicant <span className="required">*</span></label>
                <textarea maxLength={30} value={formData.fullAddress} onChange={(e) => updateFormData('fullAddress', e.target.value.slice(0, 30))} rows={3} required />
              </div>

              <div className="ilp-form-field">
                <label>Select Country <span className="required">*</span></label>
                <select value={formData.country} onChange={(e) => handleCountryChange(e.target.value)} required>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="ilp-form-field">
                <label>Select State <span className="required">*</span></label>
                {formData.country === 'India' ? (
                  <select value={formData.state} onChange={(e) => updateFormData('state', e.target.value)} required>
                    <option value="">Select State</option>
                    {INDIA_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" maxLength={30} placeholder="Enter State" value={formData.state} onChange={(e) => updateFormData('state', e.target.value.slice(0, 30))} required />
                )}
              </div>

              <div className="ilp-form-field">
                <label>District <span className="required">*</span></label>
                <input type="text" value={formData.district} onChange={(e) => updateFormData('district', e.target.value)} required />
              </div>

              <div className="ilp-form-field full-width">
                <label>Purpose of Visit <span className="required">*</span></label>
                <textarea value={formData.purposeOfVisit} onChange={(e) => updateFormData('purposeOfVisit', e.target.value)} rows={2} required />
              </div>

              <div className="ilp-form-field full-width">
                <label>Place of Stay <span className="required">*</span></label>
                <textarea maxLength={30} value={formData.placeOfStay} onChange={(e) => updateFormData('placeOfStay', e.target.value.slice(0, 30))} rows={2} required />
              </div>

              <div className="ilp-form-field">
                <label>Exemption From Date <span className="required">*</span></label>
                <input
                  type="date"
                  min={todayString}
                  value={formData.exemptionFromDate}
                  onChange={(e) => updateFormData('exemptionFromDate', e.target.value)}
                  required
                />
              </div>

              <div className="ilp-form-field">
                <label>Exemption To Date <span className="required">*</span></label>
                <input
                  type="date"
                  min={formData.exemptionFromDate || todayString}
                  value={formData.exemptionToDate}
                  onChange={(e) => updateFormData('exemptionToDate', e.target.value)}
                  required
                />
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">2. Supporting Documents</h3>
            <div className="upload-grid">
              <div className="ilp-form-field full-width">
                <label>Select Document Type <span className="required">*</span></label>
                <select value={formData.supportingDocumentType} onChange={(e) => updateFormData('supportingDocumentType', e.target.value)} required>
                  <option value="">Select Document Type</option>
                  <option value="Passport size Photo">Passport size Photo</option>
                  <option value="Documentary Proof (Purpose of Visit)">Documentary Proof (Purpose of Visit)</option>
                  <option value="EPIC (Voter's ID)">EPIC (Voter's ID)</option>
                  <option value="Sponsor Undertaking (As Per Template)">Sponsor Undertaking (As Per Template)</option>
                </select>
              </div>

              <div className="ilp-form-field full-width">
                <label>Upload File <span className="required">*</span></label>
                <label
                  className="ilp-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    updateFormData('supportingDocumentFile', e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="ilp-file-input-hidden"
                    onChange={(e) => updateFormData('supportingDocumentFile', e.target.files?.[0] || null)}
                    required
                  />
                  <span className="ilp-dropzone-title">Drag and drop file here, or click to browse</span>
                  <span className="ilp-dropzone-subtitle">Accepted: PDF, JPG, JPEG, PNG</span>
                  {formData.supportingDocumentFile && <span className="file-selected">✓ {formData.supportingDocumentFile.name}</span>}
                </label>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">3. Remark</h3>
            <div className="ilp-form-field full-width">
              <label>Remark (if any)</label>
              <textarea value={formData.remarks} onChange={(e) => updateFormData('remarks', e.target.value)} rows={3} />
            </div>
          </AnimatedSection>

          <div className="form-navigation">
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </Screen>
  );
};

export default IlpExemptionPage;
