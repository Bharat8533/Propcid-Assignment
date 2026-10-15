import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight } from 'lucide-react';
import { DEMO_STAFF_USERS } from '../constants/indianData';
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

  const handleQuickLogin = async (staff) => {
    setEmail(staff.email);
    setPassword(staff.password);
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.login(staff.email, staff.password);
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl inline-flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
            <Building2 size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">EstateDesk Staff Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Builder &amp; Broker Registration Module</p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-xs font-medium mb-4 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1" htmlFor="staff-email">
                Staff Email Address
              </label>
              <div className="relative">
                <input
                  id="staff-email"
                  type="email"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="name@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1" htmlFor="staff-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="staff-password"
                  type="password"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Logins for Evaluator */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              ⚡ Quick Test Credentials (One-Click)
            </div>

            <div className="space-y-2">
              {DEMO_STAFF_USERS.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleQuickLogin(staff)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 transition-all text-left"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-800">{staff.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {staff.email} • {staff.password}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      staff.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {staff.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
