import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, KeyRound, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiClient from '../api/client.js';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

/**
 * Forgot / reset password flow.
 * 1. request - POST /auth/forgot-password
 * 2. reset   - POST /auth/reset-password with the token
 * In development the API returns the token directly (no email service yet).
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // request | reset
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email });
      if (data.data?.resetToken) {
        setToken(data.data.resetToken);
        setInfo('Development mode: your reset token is pre-filled below. In production it is emailed to you.');
        setStep('reset');
      } else {
        setInfo(data.message);
        setStep('reset'); // user may already have the token from email
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      setError(
        fieldErrors?.map((f) => f.message).join(' ') ||
          err.response?.data?.message ||
          'Reset failed. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-purple-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-xl shadow-purple-900/40">
            <GraduationCap size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-300">
            {step === 'request'
              ? "Enter your account's email address"
              : 'Enter the reset token and your new password'}
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <h2 className="mt-3 text-lg font-bold text-navy-900">Password updated</h2>
              <p className="mt-1 text-sm text-slate-500">Redirecting you to login...</p>
            </div>
          ) : step === 'request' ? (
            <form onSubmit={requestReset} className="space-y-4" noValidate>
              {error && (
                <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
              <Input
                label="Email address"
                type="email"
                name="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" size="lg" loading={busy}>
                <KeyRound size={17} /> Send reset token
              </Button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4" noValidate>
              {error && (
                <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-lg bg-purple-50 p-3 text-xs text-purple-700">{info}</p>
              )}
              <Input
                label="Reset token"
                name="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your reset token"
                required
              />
              <Input
                label="New password"
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <Button type="submit" className="w-full" size="lg" loading={busy}>
                Reset password
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft size={15} /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
