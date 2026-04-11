const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const postForm = async <T = unknown>(path: string, payload: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Request failed');
  }

  return response.json() as Promise<T>;
};
