import { IlpApplicantRecord, IlpApplicationStatus, IlpApplicationType } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const buildHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Request failed');
  }

  return response.json() as Promise<T>;
};

export interface AdminLoginResponse {
  token: string;
  username: string;
}

export const adminLogin = async (username: string, password: string): Promise<AdminLoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ username, password })
  });

  return handleResponse<AdminLoginResponse>(response);
};

export interface FetchAdminApplicationsParams {
  token: string;
  search?: string;
  status?: IlpApplicationStatus | 'all';
  type?: IlpApplicationType | 'all';
  sortBy?: 'submitted_at' | 'full_name' | 'application_status' | 'reference_number' | 'days_remaining';
  sortOrder?: 'asc' | 'desc';
}

export const fetchAdminApplications = async (
  params: FetchAdminApplicationsParams
): Promise<{ applicants: IlpApplicantRecord[] }> => {
  const query = new URLSearchParams();

  if (params.search) {
    query.set('search', params.search);
  }

  if (params.status) {
    query.set('status', params.status);
  }

  if (params.type) {
    query.set('type', params.type);
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }

  if (params.sortOrder) {
    query.set('sortOrder', params.sortOrder);
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/applications?${query.toString()}`, {
    method: 'GET',
    headers: buildHeaders(params.token)
  });

  return handleResponse<{ applicants: IlpApplicantRecord[] }>(response);
};

export const updateApplicantStatus = async (
  token: string,
  applicationType: IlpApplicationType,
  id: number,
  status: IlpApplicationStatus
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationType}/${id}/status`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify({ status })
  });

  await handleResponse<{ application: unknown }>(response);
};

export interface ClearAdminApplicationsResponse {
  success: boolean;
  totalDeleted: number;
  deletedCounts: Record<IlpApplicationType, number>;
}

export const clearAdminApplications = async (token: string): Promise<ClearAdminApplicationsResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications`, {
    method: 'DELETE',
    headers: buildHeaders(token)
  });

  return handleResponse<ClearAdminApplicationsResponse>(response);
};

export const fetchApplicationByReference = async (
  referenceNumber: string
): Promise<{ application: IlpApplicantRecord }> => {
  const response = await fetch(`${API_BASE_URL}/api/public/application/${referenceNumber}`, {
    method: 'GET',
    headers: buildHeaders()
  });

  return handleResponse<{ application: IlpApplicantRecord }>(response);
};
