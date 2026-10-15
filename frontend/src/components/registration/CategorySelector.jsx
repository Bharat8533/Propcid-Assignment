import React from 'react';

export default function CategorySelector({
  userType,
  onTypeSwitch,
  isReadOnly,
  error
}) {
  return (
    <div className="p-4 sm:p-5 border-b border-slate-200">
      <label className="text-xs font-semibold text-slate-700 block mb-2">
        Select Category <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <button
          type="button"
          className={`py-2 px-3 rounded text-xs font-semibold border transition-colors ${
            userType === 'builder'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
          onClick={() => onTypeSwitch('builder')}
          disabled={isReadOnly}
        >
          Real Estate Builder
        </button>

        <button
          type="button"
          className={`py-2 px-3 rounded text-xs font-semibold border transition-colors ${
            userType === 'broker'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
          onClick={() => onTypeSwitch('broker')}
          disabled={isReadOnly}
        >
          Real Estate Broker
        </button>
      </div>
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </div>
  );
}
