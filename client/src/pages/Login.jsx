import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo1@ivy.homes');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function describe(err) {
    if (err?.response) return err.response.data?.error || 'Invalid email or password.';
    return 'Cannot reach the server. Make sure the backend is running on port 4000.';
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/listings');
    } catch (err) {
      setError(describe(err));
    } finally {
      setLoading(false);
    }
  }

  async function onDemo() {
    setError('');
    setLoading(true);
    try {
      await demoLogin(email.trim() || 'demo1@ivy.homes');
      navigate('/listings');
    } catch (err) {
      setError(describe(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-emerald-700">Ivy Homes</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Sign in to browse properties</p>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="relative py-1 text-center">
            <span className="bg-white px-2 text-xs text-slate-400">or</span>
          </div>

          <button
            type="button"
            onClick={onDemo}
            disabled={loading}
            className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Use demo account ({email || 'demo1@ivy.homes'})
          </button>

          <p className="text-center text-xs text-slate-400">
            Demo users: demo1 / demo2 / demo3 @ivy.homes — the password is kept on the server.
          </p>
        </form>
      </div>
    </div>
  );
}
