import React, { useState, useEffect, useMemo } from 'react';
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

import RegistrationHeader from '../components/registration/RegistrationHeader';
import CompletionMeter from '../components/registration/CompletionMeter';
import CategorySelector from '../components/registration/CategorySelector';
import PersonalDetailsSection from '../components/registration/PersonalDetailsSection';
import ProfessionalSection from '../components/registration/ProfessionalSection';
import BrokerDetailsSection from '../components/registration/BrokerDetailsSection';
import BuilderDetailsSection from '../components/registration/BuilderDetailsSection';
import FormActions from '../components/registration/FormActions';

const INITIAL_FORM = {
  user_type: 'builder',
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
  about: '',
  company_name: '',
  company_type: '',
  gst_number: '',
  pan_number: '',
  about_company: '',
  status: 'draft',
  completion: 0
};

function formatDob(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.includes('T') ? val.split('T')[0] : val.slice(0, 10);
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch (e) {}
  return '';
}

function cleanRecord(data) {
  if (!data) return INITIAL_FORM;
  return {
    ...INITIAL_FORM,
    ...data,
    full_name: data.full_name || '',
    email: data.email || '',
    email_verified: Boolean(data.email_verified),
    mobile: data.mobile || '',
    mobile_verified: Boolean(data.mobile_verified),
    gender: data.gender || '',
    dob: formatDob(data.dob),
    office_address: data.office_address || '',
    city: data.city || '',
    state: data.state || '',
    pincode: data.pincode || '',
    experience_years: data.experience_years !== null && data.experience_years !== undefined ? data.experience_years : '',
    languages: Array.isArray(data.languages) ? data.languages : [],
    areas_of_expertise: Array.isArray(data.areas_of_expertise) ? data.areas_of_expertise : [],
    pan_number: data.pan_number || '',
    about: data.about || '',
    company_name: data.company_name || '',
    company_type: data.company_type || '',
    gst_number: data.gst_number || '',
    about_company: data.about_company || ''
  };
}

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

  const [otpModal, setOtpModal] = useState({
    isOpen: false,
    channel: null,
    targetValue: '',
    registrationId: null
  });

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
        setFormData(cleanRecord(record));
        setIsDirty(false);
      } catch (err) {
        showToast(err.message || 'Error loading registration', 'error');
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

    let updatedValue = value;
    if (field === 'pan_number' || field === 'gst_number') {
      updatedValue = (value || '').toUpperCase();
    }

    let revokedVerify = {};
    if (field === 'email' && formData.email_verified && value !== formData.email) {
      revokedVerify = { email_verified: false };
      showToast('Email modified. Please verify with OTP again.', 'info');
    }
    if (field === 'mobile' && formData.mobile_verified && value !== formData.mobile) {
      revokedVerify = { mobile_verified: false };
      showToast('Mobile modified. Please verify with OTP again.', 'info');
    }

    const nextForm = {
      ...formData,
      [field]: updatedValue,
      ...revokedVerify
    };

    setFormData(nextForm);

    const fieldError = validateField(field, updatedValue, nextForm);
    setErrors((prev) => {
      const copy = { ...prev };
      if (fieldError) {
        copy[field] = fieldError;
      } else {
        delete copy[field];
      }
      return copy;
    });
  };

  const handleTypeSwitch = (newType) => {
    if (isReadOnly || formData.user_type === newType) return;

    if (isDirty) {
      const confirmed = window.confirm(
        'Switching category resets category-specific fields (Builder/Broker details). Continue?'
      );
      if (!confirmed) return;
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

      setFormData((prev) => cleanRecord({
        ...prev,
        ...savedRecord
      }));
      setIsDirty(false);
    } catch (err) {
      if (err.code === 'DUPLICATE_MOBILE') {
        setErrors((prev) => ({ ...prev, mobile: err.message }));
      } else if (err.code === 'DUPLICATE_EMAIL') {
        setErrors((prev) => ({ ...prev, email: err.message }));
      } else if (err.fields) {
        setErrors(err.fields);
      }
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
        setFormData((prev) => cleanRecord({ ...prev, ...saved }));
      } catch (err) {
        setSubmitLoading(false);
        if (err.code === 'DUPLICATE_MOBILE') {
          setErrors((prev) => ({ ...prev, mobile: err.message }));
        } else if (err.code === 'DUPLICATE_EMAIL') {
          setErrors((prev) => ({ ...prev, email: err.message }));
        } else if (err.fields) {
          setErrors(err.fields);
        }
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
      await api.updateDraft(currentId, formData);
      await api.submitRegistration(currentId, formData);
      setFormData(INITIAL_FORM);
      setIsDirty(false);
      setErrors({});
      showToast('Registration submitted successfully!', 'success');
    } catch (err) {
      if (err.code === 'DUPLICATE_MOBILE') {
        setErrors((prev) => ({ ...prev, mobile: err.message }));
      } else if (err.code === 'DUPLICATE_EMAIL') {
        setErrors((prev) => ({ ...prev, email: err.message }));
      } else if (err.fields) {
        setErrors(err.fields);
      }
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
      showToast(`Please enter a valid ${channel === 'email' ? 'Email Address' : 'Mobile Number'} first`, 'error');
      return;
    }

    const hasName = formData.full_name && String(formData.full_name).trim().length >= 3;
    const hasMobile = formData.mobile && normaliseMobile(formData.mobile).length === 10;
    if (!hasName && !hasMobile) {
      setErrors((prev) => ({
        ...prev,
        full_name: 'Enter Full Name (at least 3 characters) to save draft'
      }));
      showToast('Enter Full Name (at least 3 characters) before sending OTP', 'info');
      return;
    }

    let activeRegId = formData.id;
    try {
      setSaveLoading(true);
      if (!activeRegId) {
        const saved = await api.createDraft(formData);
        activeRegId = saved.id;
        setFormData((prev) => cleanRecord({ ...prev, ...saved }));
      } else {
        const saved = await api.updateDraft(activeRegId, formData);
        setFormData((prev) => cleanRecord({ ...prev, ...saved }));
      }
      setIsDirty(false);
    } catch (err) {
      if (err.code === 'DUPLICATE_MOBILE') {
        setErrors((prev) => ({ ...prev, mobile: err.message }));
      } else if (err.code === 'DUPLICATE_EMAIL') {
        setErrors((prev) => ({ ...prev, email: err.message }));
      } else if (err.fields) {
        setErrors(err.fields);
      }
      showToast(err.message || 'Failed to initialize draft for OTP', 'error');
      return;
    } finally {
      setSaveLoading(false);
    }

    setOtpModal({
      isOpen: true,
      channel,
      targetValue: channel === 'email' ? formData.email : formData.mobile,
      registrationId: activeRegId
    });
  };

  const handleOtpSuccess = (channel, updatedReg) => {
    setFormData((prev) => ({
      ...prev,
      ...(channel === 'email' ? { email_verified: true } : { mobile_verified: true })
    }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[channel];
      return copy;
    });
    setOtpModal({ isOpen: false, channel: null, targetValue: '', registrationId: null });
    showToast(`${channel === 'email' ? 'Email' : 'Mobile'} verified successfully!`, 'success');
  };

  const handleDeleteDraft = async (id, reason) => {
    try {
      setDeleteLoading(true);
      await api.deleteRegistration(id, reason);
      showToast('Draft deleted successfully', 'success');
      setShowDeleteModal(false);
      onNavigateBack();
    } catch (err) {
      showToast(err.message || 'Error deleting draft', 'error');
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
      <RegistrationHeader
        formData={formData}
        isDirty={isDirty}
        isReadOnly={isReadOnly}
        onNavigateBack={onNavigateBack}
      />

      <CompletionMeter
        formData={formData}
        completionPercentage={completionPercentage}
      />

      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <CategorySelector
          userType={formData.user_type}
          onTypeSwitch={handleTypeSwitch}
          isReadOnly={isReadOnly}
          error={errors.user_type}
        />

        <div className="p-4 sm:p-6 space-y-6">
          <PersonalDetailsSection
            formData={formData}
            errors={errors}
            isReadOnly={isReadOnly}
            calculatedAge={calculatedAge}
            onInputChange={handleInputChange}
            onOpenOtpModal={handleOpenOtpModal}
          />

          <ProfessionalSection
            languages={formData.languages}
            areasOfExpertise={formData.areas_of_expertise}
            errors={errors}
            isReadOnly={isReadOnly}
            onLanguageToggle={handleLanguageToggle}
            onExpertiseToggle={handleExpertiseToggle}
          />

          {formData.user_type === 'broker' ? (
            <BrokerDetailsSection
              formData={formData}
              errors={errors}
              isReadOnly={isReadOnly}
              onInputChange={handleInputChange}
            />
          ) : (
            <BuilderDetailsSection
              formData={formData}
              errors={errors}
              isReadOnly={isReadOnly}
              onInputChange={handleInputChange}
            />
          )}

          <FormActions
            formData={formData}
            isReadOnly={isReadOnly}
            saveLoading={saveLoading}
            submitLoading={submitLoading}
            deleteLoading={deleteLoading}
            onSaveDraft={handleSaveDraft}
            onSubmitRegistration={handleSubmitRegistration}
            onOpenDeleteModal={() => setShowDeleteModal(true)}
            onNavigateBack={onNavigateBack}
          />
        </div>
      </div>

      {otpModal.isOpen && (
        <OtpModal
          registrationId={otpModal.registrationId || formData.id}
          channel={otpModal.channel}
          targetValue={otpModal.targetValue}
          onClose={() => setOtpModal({ isOpen: false, channel: null, targetValue: '', registrationId: null })}
          onSuccess={handleOtpSuccess}
        />
      )}

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
