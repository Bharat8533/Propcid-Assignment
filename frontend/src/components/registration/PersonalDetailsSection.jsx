import React from 'react';
import { INDIAN_STATES_AND_UTS } from '../../constants/indianData';

export default function PersonalDetailsSection({
  formData,
  errors,
  isReadOnly,
  calculatedAge,
  onInputChange,
  onOpenOtpModal
}) {
  return (
    <>
      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
          1. Personal &amp; Contact Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="full_name">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              type="text"
              className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                errors.full_name
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:border-slate-800'
              }`}
              placeholder="e.g. Ramesh K. Sharma"
              value={formData.full_name}
              onChange={(e) => onInputChange('full_name', e.target.value)}
              disabled={isReadOnly}
              maxLength={60}
            />
            {errors.full_name ? (
              <span className="text-xs text-red-600 mt-1 block">{errors.full_name}</span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-0.5 block">3–60 chars, letters, spaces and dots only</span>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="gender">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                errors.gender
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:border-slate-800'
              }`}
              value={formData.gender}
              onChange={(e) => onInputChange('gender', e.target.value)}
              disabled={isReadOnly}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <span className="text-xs text-red-600 mt-1 block">{errors.gender}</span>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="email"
                type="email"
                className={`flex-1 px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                  errors.email
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:border-slate-800'
                }`}
                placeholder="person@example.com"
                value={formData.email}
                onChange={(e) => onInputChange('email', e.target.value)}
                disabled={isReadOnly}
              />
              {formData.email_verified ? (
                <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 border border-emerald-200 rounded">
                  Verified
                </span>
              ) : (
                !isReadOnly && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => onOpenOtpModal('email')}
                    disabled={!formData.email}
                  >
                    Verify OTP
                  </button>
                )
              )}
            </div>
            {errors.email ? (
              <span className="text-xs text-red-600 mt-1 block">{errors.email}</span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-0.5 block">Stored in lowercase; must be OTP-verified</span>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="mobile">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                className={`flex-1 px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                  errors.mobile
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:border-slate-800'
                }`}
                placeholder="+91 98765 43210"
                value={formData.mobile}
                onChange={(e) => onInputChange('mobile', e.target.value)}
                disabled={isReadOnly}
              />
              {formData.mobile_verified ? (
                <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 border border-emerald-200 rounded">
                  Verified
                </span>
              ) : (
                !isReadOnly && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => onOpenOtpModal('mobile')}
                    disabled={!formData.mobile}
                  >
                    Verify OTP
                  </button>
                )
              )}
            </div>
            {errors.mobile ? (
              <span className="text-xs text-red-600 mt-1 block">{errors.mobile}</span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-0.5 block">10 digits starting with 6–9</span>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="dob">
              Date of Birth <span className="text-red-500">*</span>
              {calculatedAge !== null && (
                <span className="text-slate-500 ml-1 text-xs">({calculatedAge} yrs old)</span>
              )}
            </label>
            <input
              id="dob"
              type="date"
              className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                errors.dob
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:border-slate-800'
              }`}
              value={formData.dob}
              onChange={(e) => onInputChange('dob', e.target.value)}
              disabled={isReadOnly}
            />
            {errors.dob ? (
              <span className="text-xs text-red-600 mt-1 block">{errors.dob}</span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-0.5 block">18–100 years old today (India date)</span>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="experience_years">
              Years of Experience <span className="text-red-500">*</span>
            </label>
            <input
              id="experience_years"
              type="number"
              inputMode="numeric"
              min="0"
              max="60"
              className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                errors.experience_years
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:border-slate-800'
              }`}
              placeholder="e.g. 8"
              value={formData.experience_years}
              onChange={(e) => onInputChange('experience_years', e.target.value)}
              disabled={isReadOnly}
            />
            {errors.experience_years ? (
              <span className="text-xs text-red-600 mt-1 block">{errors.experience_years}</span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-0.5 block">Whole number 0–60, and not more than (age − 18)</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
          2. Office Location &amp; Address
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="office_address">
              Office Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="office_address"
              rows={2}
              className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                errors.office_address
                  ? 'border-red-500 bg-red-50/20'
                  : 'border-slate-300 focus:border-slate-800'
              }`}
              placeholder="Street address, building, suite..."
              value={formData.office_address || ''}
              onChange={(e) => onInputChange('office_address', e.target.value)}
              disabled={isReadOnly}
              maxLength={200}
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
              {errors.office_address ? (
                <span className="text-red-600">{errors.office_address}</span>
              ) : (
                <span>10–200 characters</span>
              )}
              <span>{(formData.office_address || '').length}/200</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="city">
                City <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                  errors.city
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:border-slate-800'
                }`}
                placeholder="e.g. Pune"
                value={formData.city}
                onChange={(e) => onInputChange('city', e.target.value)}
                disabled={isReadOnly}
                maxLength={50}
              />
              {errors.city && <span className="text-xs text-red-600 mt-1 block">{errors.city}</span>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="state">
                State / UT <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                  errors.state
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:border-slate-800'
                }`}
                value={formData.state}
                onChange={(e) => onInputChange('state', e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">Select State or UT</option>
                {INDIAN_STATES_AND_UTS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {errors.state && <span className="text-xs text-red-600 mt-1 block">{errors.state}</span>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1" htmlFor="pincode">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                id="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={`w-full px-3 py-2 rounded border text-sm text-slate-900 outline-none transition-colors ${
                  errors.pincode
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-slate-300 focus:border-slate-800'
                }`}
                placeholder="411001"
                value={formData.pincode}
                onChange={(e) => onInputChange('pincode', e.target.value.replace(/\D/g, ''))}
                disabled={isReadOnly}
              />
              {errors.pincode ? (
                <span className="text-xs text-red-600 mt-1 block">{errors.pincode}</span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-0.5 block">6 digits; cannot start with 0</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
