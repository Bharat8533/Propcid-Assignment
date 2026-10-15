import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2, Briefcase, CheckCircle2, AlertCircle, Save, Send,
  Trash2, ShieldCheck, ArrowLeft, RefreshCw, Lock, Sparkles, Check
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
  pan_number: '', // shared field name, validated differently
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
    channel: null, // 'email' | 'mobile'
    targetValue: ''
  });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load existing registration if ID passed
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

  // Warn before browser tab reload / close if dirty
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

  // Handle Input Changes
  const handleInputChange = (field, value) => {
    if (isReadOnly) return;
    setIsDirty(true);

    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Rule R4: Verification follows the value
      // If email or mobile is changed after it was verified, clear verification
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

      // If user is Builder, auto-uppercase PAN and GST
      if (field === 'pan_number' || field === 'gst_number') {
        next[field] = String(value).toUpperCase();
      }

      return next;
    });

    // Clear individual field error if user types
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Switch User Type (Builder vs Broker)
  const handleTypeSwitch = (newType) => {
    if (isReadOnly || formData.user_type === newType) return;

    const hasSpecificData =
      (formData.user_type === 'broker' && (formData.pan_number || formData.about)) ||
      (formData.user_type === 'builder' &&
        (formData.company_name || formData.company_type || formData.gst_number || formData.pan_number || formData.about_company));

    if (hasSpecificData) {
      const confirmSwitch = window.confirm(
        `Switching to ${newType.toUpperCase()} will discard existing ${formData.user_type} specific fields. Continue?`
      );
      if (!confirmSwitch) return;
    }

    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      user_type: newType,
      // Discard type-specific values as required by spec
      pan_number: '',
      about: '',
      company_name: '',
      company_type: '',
      gst_number: '',
      about_company: ''
    }));

    // Reset errors
    setErrors({});
  };

  // Toggle multi-select languages
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

  // Toggle multi-select areas of expertise (1 to 3 max)
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

  // Save Draft (Rule R1)
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
      if (err.fields) {
        setErrors(err.fields);
      }
      showToast(err.message || 'Error saving draft', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Submit Registration (Rule R2)
  const handleSubmitRegistration = async () => {
    // If not saved yet, save draft first so we have an ID
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

    // Run full submission validation
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

  // Trigger OTP modal
  const handleOpenOtpModal = async (channel) => {
    const val = channel === 'email' ? formData.email : formData.mobile;
    const err = validateField(channel, val, formData);
    if (!val || err) {
      setErrors((prev) => ({ ...prev, [channel]: err || 'Enter a valid value first' }));
      showToast(`Please enter a valid ${channel} before requesting OTP`, 'error');
      return;
    }

    // If unsaved new draft, save draft first to get registration ID (R3 requires currently saved draft)
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

  // Delete draft handler
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
      <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <RefreshCw size={32} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading registration details...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '960px' }}>
      {/* Top Breadcrumb & Status Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          className="btn btn-secondary btn-sm"
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
          <ArrowLeft size={16} />
          <span>Back to List</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {formData.id && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Registration #{formData.id}
            </span>
          )}
          <span className={`status-pill ${formData.status === 'submitted' ? 'status-submitted' : 'status-draft'}`}>
            {formData.status === 'submitted' ? '✓ Submitted (Read-only)' : 'Draft'}
          </span>
        </div>
      </div>

      {/* Read-only Banner for Submitted / Admin */}
      {isReadOnly && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <Lock size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {formData.status === 'submitted'
              ? 'This registration has been fully submitted and is locked for auditing. Fields are read-only.'
              : 'Admin accounts have read-only permissions for registrations.'}
          </span>
        </div>
      )}

      {/* Sticky Completion Bar Header */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Registration Completion (Rule R7)
            </span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: completionPercentage === 100 ? 'var(--emerald)' : 'var(--primary)' }}>
            {completionPercentage}%
          </span>
        </div>

        <div className="progress-container">
          <div
            className="progress-bar-fill"
            style={{
              width: `${completionPercentage}%`,
              background: completionPercentage === 100 ? 'var(--emerald)' : 'linear-gradient(90deg, #3b82f6, #10b981)'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          <span>
            {formData.user_type === 'broker' ? '16 items required' : '19 items required'}
          </span>
          <span>
            Email: {formData.email_verified ? '✓ Verified' : 'Pending'} • Mobile: {formData.mobile_verified ? '✓ Verified' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Registration Form</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Select user type and fill the mandatory registration fields.
            </p>
          </div>
        </div>

        <div className="card-body">
          {/* USER TYPE SELECTOR TABS */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              User Type <span className="required-dot">*</span>
            </label>
            <div className="type-selector-tabs">
              <button
                type="button"
                className={`type-tab-btn ${formData.user_type === 'builder' ? 'active' : ''}`}
                onClick={() => handleTypeSwitch('builder')}
                disabled={isReadOnly}
              >
                <Building2 size={24} />
                <span>Real Estate Builder</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.85 }}>
                  Companies &amp; Developers (GST &amp; Corporate PAN)
                </span>
              </button>

              <button
                type="button"
                className={`type-tab-btn ${formData.user_type === 'broker' ? 'active' : ''}`}
                onClick={() => handleTypeSwitch('broker')}
                disabled={isReadOnly}
              >
                <Briefcase size={24} />
                <span>Real Estate Broker</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.85 }}>
                  Individual Consultant (Personal PAN)
                </span>
              </button>
            </div>
            {errors.user_type && <span className="field-error">{errors.user_type}</span>}
          </div>

          {/* SECTION 1: COMMON DETAILS */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              1. Basic &amp; Contact Information
            </h3>

            <div className="form-grid form-grid-2">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="full_name">
                  Full Name <span className="required-dot">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  className={`form-control ${errors.full_name ? 'has-error' : ''}`}
                  placeholder="e.g. Ramesh K. Sharma"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  disabled={isReadOnly}
                  maxLength={60}
                />
                {errors.full_name ? (
                  <span className="field-error">{errors.full_name}</span>
                ) : (
                  <span className="field-hint">3–60 chars, letters, spaces and dots only</span>
                )}
              </div>

              {/* Gender */}
              <div className="form-group">
                <label className="form-label" htmlFor="gender">
                  Gender <span className="required-dot">*</span>
                </label>
                <select
                  id="gender"
                  className={`form-control ${errors.gender ? 'has-error' : ''}`}
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="field-error">{errors.gender}</span>}
              </div>

              {/* Email with OTP Verify button */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address <span className="required-dot">*</span>
                </label>
                <div className="input-with-action">
                  <input
                    id="email"
                    type="email"
                    className={`form-control ${errors.email ? 'has-error' : ''}`}
                    placeholder="person@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isReadOnly}
                  />
                  {formData.email_verified ? (
                    <span className="badge-verified">
                      <CheckCircle2 size={15} /> Verified
                    </span>
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenOtpModal('email')}
                        disabled={!formData.email}
                      >
                        <ShieldCheck size={15} /> Verify
                      </button>
                    )
                  )}
                </div>
                {errors.email ? (
                  <span className="field-error">{errors.email}</span>
                ) : (
                  <span className="field-hint">Stored in lowercase; must be OTP-verified</span>
                )}
              </div>

              {/* Mobile with OTP Verify button */}
              <div className="form-group">
                <label className="form-label" htmlFor="mobile">
                  Mobile Number <span className="required-dot">*</span>
                </label>
                <div className="input-with-action">
                  <input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    className={`form-control ${errors.mobile ? 'has-error' : ''}`}
                    placeholder="+91 98765 43210"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    disabled={isReadOnly}
                  />
                  {formData.mobile_verified ? (
                    <span className="badge-verified">
                      <CheckCircle2 size={15} /> Verified
                    </span>
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenOtpModal('mobile')}
                        disabled={!formData.mobile}
                      >
                        <ShieldCheck size={15} /> Verify
                      </button>
                    )
                  )}
                </div>
                {errors.mobile ? (
                  <span className="field-error">{errors.mobile}</span>
                ) : (
                  <span className="field-hint">10 digits starting with 6–9; OTP-verified</span>
                )}
              </div>

              {/* Date of Birth */}
              <div className="form-group">
                <label className="form-label" htmlFor="dob">
                  Date of Birth <span className="required-dot">*</span>
                  {calculatedAge !== null && (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      ({calculatedAge} yrs old)
                    </span>
                  )}
                </label>
                <input
                  id="dob"
                  type="date"
                  className={`form-control ${errors.dob ? 'has-error' : ''}`}
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                  disabled={isReadOnly}
                />
                {errors.dob ? (
                  <span className="field-error">{errors.dob}</span>
                ) : (
                  <span className="field-hint">Must be 18–100 years old today (India date)</span>
                )}
              </div>

              {/* Years of Experience */}
              <div className="form-group">
                <label className="form-label" htmlFor="experience_years">
                  Years of Experience <span className="required-dot">*</span>
                </label>
                <input
                  id="experience_years"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="60"
                  className={`form-control ${errors.experience_years ? 'has-error' : ''}`}
                  placeholder="e.g. 8"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', e.target.value)}
                  disabled={isReadOnly}
                />
                {errors.experience_years ? (
                  <span className="field-error">{errors.experience_years}</span>
                ) : (
                  <span className="field-hint">0–60, and not more than (age − 18)</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              2. Office Location &amp; Address
            </h3>

            <div className="form-grid">
              {/* Office Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="office_address">
                  Office Address <span className="required-dot">*</span>
                </label>
                <textarea
                  id="office_address"
                  rows={2}
                  className={`form-control ${errors.office_address ? 'has-error' : ''}`}
                  placeholder="Street address, building, suite number..."
                  value={formData.office_address}
                  onChange={(e) => handleInputChange('office_address', e.target.value)}
                  disabled={isReadOnly}
                  maxLength={200}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {errors.office_address ? (
                    <span className="field-error">{errors.office_address}</span>
                  ) : (
                    <span className="field-hint">10–200 characters</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formData.office_address.length}/200
                  </span>
                </div>
              </div>

              <div className="form-grid form-grid-3">
                {/* City */}
                <div className="form-group">
                  <label className="form-label" htmlFor="city">
                    City <span className="required-dot">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    className={`form-control ${errors.city ? 'has-error' : ''}`}
                    placeholder="e.g. Pune"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={50}
                  />
                  {errors.city ? (
                    <span className="field-error">{errors.city}</span>
                  ) : (
                    <span className="field-hint">2–50 characters</span>
                  )}
                </div>

                {/* State */}
                <div className="form-group">
                  <label className="form-label" htmlFor="state">
                    State / UT <span className="required-dot">*</span>
                  </label>
                  <select
                    id="state"
                    className={`form-control ${errors.state ? 'has-error' : ''}`}
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
                  {errors.state && <span className="field-error">{errors.state}</span>}
                </div>

                {/* Pincode */}
                <div className="form-group">
                  <label className="form-label" htmlFor="pincode">
                    Pincode <span className="required-dot">*</span>
                  </label>
                  <input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className={`form-control ${errors.pincode ? 'has-error' : ''}`}
                    placeholder="411001"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
                    disabled={isReadOnly}
                  />
                  {errors.pincode ? (
                    <span className="field-error">{errors.pincode}</span>
                  ) : (
                    <span className="field-hint">6 digits; cannot start with 0</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: EXPERTISE & LANGUAGES */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              3. Languages &amp; Areas of Expertise
            </h3>

            {/* Languages Known */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">
                Languages Known <span className="required-dot">*</span> (Select at least 1)
              </label>
              <div className="pill-group">
                {MANDATORY_LANGUAGES.map((lang) => {
                  const isChecked = formData.languages.includes(lang);
                  return (
                    <label
                      key={lang}
                      className={`pill-label ${isChecked ? 'selected' : ''}`}
                      style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleLanguageToggle(lang)}
                        disabled={isReadOnly}
                      />
                      {isChecked && <Check size={14} style={{ marginRight: '4px' }} />}
                      {lang}
                    </label>
                  );
                })}
              </div>
              {errors.languages && <span className="field-error">{errors.languages}</span>}
            </div>

            {/* Areas of Expertise */}
            <div className="form-group">
              <label className="form-label">
                Areas of Expertise <span className="required-dot">*</span> (Choose 1 to 3)
              </label>
              <div className="pill-group">
                {AREAS_OF_EXPERTISE.map((area) => {
                  const isChecked = formData.areas_of_expertise.includes(area);
                  return (
                    <label
                      key={area}
                      className={`pill-label ${isChecked ? 'selected' : ''}`}
                      style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleExpertiseToggle(area)}
                        disabled={isReadOnly}
                      />
                      {isChecked && <Check size={14} style={{ marginRight: '4px' }} />}
                      {area}
                    </label>
                  );
                })}
              </div>
              {errors.areas_of_expertise && (
                <span className="field-error">{errors.areas_of_expertise}</span>
              )}
            </div>
          </div>

          {/* SECTION 4: TYPE SPECIFIC DETAILS */}
          {formData.user_type === 'broker' ? (
            /* BROKER ONLY FIELDS (2) */
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                4. Broker Specific Details
              </h3>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="pan_number_broker">
                    Personal PAN Number <span className="required-dot">*</span>
                  </label>
                  <input
                    id="pan_number_broker"
                    type="text"
                    maxLength={10}
                    className={`form-control ${errors.pan_number ? 'has-error' : ''}`}
                    placeholder="ABCDE1234F"
                    value={formData.pan_number}
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                  {errors.pan_number ? (
                    <span className="field-error">{errors.pan_number}</span>
                  ) : (
                    <span className="field-hint">Individual broker: 4th letter must be "P" (e.g. ABCDP1234F)</span>
                  )}
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="about_broker">
                    About Professional Background <span className="required-dot">*</span>
                  </label>
                  <textarea
                    id="about_broker"
                    rows={3}
                    className={`form-control ${errors.about ? 'has-error' : ''}`}
                    placeholder="Describe your background, real estate deals, and local network..."
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={500}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {errors.about ? (
                      <span className="field-error">{errors.about}</span>
                    ) : (
                      <span className="field-hint">50–500 characters</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formData.about.length}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* BUILDER ONLY FIELDS (5) */
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                4. Builder &amp; Company Specific Details
              </h3>

              <div className="form-grid form-grid-2">
                {/* Company Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="company_name">
                    Company Name <span className="required-dot">*</span>
                  </label>
                  <input
                    id="company_name"
                    type="text"
                    className={`form-control ${errors.company_name ? 'has-error' : ''}`}
                    placeholder="e.g. Prime Realty Developers Pvt Ltd"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={100}
                  />
                  {errors.company_name ? (
                    <span className="field-error">{errors.company_name}</span>
                  ) : (
                    <span className="field-hint">2–100 characters</span>
                  )}
                </div>

                {/* Company Type */}
                <div className="form-group">
                  <label className="form-label" htmlFor="company_type">
                    Company Type <span className="required-dot">*</span>
                  </label>
                  <select
                    id="company_type"
                    className={`form-control ${errors.company_type ? 'has-error' : ''}`}
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
                  {errors.company_type && (
                    <span className="field-error">{errors.company_type}</span>
                  )}
                </div>

                {/* GST Number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="gst_number">
                    GST Number <span className="required-dot">*</span>
                  </label>
                  <input
                    id="gst_number"
                    type="text"
                    maxLength={15}
                    className={`form-control ${errors.gst_number ? 'has-error' : ''}`}
                    placeholder="09AAACP1234F1Z5"
                    value={formData.gst_number}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      handleInputChange('gst_number', val);
                      // Convenience: autofill PAN if 10-char PAN inside GST exists
                      if (val.length >= 12 && !formData.pan_number) {
                        handleInputChange('pan_number', val.substring(2, 12));
                      }
                    }}
                    disabled={isReadOnly}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                  {errors.gst_number ? (
                    <span className="field-error">{errors.gst_number}</span>
                  ) : (
                    <span className="field-hint">15 chars (e.g. 09AAACP1234F1Z5)</span>
                  )}
                </div>

                {/* Builder PAN Number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="pan_number_builder">
                    Company PAN Number <span className="required-dot">*</span>
                  </label>
                  <input
                    id="pan_number_builder"
                    type="text"
                    maxLength={10}
                    className={`form-control ${errors.pan_number ? 'has-error' : ''}`}
                    placeholder="AAACP1234F"
                    value={formData.pan_number}
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                    disabled={isReadOnly}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                  {errors.pan_number ? (
                    <span className="field-error">{errors.pan_number}</span>
                  ) : (
                    <span className="field-hint">
                      Must equal chars 3–12 of GST. 4th letter: C (Pvt Ltd), F (LLP/Partnership), P (Proprietorship)
                    </span>
                  )}
                </div>

                {/* About Company */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="about_company">
                    About Company <span className="required-dot">*</span>
                  </label>
                  <textarea
                    id="about_company"
                    rows={3}
                    className={`form-control ${errors.about_company ? 'has-error' : ''}`}
                    placeholder="Describe completed projects, total square feet delivered, certifications..."
                    value={formData.about_company}
                    onChange={(e) => handleInputChange('about_company', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={500}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {errors.about_company ? (
                      <span className="field-error">{errors.about_company}</span>
                    ) : (
                      <span className="field-hint">50–500 characters</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formData.about_company.length}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS BAR */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Delete button (if existing draft) */}
            <div>
              {formData.id && !isReadOnly && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleteLoading || saveLoading || submitLoading}
                >
                  <Trash2 size={16} />
                  <span>Delete Draft</span>
                </button>
              )}
            </div>

            {/* Save & Submit Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!isReadOnly ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSaveDraft}
                    disabled={saveLoading || submitLoading}
                  >
                    <Save size={16} />
                    <span>{saveLoading ? 'Saving...' : 'Save as Draft (R1)'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
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
                  className="btn btn-secondary"
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
