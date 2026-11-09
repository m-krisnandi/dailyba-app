'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  AuthUser,
  dailybaApi,
  getApiBaseUrl,
  setApiBaseUrl,
  getStoredToken,
  getStoredUser,
  LAST_SYNCED_KEY,
} from './api';
import { FinanceState } from '@/types/finance';

export type SyncStatus = 'synced' | 'syncing' | 'idle' | 'offline' | 'error';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, pass: string, name?: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; resetCode?: string }>;
  resetPassword: (email: string, code: string, newPass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
  pushStateToCloud: (state: FinanceState) => Promise<boolean>;
  pullStateFromCloud: () => Promise<FinanceState | null>;
  setSyncStatus: (status: SyncStatus) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [serverUrl, setServerUrlState] = useState<string>(getApiBaseUrl());
  const debounceSyncTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setSyncStatus('synced');
    }
    try {
      const savedSync = localStorage.getItem(LAST_SYNCED_KEY);
      if (savedSync) setLastSyncedAt(savedSync);
    } catch {
      // ignore
    }
  }, []);

  const handleSetServerUrl = (url: string) => {
    setApiBaseUrl(url);
    setServerUrlState(url);
  };

  const login = async (email: string, pass: string) => {
    setSyncStatus('syncing');
    const res = await dailybaApi.login(email, pass);
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      setSyncStatus('synced');
      return { success: true, message: res.message };
    }
    setSyncStatus('idle');
    return { success: false, message: res.message || 'Login failed' };
  };

  const register = async (email: string, pass: string, name?: string) => {
    setSyncStatus('syncing');
    const res = await dailybaApi.register(email, pass, name);
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      setSyncStatus('synced');
      return { success: true, message: res.message };
    }
    setSyncStatus('idle');
    return { success: false, message: res.message || 'Registration failed' };
  };

  const forgotPassword = async (email: string) => {
    return await dailybaApi.forgotPassword(email);
  };

  const resetPassword = async (email: string, code: string, newPass: string) => {
    return await dailybaApi.resetPassword(email, code, newPass);
  };

  const deleteAccount = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await dailybaApi.deleteAccount();
      if (res.success) {
        setToken(null);
        setUser(null);
        setSyncStatus('idle');
        setLastSyncedAt(null);
        try {
          localStorage.removeItem(LAST_SYNCED_KEY);
        } catch {}
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete account' };
    }
  };

  const logout = () => {
    dailybaApi.logout();
    setToken(null);
    setUser(null);
    setSyncStatus('idle');
  };

  const pullStateFromCloud = useCallback(async (): Promise<FinanceState | null> => {
    const curToken = getStoredToken();
    if (!curToken) return null;
    try {
      setSyncStatus('syncing');
      const res = await dailybaApi.fetchCloudSync();
      if (res.success && res.hasData && res.data) {
        setSyncStatus('synced');
        if (res.syncedAt) {
          setLastSyncedAt(res.syncedAt);
          try {
            localStorage.setItem(LAST_SYNCED_KEY, res.syncedAt);
          } catch {}
        }
        return res.data;
      }
      setSyncStatus('synced');
      return null;
    } catch {
      setSyncStatus('error');
      return null;
    }
  }, []);

  const pushStateToCloud = useCallback(async (state: FinanceState): Promise<boolean> => {
    const curToken = getStoredToken();
    if (!curToken) return false;

    // Debounce pushing to cloud by 1000ms
    return new Promise((resolve) => {
      if (debounceSyncTimer.current) {
        clearTimeout(debounceSyncTimer.current);
      }

      debounceSyncTimer.current = setTimeout(async () => {
        try {
          setSyncStatus('syncing');
          const res = await dailybaApi.pushCloudSync(state);
          if (res.success) {
            setSyncStatus('synced');
            const now = res.syncedAt || new Date().toISOString();
            setLastSyncedAt(now);
            try {
              localStorage.setItem(LAST_SYNCED_KEY, now);
            } catch {}
            resolve(true);
          } else {
            setSyncStatus('error');
            resolve(false);
          }
        } catch {
          setSyncStatus('offline');
          resolve(false);
        }
      }, 1000);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        syncStatus,
        lastSyncedAt,
        serverUrl,
        setServerUrl: handleSetServerUrl,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        deleteAccount,
        pushStateToCloud,
        pullStateFromCloud,
        setSyncStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
