import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import { ROLE_HOME } from '../utils/constants.js';

/**
 * Login page - Phase 3: authenticates against POST /api/auth/login
 * and redirects to the user's own dashboard by role.
 */
export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already signed in? Go straight to your dashboard
  if (loading) return <PageLoader label="Checking your session..." />;
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const loggedIn = await login(form.email, form.password);
      const from = location.state?.from?.pathname;
      navigate(from || ROLE_HOME[loggedIn.role] || '/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.code === 'ERR_NETWORK'
            ? 'Cannot reach the server. Is the backend running?'
            : 'Login failed. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-purple-900 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-xl shadow-purple-900/40">
            <GraduationCap size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">Smart College Attendance</h1>
          <p className="mt-1 text-sm text-slate-300">Sign in to manage attendance digitally</p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {error && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              name="email"
              placeholder="you@college.edu"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-purple-600" />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-medium text-purple-600 hover:text-purple-700">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Sign in
            </Button>
          </form>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-purple-50 p-3 text-xs text-purple-700">
            <Info size={15} className="mt-0.5 shrink-0" />
            Default admin (after <code className="font-semibold">npm run seed</code>):{' '}
            <strong>admin@college.edu</strong> / <strong>Admin@123</strong>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Smart College Attendance
        </p>
      </div>
    </div>
  );
}
