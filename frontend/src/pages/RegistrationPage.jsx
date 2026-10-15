import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Briefcase, CheckCircle2, Save, Send,
  Trash2, ShieldCheck, ArrowLeft, RefreshCw, Lock, Sparkles, Check, CheckCircle,
  ArrowRight, ChevronRight, HelpCircle
} from 'lucide-react';
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
  user_type: '', // Empty initially so agent picks category first
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

  const handleSelectCategory = (type) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      user_type: type
    }));
    setIsDirty(true);
  };

  const handleSwitchCategory = () => {
    if (isReadOnly) return;

    const hasSpecificData =
      (formData.user_type === 'broker' && (formData.pan_number || formData.about)) ||
      (formData.user_type === 'builder' &&
        (formData.company_name || formData.company_type || formData.gst_number || formData.pan_number || formData.about_company));

    if (hasSpecificData) {
      const confirmSwitch = window.confirm(
        `Switching category will discard all ${formData.user_type}-specific data. Continue?`
      );
      if (!confirmSwitch) return;
    }

    setFormData((prev) => ({
      ...prev,
      user_type: '',
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
      <div className="max-w-4xl mx-auto text-center py-24 px-4">
        <RefreshCw size={36} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Loading registration details...</p>
      </div>
    );
  }

  // =========================================================================
  // STEP 1: CATEGORY SELECTION SCREEN (When user_type is not yet selected)
  // =========================================================================
  if (!formData.user_type) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <div className="flex items-center justify-between mb-8">
          <button
            className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 text-xs font-bold hover:bg-white shadow-sm flex items-center gap-1.5 transition-all"
            onClick={onNavigateBack}
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            Step 1 of 2: Select Category
          </span>
        </div>

        <div className="text-center max-w-xl mx-auto mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            New Registration Portal
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Please choose the category of applicant you want to register. The registration form and compliance fields will adapt accordingly.
          </p>
        </div>

        {/* Category Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* BUILDER CARD */}
          <div
            onClick={() => handleSelectCategory('builder')}
            className="bg-white border-2 border-slate-200/90 hover:border-indigo-600 rounded-3xl p-7 shadow-card hover:shadow-card-hover cursor-pointer transition-all group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform" />
            
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm mb-5">
                <Building2 size={30} />
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                Corporate Entity
              </div>

              <h2 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                Real Estate Builder
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Register property builders, construction firms, and private developers with corporate credentials.
              </p>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Required Specifics:</div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>GSTIN Number (15 chars)</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>Corporate Entity PAN (C / F / P type)</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>Company Type &amp; Profile description</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
              <span>Open Builder Form</span>
              <ArrowRight size={16} />
            </div>
          </div>

          {/* BROKER CARD */}
          <div
            onClick={() => handleSelectCategory('broker')}
            className="bg-white border-2 border-slate-200/90 hover:border-emerald-600 rounded-3xl p-7 shadow-card hover:shadow-card-hover cursor-pointer transition-all group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform" />
            
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm mb-5">
                <Briefcase size={30} />
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                Individual Consultant
              </div>

              <h2 className="text-xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                Real Estate Broker
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Register independent brokers, real estate consultants, and channel partner agents.
              </p>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Required Specifics:</div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Personal PAN (4th letter must be "P")</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Professional Network Bio (50-500 chars)</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Years of Experience &amp; Expertise</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-emerald-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
              <span>Open Broker Form</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 2: CATEGORY-SPECIFIC FORM SCREEN
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Top Breadcrumb & Status Navigation */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm text-slate-700 text-xs font-bold hover:bg-white shadow-sm flex items-center gap-1.5 transition-all"
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
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleSwitchCategory}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              ← Change Category
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {formData.id && (
            <span className="text-xs font-mono font-medium text-slate-400">#REG-{String(formData.id).padStart(4, '0')}</span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase ${
              formData.status === 'submitted'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60 shadow-sm'
                : 'bg-amber-100 text-amber-800 border border-amber-300/60 shadow-sm'
            }`}
          >
            {formData.status === 'submitted' ? '✓ Submitted' : 'Draft In-Progress'}
          </span>
        </div>
      </div>

      {/* Read-only Banner for Submitted / Admin */}
      {isReadOnly && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 mb-6 flex items-center gap-3.5 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Lock size={18} className="text-indigo-300" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-200">
            {formData.status === 'submitted'
              ? 'This registration is finalized and submitted. All fields are locked in read-only audit mode.'
              : 'Administrator mode: Registrations can be inspected or audited, but creating/editing is reserved for Field Agents.'}
          </span>
        </div>
      )}

      {/* Sticky Completion Bar Header */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-card p-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
              formData.user_type === 'builder' ? 'bg-indigo-600 shadow-sm shadow-indigo-600/30' : 'bg-emerald-600 shadow-sm shadow-emerald-600/30'
            }`}>
              {formData.user_type === 'builder' ? <Building2 size={18} /> : <Briefcase size={18} />}
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base capitalize">
                {formData.user_type} Registration Form
              </span>
              <span className="text-[11px] text-slate-400 block -mt-0.5 font-medium">
                Rule R7: Completion Meter
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-2xl font-black tracking-tight ${
                completionPercentage === 100 ? 'text-emerald-600' : 'text-indigo-600'
              }`}
            >
              {completionPercentage}%
            </span>
          </div>
        </div>

        {/* Progress Bar with glow */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden my-2.5 p-0.5 border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              completionPercentage === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow-emerald'
                : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-400 shadow-glow'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 mt-2 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            {formData.user_type === 'broker' ? '16 required audit items' : '19 required audit items'}
          </span>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 ${formData.email_verified ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
              {formData.email_verified ? '✓ Email Verified' : '○ Email OTP'}
            </span>
            <span className={`inline-flex items-center gap-1 ${formData.mobile_verified ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
              {formData.mobile_verified ? '✓ Mobile Verified' : '○ Mobile OTP'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/20 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
              {formData.user_type} Details
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Please enter valid applicant information. Email and Mobile require dummy OTP verification (`123456`).
            </p>
          </div>
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${
            formData.user_type === 'builder' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {formData.user_type === 'builder' ? <Building2 size={13} /> : <Briefcase size={13} />}
            {formData.user_type} Profile
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* SECTION 1: COMMON DETAILS */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Identity &amp; Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="full_name">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                    errors.full_name
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                  }`}
                  placeholder="e.g. Ramesh K. Sharma"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  disabled={isReadOnly}
                  maxLength={60}
                />
                {errors.full_name ? (
                  <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.full_name}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">3–60 chars, letters, spaces and dots only</span>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="gender">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  id="gender"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                    errors.gender
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
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
                {errors.gender && <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.gender}</span>}
              </div>

              {/* Email with OTP Verify button */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="email">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="email"
                    type="email"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.email
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="person@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isReadOnly}
                  />
                  {formData.email_verified ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm">
                      <CheckCircle2 size={15} /> Verified
                    </span>
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        className="px-3.5 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1.5 shrink-0 transition-colors"
                        onClick={() => handleOpenOtpModal('email')}
                        disabled={!formData.email}
                      >
                        <ShieldCheck size={15} /> Verify
                      </button>
                    )
                  )}
                </div>
                {errors.email ? (
                  <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.email}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">Stored in lowercase; must be verified by OTP</span>
                )}
              </div>

              {/* Mobile with OTP Verify button */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="mobile">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all font-mono ${
                      errors.mobile
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="+91 98765 43210"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    disabled={isReadOnly}
                  />
                  {formData.mobile_verified ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm">
                      <CheckCircle2 size={15} /> Verified
                    </span>
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        className="px-3.5 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 flex items-center gap-1.5 shrink-0 transition-colors"
                        onClick={() => handleOpenOtpModal('mobile')}
                        disabled={!formData.mobile}
                      >
                        <ShieldCheck size={15} /> Verify
                      </button>
                    )
                  )}
                </div>
                {errors.mobile ? (
                  <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.mobile}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">10-digit Indian mobile starting with 6–9</span>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="dob">
                  Date of Birth <span className="text-rose-500">*</span>
                  {calculatedAge !== null && (
                    <span className="text-indigo-600 font-bold ml-1.5 bg-indigo-50 px-2 py-0.5 rounded-full text-[11px]">
                      {calculatedAge} yrs old
                    </span>
                  )}
                </label>
                <input
                  id="dob"
                  type="date"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                    errors.dob
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                  }`}
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                  disabled={isReadOnly}
                />
                {errors.dob ? (
                  <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.dob}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">Person is 18–100 years old today (India date)</span>
                )}
              </div>

              {/* Years of Experience */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="experience_years">
                  Years of Experience <span className="text-rose-500">*</span>
                </label>
                <input
                  id="experience_years"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="60"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                    errors.experience_years
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                  }`}
                  placeholder="e.g. 8"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', e.target.value)}
                  disabled={isReadOnly}
                />
                {errors.experience_years ? (
                  <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.experience_years}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">Whole number 0–60, and not more than (age − 18)</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Office Location &amp; Address
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="office_address">
                  Office Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="office_address"
                  rows={2}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                    errors.office_address
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                  }`}
                  placeholder="Street address, building, suite number..."
                  value={formData.office_address}
                  onChange={(e) => handleInputChange('office_address', e.target.value)}
                  disabled={isReadOnly}
                  maxLength={200}
                />
                <div className="flex justify-between text-xs mt-1">
                  {errors.office_address ? (
                    <span className="text-rose-600 font-medium">{errors.office_address}</span>
                  ) : (
                    <span className="text-slate-400">10–200 characters</span>
                  )}
                  <span className="text-slate-400 font-mono">{formData.office_address.length}/200</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="city">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.city
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="e.g. Pune"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={50}
                  />
                  {errors.city && <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.city}</span>}
                </div>

                {/* State */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="state">
                    State / UT <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="state"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.state
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
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
                  {errors.state && <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.state}</span>}
                </div>

                {/* Pincode */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="pincode">
                    Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 font-mono outline-none transition-all ${
                      errors.pincode
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="411001"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
                    disabled={isReadOnly}
                  />
                  {errors.pincode ? (
                    <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.pincode}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400 mt-1 block">6 digits; cannot start with 0</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: EXPERTISE & LANGUAGES */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Specializations &amp; Languages
              </h3>
            </div>

            {/* Languages Known */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-slate-700 block mb-2.5">
                Languages Known <span className="text-rose-500">*</span> (Select at least 1)
              </label>
              <div className="flex flex-wrap gap-2">
                {MANDATORY_LANGUAGES.map((lang) => {
                  const isChecked = formData.languages.includes(lang);
                  return (
                    <label
                      key={lang}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleLanguageToggle(lang)}
                        disabled={isReadOnly}
                        className="hidden"
                      />
                      {isChecked && <Check size={14} className="mr-1.5" />}
                      {lang}
                    </label>
                  );
                })}
              </div>
              {errors.languages && <span className="text-xs text-rose-600 font-medium mt-1.5 block">{errors.languages}</span>}
            </div>

            {/* Areas of Expertise */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2.5">
                Areas of Expertise <span className="text-rose-500">*</span> (Choose 1 to 3)
              </label>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_EXPERTISE.map((area) => {
                  const isChecked = formData.areas_of_expertise.includes(area);
                  return (
                    <label
                      key={area}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleExpertiseToggle(area)}
                        disabled={isReadOnly}
                        className="hidden"
                      />
                      {isChecked && <Check size={14} className="mr-1.5" />}
                      {area}
                    </label>
                  );
                })}
              </div>
              {errors.areas_of_expertise && (
                <span className="text-xs text-rose-600 font-medium mt-1.5 block">{errors.areas_of_expertise}</span>
              )}
            </div>
          </div>

          {/* SECTION 4: TYPE SPECIFIC DETAILS */}
          {formData.user_type === 'broker' ? (
            /* BROKER ONLY FIELDS (2) */
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Broker Specific Mandates
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="pan_number_broker">
                    Personal PAN Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pan_number_broker"
                    type="text"
                    maxLength={10}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 font-mono uppercase outline-none transition-all ${
                      errors.pan_number
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="ABCDE1234F"
                    value={formData.pan_number}
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                  />
                  {errors.pan_number ? (
                    <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.pan_number}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Individual broker: 4th letter must be "P" (e.g. ABCDP1234F)
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="about_broker">
                    About Professional Background <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="about_broker"
                    rows={3}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.about
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="Describe your background, real estate deals, and local network..."
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    {errors.about ? (
                      <span className="text-rose-600 font-medium">{errors.about}</span>
                    ) : (
                      <span className="text-slate-400">50–500 characters</span>
                    )}
                    <span className="text-slate-400 font-mono">{formData.about.length}/500</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* BUILDER ONLY FIELDS (5) */
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Builder Entity &amp; Compliance Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Company Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="company_name">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="company_name"
                    type="text"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.company_name
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="e.g. Prime Realty Developers Pvt Ltd"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={100}
                  />
                  {errors.company_name && <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.company_name}</span>}
                </div>

                {/* Company Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="company_type">
                    Company Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="company_type"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.company_type
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
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
                  {errors.company_type && <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.company_type}</span>}
                </div>

                {/* GST Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="gst_number">
                    GST Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="gst_number"
                    type="text"
                    maxLength={15}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 font-mono uppercase outline-none transition-all ${
                      errors.gst_number
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
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
                    <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.gst_number}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400 mt-1 block">15 chars (e.g. 09AAACP1234F1Z5)</span>
                  )}
                </div>

                {/* Builder PAN Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="pan_number_builder">
                    Company PAN Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pan_number_builder"
                    type="text"
                    maxLength={10}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 font-mono uppercase outline-none transition-all ${
                      errors.pan_number
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="AAACP1234F"
                    value={formData.pan_number}
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                  />
                  {errors.pan_number ? (
                    <span className="text-xs text-rose-600 font-medium mt-1 block">{errors.pan_number}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Must equal chars 3–12 of GST. 4th letter: C (Pvt Ltd), F (LLP/Partnership), P (Proprietorship)
                    </span>
                  )}
                </div>

                {/* About Company */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5" htmlFor="about_company">
                    About Company <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="about_company"
                    rows={3}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition-all ${
                      errors.about_company
                        ? 'border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white bg-slate-50/40'
                    }`}
                    placeholder="Describe completed projects, total square feet delivered, certifications..."
                    value={formData.about_company}
                    onChange={(e) => handleInputChange('about_company', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    {errors.about_company ? (
                      <span className="text-rose-600 font-medium">{errors.about_company}</span>
                    ) : (
                      <span className="text-slate-400">50–500 characters</span>
                    )}
                    <span className="text-slate-400 font-mono">{formData.about_company.length}/500</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS BAR */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              {formData.id && !isReadOnly && (
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleteLoading || saveLoading || submitLoading}
                >
                  <Trash2 size={15} />
                  <span>Delete Draft</span>
                </button>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {!isReadOnly ? (
                <>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-50 hover:border-slate-300 shadow-sm flex items-center gap-2 transition-all"
                    onClick={handleSaveDraft}
                    disabled={saveLoading || submitLoading}
                  >
                    <Save size={16} />
                    <span>{saveLoading ? 'Saving...' : 'Save Draft (R1)'}</span>
                  </button>

                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs sm:text-sm font-bold hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform active:scale-[0.98]"
                    onClick={handleSubmitRegistration}
                    disabled={saveLoading || submitLoading}
                  >
                    <Send size={16} />
                    <span>{submitLoading ? 'Submitting...' : 'Submit Registration (R2)'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all"
                  onClick={onNavigateBack}
                >
                  <ArrowLeft size={16} />
                  <span>Return to Reports</span>
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
