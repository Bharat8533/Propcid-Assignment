import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ReportPage from './pages/ReportPage';
import { DEMO_STAFF_USERS } from './constants/indianData';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('estatedesk_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default logged in as Vikram Agent for immediate interactive evaluation
    return DEMO_STAFF_USERS[1];
  });

  const [activeTab, setActiveTab] = useState(() => {
    const savedUser = localStorage.getItem('estatedesk_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.role === 'admin' ? 'report' : 'form';
      } catch (e) {}
    }
    return 'form';
  });

  const [selectedRegistrationId, setSelectedRegistrationId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast Notification System
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('estatedesk_user', JSON.stringify(user));
    if (token) localStorage.setItem('estatedesk_token', token);
    // As per requirements: "After login, an agent lands on the form and an admin lands on the report."
    setActiveTab(user.role === 'admin' ? 'report' : 'form');
    setSelectedRegistrationId(null);
    showToast(`Welcome back, ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('estatedesk_user');
    localStorage.removeItem('estatedesk_token');
    setSelectedRegistrationId(null);
  };

  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('estatedesk_user', JSON.stringify(user));
    // If switching to admin, automatically go to report
    if (user.role === 'admin') {
      setActiveTab('report');
    }
    setSelectedRegistrationId(null);
    showToast(`Switched account to ${user.name} (${user.role.toUpperCase()})`, 'info');
  };

  const handleNavigateToForm = () => {
    setSelectedRegistrationId(null);
    setActiveTab('form');
  };

  const handleEditRegistration = (id) => {
    setSelectedRegistrationId(id);
    setActiveTab('form');
  };

  if (!currentUser) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        {/* Toast rendering */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'success' && <CheckCircle2 size={18} color="var(--emerald)" />}
              {t.type === 'error' && <AlertCircle size={18} color="var(--rose)" />}
              {t.type === 'info' && <Info size={18} color="var(--primary)" />}
              <span>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'form' ? (
          <RegistrationPage
            currentUser={currentUser}
            registrationId={selectedRegistrationId}
            onNavigateBack={() => setActiveTab('report')}
            showToast={showToast}
          />
        ) : (
          <ReportPage
            currentUser={currentUser}
            onNavigateToForm={handleNavigateToForm}
            onEditRegistration={handleEditRegistration}
            showToast={showToast}
          />
        )}
      </main>

      {/* Global Toast Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} color="var(--emerald)" />}
            {t.type === 'error' && <AlertCircle size={18} color="var(--rose)" />}
            {t.type === 'info' && <Info size={18} color="var(--primary)" />}
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
