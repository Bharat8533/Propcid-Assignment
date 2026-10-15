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
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--rose)' }}>
            <Trash2 size={20} />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Confirm Deletion
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="var(--rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Are you sure you want to delete this {registration.status === 'submitted' ? 'submitted registration' : 'draft'}?
                </p>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Target: <strong>{registration.full_name || 'Unnamed Draft'}</strong> ({registration.user_type?.toUpperCase()})
                  {registration.mobile ? ` • Mobile: ${registration.mobile}` : ''}
                </p>
              </div>
            </div>

            {isAdmin ? (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label" htmlFor="delete-reason">
                  Deletion Reason <span className="required-dot">*</span> (Admin required: 10–200 characters)
                </label>
                <textarea
                  id="delete-reason"
                  className={`form-control ${error ? 'has-error' : ''}`}
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Ineligible applicant or duplicate request requested for removal..."
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  {error ? (
                    <span className="field-error">{error}</span>
                  ) : (
                    <span className="field-hint">State the justification for auditing</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: reason.trim().length >= 10 && reason.trim().length <= 200 ? 'var(--emerald)' : 'var(--text-muted)' }}>
                    {reason.trim().length}/200
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                This draft will be removed and its mobile and email will become available again.
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger-solid"
              disabled={loading || (isAdmin && (reason.trim().length < 10 || reason.trim().length > 200))}
            >
              {loading ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
