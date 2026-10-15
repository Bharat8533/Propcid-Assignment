import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-950">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative z-10">
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-800/80">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 rounded-2xl inline-flex items-center justify-center mb-4 shadow-glow">
            <Building2 size={30} className="text-white drop-shadow" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2">
            <Sparkles size={11} /> Field Staff Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Estate<span className="text-indigo-400">Desk</span></h1>
          <p className="text-xs text-slate-400 mt-1">Builder &amp; Broker Compliance Registration Platform</p>
        </div>

        {/* Body */}
        <div className="p-8 pt-6">
          {errorMessage && (
            <div className="bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-xl p-3.5 text-xs font-semibold mb-5 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5" htmlFor="staff-email">
                Staff Email Address
              </label>
              <div className="relative">
                <input
                  id="staff-email"
                  type="email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500"
                  placeholder="name@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5" htmlFor="staff-password">
                Staff Password
              </label>
              <div className="relative">
                <input
                  id="staff-password"
                  type="password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-sm hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 mt-2 transform active:scale-95"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Logins for Evaluator */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3 text-center">
              ⚡ Quick Test Credentials (One-Click)
            </div>

            <div className="space-y-2">
              {DEMO_STAFF_USERS.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleQuickLogin(staff)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-850/60 hover:bg-slate-800 hover:border-indigo-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors">{staff.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {staff.email} • {staff.password}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      staff.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
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
