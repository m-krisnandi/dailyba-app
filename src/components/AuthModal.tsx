'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { Language } from '@/types/finance';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { LegalModal } from './LegalModal';
import { getGeminiApiKey, setGeminiApiKey, getDefaultGeminiKey } from '@/lib/geminiScanner';
import {
  Mail,
  Lock,
  User as UserIcon,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cloud,
  ShieldCheck,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  Sparkles,
  Server,
  RefreshCw,
  FileText,
  Shield,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  language?: Language;
}

type AuthTab = 'login' | 'register' | 'forgot';

export function AuthModal({ isOpen, onClose, onSuccess, language = 'en' }: AuthModalProps) {
  const isJa = language === 'ja';
  useBodyScrollLock(isOpen);

  const {
    user,
    isAuthenticated,
    syncStatus,
    lastSyncedAt,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    deleteAccount,
    serverUrl,
    setServerUrl,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password OTP step
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Server URL editor state
  const [isEditingServer, setIsEditingServer] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(serverUrl);

  // Gemini API key state
  const [geminiKeyInput, setGeminiKeyInput] = useState(getGeminiApiKey());
  const [isEditingGeminiKey, setIsEditingGeminiKey] = useState(false);

  // Modals
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    resetForm();
    if (newTab === 'forgot') setForgotStep(1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isJa ? "メールアドレスとパスワードを入力してください。" : "Please fill in both email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(isJa ? "ログインしました！クラウドデータを同期しています..." : "Logged in successfully! Synchronizing your data...");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } else {
      setError(res.message || (isJa ? "ログインに失敗しました。認証情報を確認してください。" : "Login failed. Please verify your credentials."));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isJa ? "必須項目をすべて入力してください。" : "Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError(isJa ? "パスワードは6文字以上で設定してください。" : "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError(isJa ? "パスワードが一致しません。" : "Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await register(email, password, name);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(isJa ? "アカウントを作成しました！クラウド同期を開始します..." : "Account created successfully! Synchronizing your cloud vault...");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } else {
      setError(res.message || (isJa ? "アカウント作成に失敗しました。" : "Registration failed."));
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(isJa ? "登録メールアドレスを入力してください。" : "Please enter your account email.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await forgotPassword(email);
    setLoading(false);

    if (res.success) {
      setForgotStep(2);
      if (res.resetCode) {
        setResetCode(res.resetCode);
        setSuccessMsg(isJa ? `認証コードを発行しました: ${res.resetCode}。新しいパスワードを設定してください。` : `OTP Code generated: ${res.resetCode}. Enter code & new password below.`);
      } else {
        setSuccessMsg(res.message || (isJa ? "認証コードをメールに送信しました。" : "Verification code sent to your email."));
      }
    } else {
      setError(res.message || (isJa ? "このメールアドレスのアカウントは見つかりませんでした。" : "No account found with this email."));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword) {
      setError(isJa ? "認証コードと新しいパスワードを入力してください。" : "Please enter the verification code and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError(isJa ? "新しいパスワードは6文字以上で設定してください。" : "New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await resetPassword(email, resetCode, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || (isJa ? "パスワードが正常に更新されました！ログインしてください。" : "Password reset successfully! Please sign in."));
      setTimeout(() => {
        setTab('login');
        resetForm();
      }, 1500);
    } else {
      setError(res.message || (isJa ? "認証コードが無効または有効期限切れです。" : "Invalid or expired verification code."));
    }
  };

  const handleDeleteAccountConfirm = async () => {
    setLoading(true);
    setError(null);
    const res = await deleteAccount();
    setLoading(false);
    setIsConfirmDeleteOpen(false);

    if (res.success) {
      setSuccessMsg(isJa ? "アカウントおよびクラウドデータを完全に削除しました。" : "Your account and cloud data have been permanently deleted.");
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError(res.message || (isJa ? "アカウント削除に失敗しました。" : "Failed to delete account."));
    }
  };

  const handleSaveGeminiKey = () => {
    setGeminiApiKey(geminiKeyInput.trim() || getDefaultGeminiKey());
    setIsEditingGeminiKey(false);
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] p-6 sm:p-7 shadow-2xl relative overflow-hidden cursor-default max-h-[92vh] overflow-y-auto"
        >
          {/* Ambient Top Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

          {/* Header Bar */}
          <div className="flex items-start justify-between mb-5 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)] tracking-tight flex items-center space-x-2">
                  <span>Dailyba Cloud</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {isAuthenticated ? (isJa ? "接続中" : "Connected") : (isJa ? "マルチ端末対応" : "Cross-Device")}
                  </span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {isAuthenticated
                    ? (isJa ? "アカウント設定・同期ステータス" : "Account Profile & Cloud Sync")
                    : (isJa ? "Android、iOS、Web間でデータをシームレスに同期" : "Sync seamless data across Android, iOS, & Web")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 animate-fade-in relative z-10">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 animate-fade-in relative z-10">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* =============================================================== */}
          {/* LOGGED IN VIEW: Profile, Server, Gemini AI & Delete Account      */}
          {/* =============================================================== */}
          {isAuthenticated && user ? (
            <div className="space-y-4 relative z-10">
              {/* User Profile Card */}
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                    {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[var(--text-main)] truncate">
                      {user.name || 'Dailyba Member'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider block">
                      {isJa ? '同期状態' : 'Sync Status'}
                    </span>
                    <span className="font-semibold text-emerald-500 flex items-center space-x-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{syncStatus === 'synced' ? (isJa ? '最新状態' : 'Up to date') : syncStatus}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider block">
                      {isJa ? '最終同期' : 'Last Synced'}
                    </span>
                    <span className="font-mono text-[var(--text-muted)] mt-0.5 block truncate">
                      {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : (isJa ? '未同期' : 'Pending')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Server URL Config */}
              <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isJa ? '同期サーバー URL' : 'Cloud Server URL'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingServer) {
                        setServerUrl(serverUrlInput.trim());
                        setIsEditingServer(false);
                      } else {
                        setIsEditingServer(true);
                      }
                    }}
                    className="text-[11px] font-bold text-blue-400 hover:underline cursor-pointer"
                  >
                    {isEditingServer ? (isJa ? '保存' : 'Save') : (isJa ? '変更' : 'Edit')}
                  </button>
                </div>
                {isEditingServer ? (
                  <input
                    type="text"
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                    className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] outline-none"
                  />
                ) : (
                  <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                    {serverUrl}
                  </p>
                )}
              </div>

              {/* Gemini AI OCR Settings */}
              <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isJa ? 'レシートAI (Gemini) 設定' : 'AI Receipt Scanner (Gemini)'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingGeminiKey) {
                        handleSaveGeminiKey();
                      } else {
                        setIsEditingGeminiKey(true);
                      }
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isEditingGeminiKey ? (isJa ? '保存' : 'Save') : (isJa ? 'カスタムKey' : 'Customize')}
                  </button>
                </div>
                {isEditingGeminiKey ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="Enter Gemini API Key..."
                      className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] outline-none"
                    />
                    <div className="flex justify-between items-center text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setGeminiKeyInput(getDefaultGeminiKey());
                          setGeminiApiKey(getDefaultGeminiKey());
                          setIsEditingGeminiKey(false);
                        }}
                        className="text-[var(--text-muted)] hover:underline cursor-pointer"
                      >
                        {isJa ? 'デフォルトKeyに戻す' : 'Reset to Default Key'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    API Key: {geminiKeyInput.slice(0, 10)}••••••••••••••••{geminiKeyInput.slice(-4)} (Active)
                  </p>
                )}
              </div>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isJa ? "ログアウト" : "Sign Out"}</span>
              </button>

              {/* DANGER ZONE: DELETE ACCOUNT (Apple App Store & Google Play Requirement) */}
              <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3">
                <div className="flex items-start space-x-2">
                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-500">
                      {isJa ? "危険ゾーン: アカウントの完全削除" : "Danger Zone: Permanent Account Deletion"}
                    </h4>
                    <p className="text-[11px] text-rose-500/80 leading-relaxed mt-0.5">
                      {isJa
                        ? "アカウントおよびサーバー上のすべてのバックアップデータが直ちに永久削除されます。この操作は取り消せません。"
                        : "Permanently deletes your account credentials and wipes all cloud backups from the server. This action cannot be reversed."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isJa ? "アカウントを完全に削除" : "Delete My Account & Cloud Data"}</span>
                </button>
              </div>

              {/* Legal & Compliance Links */}
              <div className="pt-2 flex items-center justify-center space-x-4 text-[11px] text-[var(--text-faint)]">
                <button
                  type="button"
                  onClick={() => {
                    setLegalTab('privacy');
                    setIsLegalModalOpen(true);
                  }}
                  className="hover:text-[var(--text-muted)] hover:underline cursor-pointer"
                >
                  {isJa ? 'プライバシーポリシー' : 'Privacy Policy'}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setLegalTab('terms');
                    setIsLegalModalOpen(true);
                  }}
                  className="hover:text-[var(--text-muted)] hover:underline cursor-pointer"
                >
                  {isJa ? '利用規約' : 'Terms of Service'}
                </button>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* LOGGED OUT VIEW: Login / Register / Forgot Password Tabs         */
            /* =============================================================== */
            <>
              {/* Tab Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] mb-5 relative z-10">
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    tab === 'login'
                      ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {isJa ? "ログイン" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    tab === 'register'
                      ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {isJa ? "新規登録" : "Create Account"}
                </button>
              </div>

              {/* LOGIN TAB */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {isJa ? "メールアドレス" : "Email Address"}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {isJa ? "パスワード" : "Password"}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleTabChange('forgot')}
                        className="text-[11px] font-medium text-emerald-400 hover:underline cursor-pointer"
                      >
                        {isJa ? "パスワードを忘れた方" : "Forgot Password?"}
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-1 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>{isJa ? "ログイン" : "Sign In to Cloud"}</span>
                  </button>
                </form>
              )}

              {/* REGISTER TAB */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3 relative z-10">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {isJa ? "お名前 (任意)" : "Your Name (Optional)"}
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isJa ? "例: 山田 太郎" : "e.g. John Doe"}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {isJa ? "メールアドレス" : "Email Address"}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {isJa ? "パスワード" : "Password"}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isJa ? "6文字以上" : "At least 6 characters"}
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-1 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {isJa ? "パスワード (確認)" : "Confirm Password"}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={isJa ? "もう一度入力" : "Repeat password"}
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-1 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isJa ? "アカウント作成 & 同期開始" : "Create Account & Start Sync"}</span>
                  </button>
                </form>
              )}

              {/* FORGOT PASSWORD TAB */}
              {tab === 'forgot' && (
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                    <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isJa ? "パスワードの再設定" : "Reset Password"}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleTabChange('login')}
                      className="text-[11px] text-[var(--text-muted)] hover:underline cursor-pointer"
                    >
                      {isJa ? "ログインに戻る" : "Back to Sign In"}
                    </button>
                  </div>

                  {forgotStep === 1 ? (
                    <form onSubmit={handleRequestResetCode} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                          {isJa ? "ご登録メールアドレス" : "Registered Email"}
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>{isJa ? "認証コードを発行" : "Generate Verification Code"}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                          {isJa ? "6桁の認証コード" : "6-Digit Code"}
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          placeholder="123456"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm tracking-widest text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                          {isJa ? "新しいパスワード" : "New Password"}
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={isJa ? "6文字以上" : "At least 6 characters"}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>{isJa ? "パスワードを更新" : "Update Password"}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Legal Note for Google Play & App Store Compliance */}
              <div className="pt-3 border-t border-[var(--border-subtle)] text-center text-[11px] text-[var(--text-faint)] relative z-10 space-y-1">
                <p>
                  {isJa
                    ? '登録・ログインにより、Dailyba の利用規約およびプライバシーポリシーに同意したものとみなされます。'
                    : 'By signing up or logging in, you agree to Dailyba Terms & Privacy Policy.'}
                </p>
                <div className="flex items-center justify-center space-x-3 text-emerald-400">
                  <button
                    type="button"
                    onClick={() => {
                      setLegalTab('privacy');
                      setIsLegalModalOpen(true);
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    {isJa ? 'プライバシーポリシー' : 'Privacy Policy'}
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLegalTab('terms');
                      setIsLegalModalOpen(true);
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    {isJa ? '利用規約' : 'Terms of Service'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        title={isJa ? "アカウントおよびクラウドデータの完全削除" : "Permanently Delete Account & Cloud Vault"}
        description={
          isJa
            ? "このアカウントと、Dailyba サーバー上のすべての同期データ・バックアップが永久に削除されます。端末内のデータは残りますが、復元はできません。本当に削除しますか？"
            : "Your account credentials and all synchronized cloud backups will be permanently purged from the server. Local offline data remains on device. Are you sure you wish to proceed?"
        }
        confirmLabel={isJa ? "アカウントを完全削除" : "Delete My Account"}
        language={language}
        onConfirm={handleDeleteAccountConfirm}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />

      {/* Legal & Compliance Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        language={language}
        initialTab={legalTab}
      />
    </>
  );
}
