import React from 'react';
import { Building2, FileText, BarChart3, LogOut } from 'lucide-react';
import { DEMO_STAFF_USERS } from '../constants/indianData';

export default function Navbar({ currentUser, activeTab, onTabChange, onLogout, onSwitchUser }) {
  if (!currentUser) return null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 text-white flex items-center justify-center rounded-lg shadow-sm">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">EstateDesk</span>
            <span className="text-[10px] block text-slate-400 font-medium leading-none">
              Registration Portal
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          {currentUser.role === 'agent' && (
            <button
              onClick={() => onTabChange('form')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'form'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText size={16} />
              <span>Registration Form</span>
            </button>
          )}

          <button
            onClick={() => onTabChange('report')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'report'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={16} />
            <span>{currentUser.role === 'admin' ? 'Admin Dashboard' : 'My Registrations'}</span>
          </button>
        </div>

        {/* User Profile & Demo Switcher */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800">{currentUser.name}</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full self-end ${
                currentUser.role === 'admin'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {currentUser.role}
            </span>
          </div>

          {/* Quick Demo Switcher */}
          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = DEMO_STAFF_USERS.find(user => user.id === Number(e.target.value));
              if (u) onSwitchUser(u);
            }}
            title="Quick switch user role for testing"
            className="px-2 py-1 rounded border border-slate-200 text-xs bg-slate-50 text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500"
          >
            {DEMO_STAFF_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.role === 'admin' ? '👑' : '👤'} {u.name} ({u.role})
              </option>
            ))}
          </select>

          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
