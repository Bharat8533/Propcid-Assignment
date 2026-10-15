import React from 'react';
import { COMPANY_TYPES } from '../../constants/indianData';

export default function BuilderDetailsSection({
  formData,
  errors,
  isReadOnly,
  onInputChange
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
        4. Builder Entity Details
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="company_name">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="company_name"
            type="text"
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
              errors.company_name
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            placeholder="e.g. Prime Realty Developers Pvt Ltd"
            value={formData.company_name}
            onChange={(e) => onInputChange('company_name', e.target.value)}
            disabled={isReadOnly}
            maxLength={100}
          />
          {errors.company_name && <span className="text-xs text-red-600 mt-1 block">{errors.company_name}</span>}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="company_type">
            Company Type <span className="text-red-500">*</span>
          </label>
          <select
            id="company_type"
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
              errors.company_type
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            value={formData.company_type}
            onChange={(e) => onInputChange('company_type', e.target.value)}
            disabled={isReadOnly}
          >
            <option value="">Select Company Type</option>
            {COMPANY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.company_type && <span className="text-xs text-red-600 mt-1 block">{errors.company_type}</span>}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="gst_number">
            GST Number <span className="text-red-500">*</span>
          </label>
          <input
            id="gst_number"
            type="text"
            maxLength={15}
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 font-mono uppercase outline-none transition-colors ${
              errors.gst_number
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            placeholder="09AAACP1234F1Z5"
            value={formData.gst_number}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              onInputChange('gst_number', val);
              if (val.length >= 12 && !formData.pan_number) {
                onInputChange('pan_number', val.substring(2, 12));
              }
            }}
            disabled={isReadOnly}
          />
          {errors.gst_number ? (
            <span className="text-xs text-red-600 mt-1 block">{errors.gst_number}</span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-0.5 block">15 chars (e.g. 09AAACP1234F1Z5)</span>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="pan_number_builder">
            Company PAN Number <span className="text-red-500">*</span>
          </label>
          <input
            id="pan_number_builder"
            type="text"
            maxLength={10}
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 font-mono uppercase outline-none transition-colors ${
              errors.pan_number
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            placeholder="AAACP1234F"
            value={formData.pan_number}
            onChange={(e) => onInputChange('pan_number', e.target.value.toUpperCase())}
            disabled={isReadOnly}
          />
          {errors.pan_number ? (
            <span className="text-xs text-red-600 mt-1 block">{errors.pan_number}</span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Must equal chars 3–12 of GST. 4th letter: C (Pvt Ltd), F (LLP/Partnership), P (Proprietorship)
            </span>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="about_company">
            About Company <span className="text-red-500">*</span>
          </label>
          <textarea
            id="about_company"
            rows={3}
            className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
              errors.about_company
                ? 'border-red-500 bg-red-50/20'
                : 'border-slate-300 focus:border-slate-800'
            }`}
            placeholder="Describe completed projects, certifications..."
            value={formData.about_company || ''}
            onChange={(e) => onInputChange('about_company', e.target.value)}
            disabled={isReadOnly}
            maxLength={500}
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
            {errors.about_company ? (
              <span className="text-red-600">{errors.about_company}</span>
            ) : (
              <span>50–500 characters</span>
            )}
            <span>{(formData.about_company || '').length}/500</span>
          </div>
        </div>
      </div>
    </div>
  );
}
