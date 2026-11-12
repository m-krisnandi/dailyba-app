// Client API for Dailyba Cloud Sync & Authentication
// Fully supports offline-first, mobile (iOS/Android Capacitor), and Web deployment.

import { EmailSyncStatus, FinanceState, PendingImportItem } from '@/types/finance';

const DEFAULT_SERVER_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://dailyba.pdfumi.com';

export const AUTH_TOKEN_KEY = 'dailyba_auth_token';
export const AUTH_USER_KEY = 'dailyba_auth_user';
export const API_URL_KEY = 'dailyba_api_url';
export const LAST_SYNCED_KEY = 'dailyba_last_synced';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  user?: AuthUser;
  token?: string;
  data?: T;
  hasData?: boolean;
  version?: number;
  syncedAt?: string;
  resetCode?: string;
  authUrl?: string;
  items?: PendingImportItem[];
  approvedItem?: PendingImportItem;
  approvedItems?: PendingImportItem[];
  stagedItem?: PendingImportItem;
  parsed?: any;
  importedCount?: number;
  duplicateCount?: number;
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;
  try {
    const saved = localStorage.getItem(API_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return DEFAULT_SERVER_URL;
}

export function setApiBaseUrl(url: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(API_URL_KEY, url.trim());
  } catch {
    // ignore
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // ignore
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  const url = `${cleanBase}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    const isConnRefused = err?.message?.includes('fetch') || err?.name === 'TypeError';
    return {
      success: false,
      message: isConnRefused
        ? `Server Dailyba (${cleanBase}) is not reachable. Ensure the server is running.`
        : err.message || 'Cannot reach Dailyba server.',
    };
  }
}

export const dailybaApi = {
  // Auth endpoints
  async register(email: string, password: string, name?: string): Promise<ApiResponse> {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (res.success && res.token && res.user) {
      setStoredToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async login(email: string, password: string): Promise<ApiResponse> {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.token && res.user) {
      setStoredToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    return await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<ApiResponse> {
    return await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  // Cloud Sync endpoints
  async fetchCloudSync(): Promise<ApiResponse<FinanceState>> {
    return await request<FinanceState>('/api/sync', {
      method: 'GET',
    });
  },

  async pushCloudSync(state: FinanceState): Promise<ApiResponse> {
    return await request('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  },

  async deleteAccount(): Promise<ApiResponse> {
    const res = await request('/api/auth/account', {
      method: 'DELETE',
    });
    if (res.success) {
      setStoredToken(null);
      setStoredUser(null);
    }
    return res;
  },

  // Email & Bank Sync endpoints
  async getEmailSyncStatus(): Promise<ApiResponse<EmailSyncStatus>> {
    return await request<EmailSyncStatus>('/api/email-sync/status', {
      method: 'GET',
    });
  },

  async getGoogleAuthUrl(): Promise<ApiResponse<{ authUrl: string }>> {
    return await request('/api/email-sync/google-auth-url', {
      method: 'GET',
    });
  },

  async disconnectGoogle(): Promise<ApiResponse> {
    return await request('/api/email-sync/disconnect', {
      method: 'POST',
    });
  },

  async triggerEmailSync(): Promise<ApiResponse> {
    return await request('/api/email-sync/sync', {
      method: 'POST',
    });
  },

  async parseRawEmail(payload: {
    text?: string;
    subject?: string;
    from?: string;
    date?: string;
    save?: boolean;
  }): Promise<ApiResponse> {
    return await request('/api/email-sync/parse-raw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPendingImports(): Promise<ApiResponse<{ items: PendingImportItem[] }>> {
    return await request('/api/email-sync/pending', {
      method: 'GET',
    });
  },

  async approveImport(payload: {
    id?: string;
    all?: boolean;
    updates?: Partial<PendingImportItem>;
  }): Promise<ApiResponse> {
    return await request('/api/email-sync/approve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async rejectImport(payload: { id?: string; all?: boolean }): Promise<ApiResponse> {
    return await request('/api/email-sync/reject', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async clearProcessedImports(): Promise<ApiResponse> {
    return await request('/api/email-sync/clear', {
      method: 'DELETE',
    });
  },

  logout() {
    setStoredToken(null);
    setStoredUser(null);
  },
};
