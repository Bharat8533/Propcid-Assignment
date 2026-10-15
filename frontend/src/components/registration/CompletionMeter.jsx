import React from 'react';

export default function CompletionMeter({ formData, completionPercentage }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-5 shadow-xs">
      <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-700">
        <span>Form Completion Progress</span>
        <span className="text-sm font-bold text-slate-900">{completionPercentage}%</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-2">
        <div
          className={`h-full transition-all duration-300 ${
            completionPercentage === 100 ? 'bg-emerald-600' : 'bg-slate-900'
          }`}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
        <span>
          {formData.user_type === 'broker' ? '16 required fields' : '19 required fields'}
        </span>
        <div className="flex gap-3">
          <span className={formData.email_verified ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
            Email: {formData.email_verified ? 'Verified' : 'Pending'}
          </span>
          <span className={formData.mobile_verified ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
            Mobile: {formData.mobile_verified ? 'Verified' : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}
