import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function DeleteModal({ isOpen, registration, userRole, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !registration) return null;

  const isAdmin = userRole === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAdmin) {
      const trimmed = reason.trim();
      if (trimmed.length < 10 || trimmed.length > 200) {
        setError('Admin deletion reason must be between 10 and 200 characters');
        return;
      }
    }
    onConfirm(registration.id, reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 size={20} />
            <span className="font-bold text-slate-900 text-base">Confirm Deletion</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex gap-3 items-start mb-4">
              <AlertTriangle size={24} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 text-sm mb-1">
                  Are you sure you want to delete this {registration.status === 'submitted' ? 'submitted registration' : 'draft'}?
                </p>
                <p className="text-xs text-slate-500">
                  Target: <strong className="text-slate-700">{registration.full_name || 'Unnamed Draft'}</strong> ({registration.user_type?.toUpperCase()})
                  {registration.mobile ? ` • Mobile: ${registration.mobile}` : ''}
                </p>
              </div>
            </div>

            {isAdmin ? (
              <div className="flex flex-col gap-1.5 mt-4">
                <label className="text-xs font-semibold text-slate-600" htmlFor="delete-reason">
                  Deletion Reason <span className="text-red-500">*</span> (Admin required: 10–200 characters)
                </label>
                <textarea
                  id="delete-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Ineligible applicant or duplicate request requested for removal..."
                  autoFocus
                  className={`w-full p-3 rounded-lg border text-sm text-slate-900 outline-none transition-all ${
                    error
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                <div className="flex justify-between text-xs mt-1">
                  {error ? (
                    <span className="text-red-600 font-medium">{error}</span>
                  ) : (
                    <span className="text-slate-400">State the justification for auditing</span>
                  )}
                  <span
                    className={
                      reason.trim().length >= 10 && reason.trim().length <= 200
                        ? 'text-emerald-600 font-medium'
                        : 'text-slate-400'
                    }
                  >
                    {reason.trim().length}/200
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                This draft will be removed and its mobile and email will become available again.
              </p>
            )}
          </div>

          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (isAdmin && (reason.trim().length < 10 || reason.trim().length > 200))}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
