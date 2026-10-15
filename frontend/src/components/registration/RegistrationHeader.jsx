import React from 'react';

export default function RegistrationHeader({
  formData,
  isDirty,
  isReadOnly,
  onNavigateBack
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <button
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-2.5 py-1.5 bg-white transition-colors"
          onClick={() => {
            if (isDirty && formData.status !== 'submitted') {
              if (window.confirm('You have unsaved changes. Leave anyway?')) {
                onNavigateBack();
              }
            } else {
              onNavigateBack();
            }
          }}
        >
          &larr; Back to List
        </button>

        <div className="flex items-center gap-2">
          {formData.id && (
            <span className="text-xs text-slate-400 font-mono">ID #{formData.id}</span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
              formData.status === 'submitted'
                ? 'bg-emerald-100 text-emerald-800'
                : formData.id
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {formData.status === 'submitted'
              ? 'Submitted'
              : formData.id
              ? 'Draft (Saved)'
              : 'New Registration'}
          </span>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg p-3 text-xs mb-4">
          {formData.status === 'submitted'
            ? 'This registration is submitted and locked in read-only mode.'
            : 'Admin view: Read-only mode.'}
        </div>
      )}
    </>
  );
}
