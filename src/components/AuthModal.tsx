'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
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
}

type AuthTab = 'login' | 'register' | 'forgot';

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
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
      setError('Please fill in both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Logged in successfully! Synchronizing your data...');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } else {
      setError(res.message || 'Login failed. Please verify your credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await register(email, password, name);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Account created successfully! Synchronizing your cloud vault...');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } else {
      setError(res.message || 'Registration failed.');
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email.');
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
      setError(res.message || 'No account found with this email.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword) {
      setError('Please enter the verification code and new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await resetPassword(email, resetCode, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Password updated successfully! You can now log in.');
      setTimeout(() => {
        setTab('login');
        setPassword('');
        resetForm();
      }, 1500);
    } else {
      setError(res.message || 'Failed to reset password. Check your verification code.');
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
                  Cross-Device
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Sync seamless data across Android, iOS, & Web
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
            Sign In
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
            Create Account
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-emerald)] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot')}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  Forgot Password?
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
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Sign In & Sync Vault</span>
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
                Your Name (Optional)
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
                    placeholder="Min 6 chars"
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
                  Confirm
                </label>
                <div className="relative flex items-center">
                  <ShieldCheck className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start Syncing</span>
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
              <span>Password Recovery</span>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-3">
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Enter the email associated with your account. A 6-digit verification code will be generated to reset your password.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Account Email
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
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Send Code</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    6-Digit Verification Code
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
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
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
                    Resend Code
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Save Password</span>
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
