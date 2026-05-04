import {
  AuthSessionSchema,
  type AuthSession,
  type SendOtpResponse,
} from '@sallim/shared';
import { API_URL } from './env.js';
import { clearTokens, loadTokens, saveTokens } from './secure-storage.js';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.auth) {
    const { access } = await loadTokens();
    if (access) headers['Authorization'] = `Bearer ${access}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, text || res.statusText);
  }
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export const authApi = {
  sendOtp: (phone: string): Promise<SendOtpResponse> =>
    request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: async (phone: string, code: string): Promise<AuthSession> => {
    const raw = await request<unknown>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    const session = AuthSessionSchema.parse(raw);
    await saveTokens(session.accessToken, session.refreshToken);
    return session;
  },

  refresh: async (): Promise<AuthSession | null> => {
    const { refresh } = await loadTokens();
    if (!refresh) return null;
    try {
      const raw = await request<unknown>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const session = AuthSessionSchema.parse(raw);
      await saveTokens(session.accessToken, session.refreshToken);
      return session;
    } catch {
      await clearTokens();
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await clearTokens();
  },
};

export interface MeResponse {
  id: string;
  phone: string | null;
  name: string | null;
  locale: string;
  defaultHouseholdId: string | null;
}

export const userApi = {
  me: (): Promise<MeResponse> => request('/me', { auth: true }),
};
