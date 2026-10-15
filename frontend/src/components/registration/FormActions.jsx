import React from 'react';

export default function FormActions({
  formData,
  isReadOnly,
  saveLoading,
  submitLoading,
  deleteLoading,
  onSaveDraft,
  onSubmitRegistration,
  onOpenDeleteModal,
  onNavigateBack
}) {
  return (
    <div className="border-t border-slate-200 pt-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        {formData.id && !isReadOnly && (
          <button
            type="button"
            className="px-3 py-2 rounded text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
            onClick={onOpenDeleteModal}
            disabled={deleteLoading || saveLoading || submitLoading}
          >
            Delete Draft
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {!isReadOnly ? (
          <>
            <button
              type="button"
              className="px-4 py-2 rounded border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors"
              onClick={onSaveDraft}
              disabled={saveLoading || submitLoading}
            >
              {saveLoading ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              onClick={onSubmitRegistration}
              disabled={saveLoading || submitLoading}
            >
              {submitLoading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="px-4 py-2 rounded border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors"
            onClick={onNavigateBack}
          >
            Return to Reports
          </button>
        )}
      </div>
    </div>
  );
}
