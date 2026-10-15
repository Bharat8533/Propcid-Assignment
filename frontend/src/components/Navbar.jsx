import React from 'react';
import { Building2, FileText, BarChart3, LogOut, Sparkles } from 'lucide-react';
import { DEMO_STAFF_USERS } from '../constants/indianData';

export default function Navbar({ currentUser, activeTab, onTabChange, onLogout, onSwitchUser }) {
  if (!currentUser) return null;

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 shadow-lg shadow-slate-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white flex items-center justify-center rounded-xl shadow-glow">
            <Building2 size={22} className="drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-tight text-lg">Estate<span className="text-indigo-400">Desk</span></span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles size={10} /> v2.4 PRO
              </span>
            </div>
            <span className="text-[10px] block text-slate-400 font-medium tracking-wide">
              Builder &amp; Broker Compliance Portal
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          {currentUser.role === 'agent' && (
            <button
              onClick={() => onTabChange('form')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'form'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileText size={15} />
              <span>Registration Form</span>
            </button>
          )}

          <button
            onClick={() => onTabChange('report')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 size={15} />
            <span>{currentUser.role === 'admin' ? 'Admin Dashboard' : 'My Registrations'}</span>
          </button>
        </div>

        {/* User Profile & Demo Switcher */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border border-indigo-400/30 shadow-inner">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200 leading-tight">{currentUser.name}</span>
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full self-end mt-0.5 ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {currentUser.role}
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher */}
          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = DEMO_STAFF_USERS.find(user => user.id === Number(e.target.value));
              if (u) onSwitchUser(u);
            }}
            title="Quick switch user role for testing"
            className="px-2.5 py-1 rounded-lg border border-slate-700 text-xs bg-slate-800 text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500 hover:bg-slate-750 transition-colors"
          >
            {DEMO_STAFF_USERS.map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                {u.role === 'admin' ? '👑' : '👤'} {u.name} ({u.role})
              </option>
            ))}
          </select>

          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
