export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const apiFetch = (path: string, options: RequestInit = {}) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${API_BASE_URL}${normalizedPath}`, options);
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const clearSession = () => {
  localStorage.removeItem('pharmacy_token');
  localStorage.removeItem('pharmacy_user');
};

interface ApiOptions {
  method?: string;
  body?: unknown;
}

/**
 * JSON helper: adds the auth token, parses the response and throws ApiError with the
 * server's message (e.g. "Insufficient stock for Aspirin") so the UI can show it.
 */
export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = localStorage.getItem('pharmacy_token');
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await apiFetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. It may be waking up - please try again in a moment.', 0);
  }

  if (response.status === 401 || response.status === 403) {
    // Token missing/expired: go back to the login screen.
    clearSession();
    window.location.href = '/';
    throw new ApiError('Your session expired. Please sign in again.', response.status);
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = (data && typeof data === 'object' && data.message) || `Request failed (${response.status})`;
    throw new ApiError(String(message), response.status);
  }

  return data as T;
}
