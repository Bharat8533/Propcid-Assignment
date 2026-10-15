import React from 'react';
import { DEMO_STAFF_USERS } from '../constants/indianData';

export default function Navbar({ currentUser, activeTab, onTabChange, onLogout, onSwitchUser }) {
  if (!currentUser) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center rounded font-bold text-sm">
            ED
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base tracking-tight">EstateDesk</span>   
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {currentUser.role === 'agent' && (
            <button
              onClick={() => onTabChange('form')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'form'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Registration Form
            </button>
          )}

          <button
            onClick={() => onTabChange('report')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'report'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {currentUser.role === 'admin' ? 'Compliance Audit' : 'My Registrations'}
          </button>
        </nav>

        {/* User Info & Switcher */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-3">
            <span className="text-xs text-slate-500">Switch user:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = DEMO_STAFF_USERS.find(user => user.id === Number(e.target.value));
                if (u) onSwitchUser(u);
              }}
              className="text-xs bg-slate-50 text-slate-700 font-medium border border-slate-200 rounded px-2 py-1 outline-none cursor-pointer"
            >
              {DEMO_STAFF_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700">
              {currentUser.name.charAt(0)}
            </div>
            <span className="text-xs font-semibold text-slate-800 hidden md:inline">
              {currentUser.name}
            </span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              currentUser.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {currentUser.role}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium ml-1 px-2 py-1 rounded hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
