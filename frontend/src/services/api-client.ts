import { tokenStorage } from './token-storage';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  retryOnUnauthorized?: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth = false, retryOnUnauthorized = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set('Accept', 'application/json');
  if (requestOptions.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const accessToken = tokenStorage.getAccessToken();
  if (!skipAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${apiBaseUrl}${path}`, { ...requestOptions, headers });
  if (response.status === 401 && !skipAuth && retryOnUnauthorized && tokenStorage.getRefreshToken()) {
    if (await refreshTokens()) return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(message ?? `API trả về lỗi ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const getJson = <T>(path: string) => apiRequest<T>(path);
export const postJson = <T>(path: string, data?: unknown, skipAuth = false) =>
  apiRequest<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data), skipAuth });
export const patchJson = <T>(path: string, data?: unknown) =>
  apiRequest<T>(path, { method: 'PATCH', body: data === undefined ? undefined : JSON.stringify(data) });
export const putJson = <T>(path: string, data?: unknown) =>
  apiRequest<T>(path, { method: 'PUT', body: data === undefined ? undefined : JSON.stringify(data) });
export const deleteJson = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenStorage.getRefreshToken() }),
    });
    if (!response.ok) throw new Error('Refresh failed');
    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    tokenStorage.clear();
    return false;
  }
}

