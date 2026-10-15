import React, { useState, useEffect, useMemo } from 'react';
import {
  INDIAN_STATES_AND_UTS,
  MANDATORY_LANGUAGES,
  AREAS_OF_EXPERTISE,
  COMPANY_TYPES
} from '../constants/indianData';
import {
  validateField,
  validateDraft,
  validateSubmit,
  calculateCompletion,
  calculateAge,
  normaliseMobile
} from '../utils/validation';
import { api } from '../services/api';
import OtpModal from '../components/OtpModal';
import DeleteModal from '../components/DeleteModal';

const INITIAL_FORM = {
  user_type: 'builder',
  // Common (12)
  full_name: '',
  email: '',
  email_verified: false,
  mobile: '',
  mobile_verified: false,
  gender: '',
  dob: '',
  office_address: '',
  city: '',
  state: '',
  pincode: '',
  experience_years: '',
  languages: [],
  areas_of_expertise: [],
  // Broker only (2)
  about: '',
  // Builder only (5)
  company_name: '',
  company_type: '',
  gst_number: '',
  pan_number: '',
  about_company: '',
  // Metadata
  status: 'draft',
  completion: 0
};

export default function RegistrationPage({
  currentUser,
  registrationId,
  onNavigateBack,
  showToast
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // OTP Modal state
  const [otpModal, setOtpModal] = useState({
    isOpen: false,
    channel: null,
    targetValue: ''
  });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!registrationId) {
      setFormData(INITIAL_FORM);
      setIsDirty(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const record = await api.getRegistration(registrationId);
        setFormData({
          ...INITIAL_FORM,
          ...record,
          languages: record.languages || [],
          areas_of_expertise: record.areas_of_expertise || []
        });
        setIsDirty(false);
      } catch (err) {
        showToast(err.message, 'error');
        onNavigateBack();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [registrationId]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && formData.status !== 'submitted') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, formData.status]);

  const isReadOnly = formData.status === 'submitted' || currentUser.role === 'admin';
  const calculatedAge = useMemo(() => calculateAge(formData.dob), [formData.dob]);
  const completionPercentage = useMemo(() => calculateCompletion(formData), [formData]);

  const handleInputChange = (field, value) => {
    if (isReadOnly) return;
    setIsDirty(true);

    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'email' && prev.email_verified && value !== prev.email) {
        next.email_verified = false;
        showToast('Email modified. Please re-verify with OTP.', 'info');
      }

      if (field === 'mobile' && prev.mobile_verified) {
        const prevNorm = normaliseMobile(prev.mobile);
        const newNorm = normaliseMobile(value);
        if (prevNorm !== newNorm) {
          next.mobile_verified = false;
          showToast('Mobile number modified. Please re-verify with OTP.', 'info');
        }
      }

      if (field === 'pan_number' || field === 'gst_number') {
        next[field] = String(value).toUpperCase();
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleTypeSwitch = (newType) => {
    if (isReadOnly || formData.user_type === newType) return;

    const hasSpecificData =
      (formData.user_type === 'broker' && (formData.pan_number || formData.about)) ||
      (formData.user_type === 'builder' &&
        (formData.company_name || formData.company_type || formData.gst_number || formData.pan_number || formData.about_company));

    if (hasSpecificData) {
      const confirmSwitch = window.confirm(
        `Switching category to ${newType.toUpperCase()} will discard existing ${formData.user_type}-specific data. Continue?`
      );
      if (!confirmSwitch) return;
    }

    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      user_type: newType,
      pan_number: '',
      about: '',
      company_name: '',
      company_type: '',
      gst_number: '',
      about_company: ''
    }));

    setErrors({});
  };

  const handleLanguageToggle = (lang) => {
    if (isReadOnly) return;
    setIsDirty(true);
    setFormData((prev) => {
      const current = prev.languages || [];
      const updated = current.includes(lang)
        ? current.filter((l) => l !== lang)
        : [...current, lang];
      return { ...prev, languages: updated };
    });
    if (errors.languages) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.languages;
        return copy;
      });
    }
  };

  const handleExpertiseToggle = (area) => {
    if (isReadOnly) return;
    setIsDirty(true);
    setFormData((prev) => {
      const current = prev.areas_of_expertise || [];
      if (current.includes(area)) {
        return { ...prev, areas_of_expertise: current.filter((a) => a !== area) };
      }
      if (current.length >= 3) {
        showToast('You can select a maximum of 3 areas of expertise', 'info');
        return prev;
      }
      return { ...prev, areas_of_expertise: [...current, area] };
    });
    if (errors.areas_of_expertise) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.areas_of_expertise;
        return copy;
      });
    }
  };

  const handleSaveDraft = async () => {
    const val = validateDraft(formData);
    if (!val.isValid) {
      setErrors(val.errors);
      showToast('Cannot save draft: check highlighted errors', 'error');
      return;
    }

    try {
      setSaveLoading(true);
      setErrors({});

      let savedRecord;
      if (formData.id) {
        savedRecord = await api.updateDraft(formData.id, formData);
        showToast('Draft updated successfully', 'success');
      } else {
        savedRecord = await api.createDraft(formData);
        showToast('Draft created successfully', 'success');
      }

      setFormData((prev) => ({
        ...prev,
        ...savedRecord,
        languages: savedRecord.languages || [],
        areas_of_expertise: savedRecord.areas_of_expertise || []
      }));
      setIsDirty(false);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      showToast(err.message || 'Error saving draft', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmitRegistration = async () => {
    let currentId = formData.id;
    if (!currentId) {
      const draftVal = validateDraft(formData);
      if (!draftVal.isValid) {
        setErrors(draftVal.errors);
        showToast('Please fill required draft fields first', 'error');
        return;
      }
      try {
        setSubmitLoading(true);
        const saved = await api.createDraft(formData);
        currentId = saved.id;
        setFormData((prev) => ({ ...prev, ...saved }));
      } catch (err) {
        setSubmitLoading(false);
        if (err.fields) setErrors(err.fields);
        showToast(err.message || 'Failed to initialize draft', 'error');
        return;
      }
    }

    const submitVal = validateSubmit(formData);
    if (!submitVal.isValid) {
      setErrors(submitVal.errors);
      showToast('Form incomplete: verify email/mobile and fill all required fields', 'error');
      setSubmitLoading(false);
      return;
    }

    try {
      setSubmitLoading(true);
      setErrors({});
      const updated = await api.submitRegistration(currentId);
      setFormData((prev) => ({
        ...prev,
        ...updated,
        status: 'submitted',
        completion: 100
      }));
      setIsDirty(false);
      showToast('Registration submitted successfully! Status is now read-only.', 'success');
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenOtpModal = async (channel) => {
    const val = channel === 'email' ? formData.email : formData.mobile;
    const err = validateField(channel, val, formData);
    if (!val || err) {
      setErrors((prev) => ({ ...prev, [channel]: err || 'Enter a valid value first' }));
      showToast(`Please enter a valid ${channel} before requesting OTP`, 'error');
      return;
    }

    let regId = formData.id;
    if (!regId) {
      try {
        setLoading(true);
        const draft = await api.createDraft(formData);
        regId = draft.id;
        setFormData((prev) => ({ ...prev, ...draft }));
      } catch (e) {
        setLoading(false);
        showToast('Save basic details first before requesting OTP', 'error');
        return;
      } finally {
        setLoading(false);
      }
    }

    setOtpModal({
      isOpen: true,
      channel,
      targetValue: channel === 'mobile' ? `+91 ${normaliseMobile(val)}` : val
    });
  };

  const handleOtpSuccess = (channel) => {
    if (channel === 'email') {
      setFormData((prev) => ({ ...prev, email_verified: true }));
      showToast('Email verified successfully with OTP!', 'success');
    } else if (channel === 'mobile') {
      setFormData((prev) => ({ ...prev, mobile_verified: true }));
      showToast('Mobile number verified successfully with OTP!', 'success');
    }
    setIsDirty(true);
  };

  const handleDeleteDraft = async (id, reason) => {
    try {
      setDeleteLoading(true);
      await api.deleteRegistration(id, reason);
      showToast('Registration deleted successfully', 'success');
      setShowDeleteModal(false);
      onNavigateBack();
    } catch (err) {
      showToast(err.message || 'Error deleting registration', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-24 px-4 text-slate-500 text-sm">
        Loading registration details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Top Header Bar */}
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

      {/* Read-only Notice */}
      {isReadOnly && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg p-3 text-xs mb-4">
          {formData.status === 'submitted'
            ? 'This registration is submitted and locked in read-only mode.'
            : 'Admin view: Read-only mode.'}
        </div>
      )}

      {/* Completion Meter Card */}
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

      {/* Main Form Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* User Type Switcher Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Select Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 max-w-md">
            <button
              type="button"
              className={`py-2 px-3 rounded text-xs font-semibold border transition-colors ${
                formData.user_type === 'builder'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => handleTypeSwitch('builder')}
              disabled={isReadOnly}
            >
              Real Estate Builder
            </button>

            <button
              type="button"
              className={`py-2 px-3 rounded text-xs font-semibold border transition-colors ${
                formData.user_type === 'broker'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => handleTypeSwitch('broker')}
              disabled={isReadOnly}
            >
              Real Estate Broker
            </button>
          </div>
          {errors.user_type && <span className="text-xs text-red-600 mt-1 block">{errors.user_type}</span>}
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* SECTION 1: COMMON DETAILS */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
              1. Personal &amp; Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
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
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  disabled={isReadOnly}
                  maxLength={60}
                />
                {errors.full_name ? (
                  <span className="text-xs text-red-600 mt-1 block">{errors.full_name}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-0.5 block">3–60 chars, letters, spaces and dots only</span>
                )}
              </div>

              {/* Gender */}
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
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="text-xs text-red-600 mt-1 block">{errors.gender}</span>}
              </div>

              {/* Email with OTP Verify button */}
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
                    onChange={(e) => handleInputChange('email', e.target.value)}
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
                        onClick={() => handleOpenOtpModal('email')}
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

              {/* Mobile with OTP Verify button */}
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
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
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
                        onClick={() => handleOpenOtpModal('mobile')}
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

              {/* Date of Birth */}
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
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                  disabled={isReadOnly}
                />
                {errors.dob ? (
                  <span className="text-xs text-red-600 mt-1 block">{errors.dob}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-0.5 block">18–100 years old today (India date)</span>
                )}
              </div>

              {/* Years of Experience */}
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
                  onChange={(e) => handleInputChange('experience_years', e.target.value)}
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

          {/* SECTION 2: LOCATION & ADDRESS */}
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
                  value={formData.office_address}
                  onChange={(e) => handleInputChange('office_address', e.target.value)}
                  disabled={isReadOnly}
                  maxLength={200}
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                  {errors.office_address ? (
                    <span className="text-red-600">{errors.office_address}</span>
                  ) : (
                    <span>10–200 characters</span>
                  )}
                  <span>{formData.office_address.length}/200</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* City */}
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
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={50}
                  />
                  {errors.city && <span className="text-xs text-red-600 mt-1 block">{errors.city}</span>}
                </div>

                {/* State */}
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
                    onChange={(e) => handleInputChange('state', e.target.value)}
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

                {/* Pincode */}
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
                    onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
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

          {/* SECTION 3: EXPERTISE & LANGUAGES */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
              3. Languages &amp; Areas of Expertise
            </h3>

            {/* Languages Known */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-700 block mb-2">
                Languages Known <span className="text-red-500">*</span> (Select at least 1)
              </label>
              <div className="flex flex-wrap gap-2">
                {MANDATORY_LANGUAGES.map((lang) => {
                  const isChecked = formData.languages.includes(lang);
                  return (
                    <label
                      key={lang}
                      className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border ${
                        isChecked
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleLanguageToggle(lang)}
                        disabled={isReadOnly}
                        className="hidden"
                      />
                      {lang}
                    </label>
                  );
                })}
              </div>
              {errors.languages && <span className="text-xs text-red-600 mt-1 block">{errors.languages}</span>}
            </div>

            {/* Areas of Expertise */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-2">
                Areas of Expertise <span className="text-red-500">*</span> (Choose 1 to 3)
              </label>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_EXPERTISE.map((area) => {
                  const isChecked = formData.areas_of_expertise.includes(area);
                  return (
                    <label
                      key={area}
                      className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border ${
                        isChecked
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleExpertiseToggle(area)}
                        disabled={isReadOnly}
                        className="hidden"
                      />
                      {area}
                    </label>
                  );
                })}
              </div>
              {errors.areas_of_expertise && (
                <span className="text-xs text-red-600 mt-1 block">{errors.areas_of_expertise}</span>
              )}
            </div>
          </div>

          {/* SECTION 4: TYPE SPECIFIC DETAILS */}
          {formData.user_type === 'broker' ? (
            /* BROKER ONLY FIELDS (2) */
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
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
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
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={500}
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                    {errors.about ? (
                      <span className="text-red-600">{errors.about}</span>
                    ) : (
                      <span>50–500 characters</span>
                    )}
                    <span>{formData.about.length}/500</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* BUILDER ONLY FIELDS (5) */
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                4. Builder Entity Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
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
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={100}
                  />
                  {errors.company_name && <span className="text-xs text-red-600 mt-1 block">{errors.company_name}</span>}
                </div>

                {/* Company Type */}
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
                    onChange={(e) => handleInputChange('company_type', e.target.value)}
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

                {/* GST Number */}
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
                      handleInputChange('gst_number', val);
                      if (val.length >= 12 && !formData.pan_number) {
                        handleInputChange('pan_number', val.substring(2, 12));
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

                {/* Builder PAN Number */}
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
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
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

                {/* About Company */}
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
                    value={formData.about_company}
                    onChange={(e) => handleInputChange('about_company', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={500}
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                    {errors.about_company ? (
                      <span className="text-red-600">{errors.about_company}</span>
                    ) : (
                      <span>50–500 characters</span>
                    )}
                    <span>{formData.about_company.length}/500</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS BAR */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              {formData.id && !isReadOnly && (
                <button
                  type="button"
                  className="px-3 py-2 rounded text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  onClick={() => setShowDeleteModal(true)}
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
                    onClick={handleSaveDraft}
                    disabled={saveLoading || submitLoading}
                  >
                    {saveLoading ? 'Saving...' : 'Save Draft'}
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                    onClick={handleSubmitRegistration}
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
        </div>
      </div>

      {/* OTP Verification Modal */}
      {otpModal.isOpen && (
        <OtpModal
          registrationId={formData.id}
          channel={otpModal.channel}
          targetValue={otpModal.targetValue}
          onClose={() => setOtpModal({ isOpen: false, channel: null, targetValue: '' })}
          onSuccess={handleOtpSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        registration={formData}
        userRole={currentUser.role}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteDraft}
        loading={deleteLoading}
      />
    </div>
  );
}
