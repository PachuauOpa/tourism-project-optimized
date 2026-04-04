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

export interface SponsorLoginResponse {
  token: string;
  sponsor: {
    id: number;
    fullName: string;
    mobileNo: string;
  };
}

export interface SponsorLogRecord {
  id: number;
  applicant_name: string;
  pass_no: string;
  valid_from: string;
  valid_to: string;
  status: string;
  promotion_type: 'fresh' | 'renewal';
  temporary_reference_number: string;
  submitted_at: string;
}

export const registerSponsor = async (payload: {
  fullName: string;
  email: string;
  mobileNo: string;
  password: string;
}): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/sponsor/register`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  return handleResponse<{ message: string }>(response);
};

export const loginSponsor = async (payload: {
  phoneNumber: string;
  password: string;
}): Promise<SponsorLoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/sponsor/login`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  return handleResponse<SponsorLoginResponse>(response);
};

export const logoutSponsor = async (token: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/api/sponsor/logout`, {
    method: 'POST',
    headers: buildHeaders(token)
  });

  return handleResponse<{ success: boolean }>(response);
};

export const fetchSponsorLogs = async (token: string): Promise<{ logs: SponsorLogRecord[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/sponsor/regular-ilp-logs`, {
    method: 'GET',
    headers: buildHeaders(token)
  });

  return handleResponse<{ logs: SponsorLogRecord[] }>(response);
};

export const promoteToRegularIlp = async (
  token: string,
  payload: {
    promotionType: 'fresh' | 'renewal';
    temporaryReferenceNumber: string;
    validityOption: '6_months' | '1_year' | '2_years';
  }
): Promise<{ message: string; log: SponsorLogRecord }> => {
  const response = await fetch(`${API_BASE_URL}/api/sponsor/regular-ilp/promote`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload)
  });

  return handleResponse<{ message: string; log: SponsorLogRecord }>(response);
};

// ---------------------------------------------------------------------------
// Payment API
// ---------------------------------------------------------------------------

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaymentStatusResponse {
  paymentStatus: 'not_initiated' | 'created' | 'paid' | 'failed';
  paidAt?: string;
  keyId: string;
}

export const createPaymentOrder = async (payload: {
  referenceNumber: string;
  applicationType: string;
}): Promise<PaymentOrderResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  return handleResponse<PaymentOrderResponse>(response);
};

export const verifyPayment = async (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  referenceNumber: string;
  applicationType: string;
}): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/verify-payment`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  return handleResponse<{ success: boolean; message: string }>(response);
};

export const fetchPaymentStatus = async (referenceNumber: string): Promise<PaymentStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/status/${referenceNumber}`, {
    method: 'GET',
    headers: buildHeaders()
  });

  return handleResponse<PaymentStatusResponse>(response);
};
