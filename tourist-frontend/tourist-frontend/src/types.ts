export interface IconProps {
  size?: number;
  className?: string;
}

export interface Destination {
  id: string;
  name: string;
  short: string;
  detail: string;
  rating: string;
  time: string;
  image: string;
  imageVariants?: ImageVariantUrls | null;
  region: string;
  activityType: string[];
  difficulty: string;
  bestSeason: string[];
  duration: string;
  type: string;
  typeTags: string[];
  featured?: boolean;
}

export interface ImageVariantUrls {
  small: string;
  medium: string;
  large: string;
}

export interface DestinationGalleryImage {
  id?: number;
  image_url: string;
  image_variants?: ImageVariantUrls | null;
  caption?: string | null;
  sort_order?: number;
}

export interface DestinationFolkloreStory {
  id?: number;
  title: string;
  body: string;
  image_url?: string | null;
  image_variants?: ImageVariantUrls | null;
  sort_order?: number;
}

export interface ManagedDestinationRecord {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  curated_by: string | null;
  short_description: string;
  about: string;
  keyword_tags: string[];
  region: string;
  activity_type: string[];
  destination_type: string;
  destination_type_tags: string[];
  duration: string;
  best_time: string | null;
  entry_price: string | null;
  difficulty: string;
  road_condition_status: string;
  rating: number;
  travel_time: string;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number | null;
  header_image_url: string | null;
  header_image_variants?: ImageVariantUrls | null;
  featured: boolean;
  is_published: boolean;
  gallery_images: DestinationGalleryImage[];
  folklore_stories: DestinationFolkloreStory[];
  created_at: string;
  updated_at: string;
}

export interface ManagedDestinationPayload {
  slug: string;
  title: string;
  subtitle?: string;
  curated_by?: string;
  short_description: string;
  about: string;
  keyword_tags: string[];
  region: string;
  activity_type: string[];
  destination_type: string;
  destination_type_tags: string[];
  duration: string;
  best_time?: string;
  entry_price?: string;
  difficulty: string;
  road_condition_status: string;
  rating: number;
  travel_time: string;
  latitude?: number | null;
  longitude?: number | null;
  header_image_url?: string;
  header_image_variants?: ImageVariantUrls | null;
  featured?: boolean;
  is_published?: boolean;
  gallery_images: DestinationGalleryImage[];
  folklore_stories: DestinationFolkloreStory[];
}

export interface EmergencyLine {
  id: string;
  title: string;
  info: string;
}

export interface FilterOption {
  label: string;
  value: string;
  description: string;
}

export interface FilterCategory {
  key: string;
  title: string;
  options: FilterOption[];
}

export interface ActiveFilters {
  [category: string]: string[];
}

export interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ActiveFilters) => void;
  categories?: FilterCategory[];
  activeFilters?: ActiveFilters;
  presentation?: 'dropdown' | 'bottom-sheet';
}

export interface IlpApplicationForm {
  // 1. Applicant Detail
  selectType: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  identityMark: string;
  mobileNo: string;
  idDocumentType: string;
  idDocumentNumber: string;
  relationType: string;
  relationName: string;
  fullAddress: string;
  country: string;
  state: string;
  district: string;
  proposedDateOfEntry: string;
  purposeOfVisit: string;
  placeOfStay: string;

  // 2. Sponsor Detail
  sponsorFullName: string;
  sponsorFatherName: string;
  sponsorEpicNo: string;
  sponsorMobileNo: string;
  sponsorshipType: string;
  sponsorDistrict: string;

  // 3. Document Upload
  passportPhoto: File | null;
  idDocumentFile: File | null;
  sponsorshipDocument: File | null;
  otherDocument: File | null;
  uploadDocumentType: string;
  uploadDocumentFile: File | null;

  // 4. Remarks
  remarks: string;
}

export interface IlpRegistrationForm {
  fullName: string;
  email: string;
  mobileNo: string;
  password: string;
  confirmPassword: string;
}

export interface IlpLoginForm {
  phoneNumber: string;
  password: string;
}

export interface TemporaryStayPermitForm {
  // 1. Applicant Detail
  selectType: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  identityMark: string;
  mobileNo: string;
  idDocumentType: string;
  idDocumentNumber: string;
  relationType: string;
  relationName: string;
  fullAddress: string;
  country: string;
  state: string;
  district: string;
  proposedDateOfEntry: string;
  purposeOfVisit: string;
  placeOfStay: string;

  // 2. Sponsor Detail
  sponsorFullName: string;
  sponsorFatherName: string;
  sponsorEpicNo: string;
  sponsorMobileNo: string;
  sponsorshipType: string;
  sponsorDistrict: string;

  // 3. Document Upload
  passportPhoto: File | null;
  idDocumentFile: File | null;
  sponsorshipDocument: File | null;
  otherDocument: File | null;
  uploadDocumentType: string;
  uploadDocumentFile: File | null;

  // 4. Remarks
  remarks: string;
}

export interface FeePaymentForm {
  referenceNumber: string;
}

export interface IlpExemptionForm {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  identityMark: string;
  mobileNo: string;
  idDocumentType: string;
  idDocumentNumber: string;
  relationType: string;
  relationName: string;
  fullAddress: string;
  country: string;
  state: string;
  district: string;
  purposeOfVisit: string;
  placeOfStay: string;
  exemptionFromDate: string;
  exemptionToDate: string;
  supportingDocumentType: string;
  supportingDocumentFile: File | null;
  remarks: string;
}

export type IlpApplicationType = 'temporary_ilp' | 'temporary_stay_permit' | 'ilp_exemption';
export type IlpApplicationStatus = 'pending' | 'accepted' | 'declined';

export interface IlpSubmissionResponse {
  message: string;
  id: number;
  referenceNumber: string;
  applicationType: IlpApplicationType;
}

export interface IlpApplicantRecord {
  id: number;
  reference_number: string;
  application_status: IlpApplicationStatus;
  submitted_at: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  identity_mark: string;
  mobile_no: string;
  id_document_type: string;
  id_document_number: string;
  relation_type: string;
  relation_name: string;
  full_address: string;
  country: string;
  state: string;
  district: string;
  purpose_of_visit: string;
  place_of_stay: string;
  proposed_date_of_entry: string | null;
  exemption_from_date: string | null;
  exemption_to_date: string | null;
  sponsor_full_name: string | null;
  sponsor_father_name: string | null;
  sponsor_epic_no: string | null;
  sponsor_mobile_no: string | null;
  sponsorship_type: string | null;
  sponsor_district: string | null;
  upload_document_type: string | null;
  upload_document_file_name: string | null;
  upload_document_file_type: string | null;
  upload_document_file_size: number | null;
  upload_document_storage_path: string | null;
  upload_document_public_url: string | null;
  supporting_document_type: string | null;
  supporting_document_file_name: string | null;
  supporting_document_file_type: string | null;
  supporting_document_file_size: number | null;
  supporting_document_storage_path: string | null;
  supporting_document_public_url: string | null;
  remarks: string | null;
  application_type: IlpApplicationType;
  validity_days: number;
  stay_start_date: string;
  expiry_date: string;
  days_remaining: number;
  overstay_days: number;
  is_overstayer: boolean;
}