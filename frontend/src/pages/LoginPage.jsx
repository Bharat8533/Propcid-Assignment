import React, { useState } from 'react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.login(email, password);
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center rounded font-bold text-sm">
              ED
            </div>
            <span className="font-bold text-slate-900 text-xl tracking-tight">EstateDesk</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">Staff Portal Sign In</h1>
          <p className="text-xs text-slate-500 mt-1">Builder &amp; Broker Compliance Registration Platform</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 text-xs font-medium mb-4">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="staff-email">
              Email Address
            </label>
            <input
              id="staff-email"
              type="email"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              placeholder="name@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="staff-password">
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
