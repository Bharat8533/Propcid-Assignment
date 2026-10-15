import React from 'react';
import { Building2, FileText, BarChart3, LogOut, UserCheck } from 'lucide-react';
import { DEMO_STAFF_USERS } from '../constants/indianData';

export default function Navbar({ currentUser, activeTab, onTabChange, onLogout, onSwitchUser }) {
  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <Building2 size={20} />
          </div>
          <div>
            <span>EstateDesk</span>
            <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>
              Registration Portal
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-links">
          {currentUser.role === 'agent' && (
            <button
              className={`nav-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => onTabChange('form')}
            >
              <FileText size={16} />
              <span>Registration Form</span>
            </button>
          )}

          <button
            className={`nav-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => onTabChange('report')}
          >
            <BarChart3 size={16} />
            <span>{currentUser.role === 'admin' ? 'Admin Dashboard' : 'My Registrations'}</span>
          </button>
        </div>

        {/* User Profile & Demo Switcher */}
        <div className="nav-user">
          <div className="user-badge hide-on-mobile">
            <span className="user-name">{currentUser.name}</span>
            <span className={`user-role-pill ${currentUser.role === 'admin' ? 'role-admin' : 'role-agent'}`}>
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
            style={{
              padding: '0.35rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.75rem',
              background: '#f8fafc',
              cursor: 'pointer'
            }}
          >
            {DEMO_STAFF_USERS.map(u => (
              <option key={u.id} value={u.id}>
                {u.role === 'admin' ? '👑' : '👤'} {u.name} ({u.role})
              </option>
            ))}
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut size={15} />
            <span className="hide-on-mobile">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
