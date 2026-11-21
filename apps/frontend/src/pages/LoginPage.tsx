import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Eye, EyeOff, Package2, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

const highlights = [
  { icon: Activity, text: 'Live stock, sales and purchasing in one view' },
  { icon: BarChart3, text: 'Low-stock and expiry alerts before they cost you' },
  { icon: ShieldCheck, text: 'Secure, role-based access to pharmacy data' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();
      localStorage.setItem('pharmacy_token', data.token);
      localStorage.setItem('pharmacy_user', JSON.stringify({ name: data.name, role: data.role }));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the server. On the free plan it can take up to a minute to wake up - please try again.'
          : err instanceof Error
            ? err.message
            : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    signIn(email, password);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500 p-2.5 shadow-lg shadow-emerald-500/30">
            <Package2 className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold">PharmaFlow</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">Run your pharmacy with real-time clarity.</h1>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-300">
                <span className="rounded-lg bg-white/10 p-2 text-emerald-300">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-slate-400">Inventory · Purchasing · Billing</p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-emerald-500 p-2 text-white">
              <Package2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">PharmaFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your pharmacy.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="admin@pharmacy.local" autoComplete="username" required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="input pr-10" placeholder="Password" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p> : null}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Demo access</p>
            <p className="mt-1 text-slate-500">admin@pharmacy.local · Admin@123</p>
            <button type="button" disabled={loading} onClick={() => signIn('admin@pharmacy.local', 'Admin@123')} className="btn-secondary mt-3 w-full">
              Sign in as demo admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
