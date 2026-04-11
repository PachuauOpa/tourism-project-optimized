import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { AnimatedSection } from '../../components/shared/AnimatedSection';
import { IlpApplicationForm, IlpSubmissionResponse } from '../../types';
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

const ApplyTemporaryIlpPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IlpApplicationForm>({
    selectType: '', fullName: '', gender: '', dateOfBirth: '', identityMark: '',
    mobileNo: '', idDocumentType: '', idDocumentNumber: '', relationType: '', relationName: '',
    fullAddress: '', country: 'India', state: '', district: '', proposedDateOfEntry: '', purposeOfVisit: '', placeOfStay: '',
    sponsorFullName: '', sponsorFatherName: '', sponsorEpicNo: '', sponsorMobileNo: '',
    sponsorshipType: '', sponsorDistrict: '',
    passportPhoto: null, idDocumentFile: null, sponsorshipDocument: null, otherDocument: null,
    uploadDocumentType: '', uploadDocumentFile: null,
    remarks: ''
  });

  const [errors, setErrors] = useState<Partial<IlpApplicationForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const maxEntryDate = new Date();
  maxEntryDate.setDate(today.getDate() + 30);
  const minEntryDateString = formatDate(today);
  const maxEntryDateString = formatDate(maxEntryDate);

  const sanitizePhoneNumber = (value: string): string => value.replace(/\D/g, '').slice(0, 15);

  const handleCountryChange = (country: string): void => {
    setFormData((prev) => ({
      ...prev,
      country,
      state: ''
    }));
  };

  const updateFormData = (field: keyof IlpApplicationForm, value: string | File | null): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const { uploadDocumentFile, ...rest } = formData;

    try {
      const uploadedDocument = uploadDocumentFile
        ? await uploadDocumentToMizTour(uploadDocumentFile, 'temporary-ilp')
        : null;

      const result = await postForm('/api/forms/temporary-ilp', {
        ...rest,
        uploadDocumentFileName: uploadedDocument?.fileName || null,
        uploadDocumentFileType: uploadedDocument?.fileType || null,
        uploadDocumentFileSize: uploadedDocument?.fileSize || null,
        uploadDocumentStoragePath: uploadedDocument?.storagePath || null,
        uploadDocumentPublicUrl: uploadedDocument?.publicUrl || null
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
        <h1 className="ilp-form-title">Apply Temporary ILP</h1>
        <p className="ilp-form-subtitle">( 7 Days Validity )</p>
      </div>

      <div className="ilp-form-container">
        <form onSubmit={handleSubmit}>
          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">1. Applicant Detail</h3>
            <div className="form-grid">
              <div className="ilp-form-field">
                <label>Select Type <span className="required">*</span></label>
                <select value={formData.selectType} onChange={(e) => updateFormData('selectType', e.target.value)} required>
                  <option value="">Select Type</option>
                  <option value="Labour">Labour</option>
                  <option value="Business">Business</option>
                  <option value="Tourism">Tourism</option>
                </select>
              </div>

              <div className="ilp-form-field">
                <label>Full Name as Supporting Document <span className="required">*</span></label>
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
                <label>Date of Birth <span className="required">*</span></label>
                <input type="date" value={formData.dateOfBirth} onChange={(e) => updateFormData('dateOfBirth', e.target.value)} required />
              </div>

              <div className="ilp-form-field">
                <label>Identity Mark <span className="required">*</span></label>
                <input type="text" value={formData.identityMark} onChange={(e) => updateFormData('identityMark', e.target.value)} required />
              </div>

              <div className="ilp-form-field">
                <label>Mobile No. <span className="required">*</span></label>
                <input type="tel" inputMode="numeric" pattern="[0-9]{1,15}" maxLength={15} value={formData.mobileNo} onChange={(e) => updateFormData('mobileNo', sanitizePhoneNumber(e.target.value))} required />
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

              <div className="ilp-form-field">
                <label>Proposed Date of Entry <span className="required">*</span></label>
                <input
                  type="date"
                  value={formData.proposedDateOfEntry}
                  min={minEntryDateString}
                  max={maxEntryDateString}
                  onChange={(e) => updateFormData('proposedDateOfEntry', e.target.value)}
                  required
                />
              </div>

              <div className="ilp-form-field full-width">
                <label>Purpose of Visit (Briefly) <span className="required">*</span></label>
                <textarea value={formData.purposeOfVisit} onChange={(e) => updateFormData('purposeOfVisit', e.target.value)} rows={2} required />
              </div>

              <div className="ilp-form-field full-width">
                <label>Place of Stay <span className="required">*</span></label>
                <textarea maxLength={30} value={formData.placeOfStay} onChange={(e) => updateFormData('placeOfStay', e.target.value.slice(0, 30))} rows={2} required />
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">2. Sponsor Detail</h3>
            <div className="form-grid">
              <div className="ilp-form-field">
                <label>Sponsor Full Name <span className="required">*</span></label>
                <input type="text" maxLength={20} value={formData.sponsorFullName} onChange={(e) => updateFormData('sponsorFullName', e.target.value.slice(0, 20))} required />
              </div>
              <div className="ilp-form-field">
                <label>Sponsor Father's Name <span className="required">*</span></label>
                <input type="text" maxLength={20} value={formData.sponsorFatherName} onChange={(e) => updateFormData('sponsorFatherName', e.target.value.slice(0, 20))} required />
              </div>
              <div className="ilp-form-field">
                <label>Sponsor EPIC (Voter's ID) No. <span className="required">*</span></label>
                <input type="text" value={formData.sponsorEpicNo} onChange={(e) => updateFormData('sponsorEpicNo', e.target.value)} required />
              </div>
              <div className="ilp-form-field">
                <label>Sponsor's Mobile No. <span className="required">*</span></label>
                <input type="tel" inputMode="numeric" pattern="[0-9]{1,15}" maxLength={15} value={formData.sponsorMobileNo} onChange={(e) => updateFormData('sponsorMobileNo', sanitizePhoneNumber(e.target.value))} required />
              </div>
              <div className="ilp-form-field">
                <label>Sponsorship Type <span className="required">*</span></label>
                <select value={formData.sponsorshipType} onChange={(e) => updateFormData('sponsorshipType', e.target.value)} required>
                  <option value="">Select Type</option>
                  <option value="Private">Private</option>
                  <option value="Departmental">Departmental</option>
                  <option value="Non Tribal">Non Tribal</option>
                </select>
              </div>
              <div className="ilp-form-field">
                <label>Sponsor's District <span className="required">*</span></label>
                <select value={formData.sponsorDistrict} onChange={(e) => updateFormData('sponsorDistrict', e.target.value)} required>
                  <option value="">Select District</option>
                  <option value="Aizawl">Aizawl</option>
                  <option value="Lunglei">Lunglei</option>
                  <option value="Champhai">Champhai</option>
                  <option value="Mamit">Mamit</option>
                  <option value="Kolasib">Kolasib</option>
                  <option value="Serchhip">Serchhip</option>
                  <option value="Lawngtlai">Lawngtlai</option>
                  <option value="Saitual">Saitual</option>
                  <option value="Khawzawl">Khawzawl</option>
                  <option value="Hnahthial">Hnahthial</option>
                </select>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">3. Document Upload</h3>
            <div className="upload-grid">
              <div className="ilp-form-field full-width">
                <label>Select Document Type <span className="required">*</span></label>
                <select value={formData.uploadDocumentType} onChange={(e) => updateFormData('uploadDocumentType', e.target.value)} required>
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
                    updateFormData('uploadDocumentFile', e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="ilp-file-input-hidden"
                    onChange={(e) => updateFormData('uploadDocumentFile', e.target.files?.[0] || null)}
                    required
                  />
                  <span className="ilp-dropzone-title">Drag and drop file here, or click to browse</span>
                  <span className="ilp-dropzone-subtitle">Accepted: PDF, JPG, JPEG, PNG</span>
                  {formData.uploadDocumentFile && <span className="file-selected">✓ {formData.uploadDocumentFile.name}</span>}
                </label>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection className="ilp-form-step">
            <h3 className="form-step-title">4. Remarks</h3>
            <div className="ilp-form-field full-width">
              <label>Remarks (Optional)</label>
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

export default ApplyTemporaryIlpPage;
