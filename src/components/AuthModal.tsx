'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { Language } from '@/types/finance';
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
    login,
    register,
    forgotPassword,
    resetPassword,
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
        setSuccessMsg(`OTP Code generated: ${res.resetCode}. Enter code & new password below.`);
      } else {
        setSuccessMsg(res.message || 'Verification code sent to your email.');
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
      setSuccessMsg(isJa ? "パスワードを更新しました！ログインできます。" : "Password updated successfully! You can now log in.");
      setTimeout(() => {
        setTab('login');
        setPassword('');
        resetForm();
      }, 1500);
    } else {
      setError(res.message || (isJa ? "パスワードの再設定に失敗しました。認証コードを確認してください。" : "Failed to reset password. Check your verification code."));
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] p-6 sm:p-7 shadow-2xl relative overflow-hidden cursor-default"
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
                  {isJa ? "マルチ端末対応" : "Cross-Device"}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isJa ? "Android、iOS、Web間でデータをシームレスに同期" : "Sync seamless data across Android, iOS, & Web"}
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

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center space-x-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center space-x-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        {/* FORM 1: LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5 relative z-10">
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
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {isJa ? "パスワード" : "Password"}
                </label>
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot')}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  {isJa ? "パスワードをお忘れですか？" : "Forgot Password?"}
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
                  title={showPassword ? (isJa ? "パスワードを非表示" : "Hide password") : (isJa ? "パスワードを表示" : "Show password")}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isJa ? "接続中..." : "Connecting..."}</span>
                </>
              ) : (
                <>
                  <span>{isJa ? "ログインしてクラウド同期" : "Sign In & Sync Vault"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM 2: REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3 relative z-10">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {isJa ? "お名前（任意）" : "Your Name (Optional)"}
              </label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isJa ? "6文字以上" : "Min 6 chars"}
                    required
                    className="w-full pl-10 pr-8 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  {isJa ? "確認" : "Confirm"}
                </label>
                <div className="relative flex items-center">
                  <ShieldCheck className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={isJa ? "再入力" : "Repeat"}
                    required
                    className="w-full pl-10 pr-8 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-1 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isJa ? "アカウント作成中..." : "Creating Account..."}</span>
                </>
              ) : (
                <>
                  <span>{isJa ? "アカウント作成して同期を開始" : "Create Account & Start Syncing"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM 3: FORGOT PASSWORD */}
        {tab === 'forgot' && (
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-1">
              <KeyRound className="w-4 h-4" />
              <span>{isJa ? "パスワードの再設定" : "Password Recovery"}</span>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-3">
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {isJa ? "アカウントに登録されたメールアドレスを入力してください。パスワード再設定用の6桁の認証コードが送信されます。" : "Enter the email associated with your account. A 6-digit verification code will be generated to reset your password."}
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {isJa ? "登録メールアドレス" : "Account Email"}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    {isJa ? "ログインに戻る" : "Back to Login"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isJa ? "認証コードを送信" : "Send Code"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {isJa ? "6桁の認証コード" : "6-Digit Verification Code"}
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-sm tracking-widest text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    {isJa ? "新しいパスワード" : "New Password"}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    {isJa ? "コードを再送" : "Resend Code"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isJa ? "新しいパスワードを保存" : "Save Password"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
