import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ReportPage from './pages/ReportPage';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('estatedesk_user');
    const token = localStorage.getItem('estatedesk_token');
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
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
      <div className="min-h-screen bg-slate-50">
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 bg-white border-l-4 ${
                t.type === 'success'
                  ? 'border-l-emerald-600 text-slate-800'
                  : t.type === 'error'
                  ? 'border-l-red-600 text-slate-800'
                  : 'border-l-blue-600 text-slate-800'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600" />}
              {t.type === 'error' && <AlertCircle size={16} className="text-red-600" />}
              {t.type === 'info' && <Info size={16} className="text-blue-600" />}
              <span>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1">
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

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 bg-white border-l-4 ${
              t.type === 'success'
                ? 'border-l-emerald-600 text-slate-800'
                : t.type === 'error'
                ? 'border-l-red-600 text-slate-800'
                : 'border-l-blue-600 text-slate-800'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
            {t.type === 'error' && <AlertCircle size={16} className="text-red-600 shrink-0" />}
            {t.type === 'info' && <Info size={16} className="text-blue-600 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 ml-2 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
