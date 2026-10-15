import React from 'react';

export default function BrokerDetailsSection({
  formData,
  errors,
  isReadOnly,
  onInputChange
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
        4. Broker Specific Requirements
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="pan_number_broker">
            Personal PAN Number <span className="text-red-500">*</span>
          </label>
          <input
            id="pan_number_broker"
            type="text"
            maxLength={10}
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 font-mono uppercase outline-none transition-colors ${
              errors.pan_number
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            placeholder="ABCDE1234F"
            value={formData.pan_number}
            onChange={(e) => onInputChange('pan_number', e.target.value.toUpperCase())}
            disabled={isReadOnly}
          />
          {errors.pan_number ? (
            <span className="text-xs text-red-600 mt-1 block">{errors.pan_number}</span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Individual broker: 4th letter must be "P" (e.g. ABCDP1234F)
            </span>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="about_broker">
            About Professional Background <span className="text-red-500">*</span>
          </label>
          <textarea
            id="about_broker"
            rows={3}
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
              errors.about
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            placeholder="Brief background and network details..."
            value={formData.about || ''}
            onChange={(e) => onInputChange('about', e.target.value)}
            disabled={isReadOnly}
            maxLength={500}
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
            {errors.about ? (
              <span className="text-red-600">{errors.about}</span>
            ) : (
              <span>50–500 characters</span>
            )}
            <span>{(formData.about || '').length}/500</span>
          </div>
        </div>
      </div>
    </div>
  );
}
