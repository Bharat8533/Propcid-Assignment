import { INDIAN_STATES_AND_UTS, MANDATORY_LANGUAGES, AREAS_OF_EXPERTISE, COMPANY_TYPES } from '../constants/indianData';

export function normaliseMobile(val) {
  if (!val) return '';
  const str = String(val).replace(/[\s\-\+]/g, '');
  return (str.startsWith('91') && str.length > 10 ? str.slice(2) : str).trim();
}

export function calculateAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr), now = new Date();
  if (isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function validateField(name, value, form = {}) {
  if (value === undefined || value === null || value === '') return null;
  const val = typeof value === 'string' ? value.trim() : value;
  const len = (min, max) => val.length < min || val.length > max ? `Must be between ${min} and ${max} characters` : null;

  switch (name) {
    case 'full_name':
      return len(3, 60) || (!/^[a-zA-Z\s.]+$/.test(val) ? 'Only letters, spaces, and dots allowed' : null);
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? null : 'Invalid email address';
    case 'mobile':
      return /^[6-9]\d{9}$/.test(normaliseMobile(val)) ? null : 'Must be 10 digits starting with 6-9';
    case 'gender':
      return ['Male', 'Female', 'Other'].includes(val) ? null : 'Select a valid gender';
    case 'dob': {
      const age = calculateAge(val);
      return (age === null || age < 18 || age > 100) ? 'Age must be between 18 and 100 years old' : null;
    }
    case 'office_address': return len(10, 200);
    case 'city': return len(2, 50);
    case 'state': return INDIAN_STATES_AND_UTS.includes(val) ? null : 'Select a valid State/UT';
    case 'pincode': return /^[1-9]\d{5}$/.test(val) ? null : 'Must be 6 digits and cannot start with 0';
    case 'experience_years': {
      const exp = Number(val), age = calculateAge(form.dob);
      if (isNaN(exp) || exp < 0 || exp > 60 || !Number.isInteger(exp)) return 'Must be a whole number between 0 and 60';
      if (age && exp > (age - 18)) return `Cannot exceed age - 18 (${age - 18} years max)`;
      return null;
    }
    case 'languages':
      return (!Array.isArray(val) || !val.length) ? 'Select at least 1 language'
        : val.some(l => !MANDATORY_LANGUAGES.includes(l)) ? 'Invalid language selected' : null;
    case 'areas_of_expertise':
      return (!Array.isArray(val) || val.length < 1 || val.length > 3) ? 'Choose 1 to 3 areas of expertise'
        : val.some(a => !AREAS_OF_EXPERTISE.includes(a)) ? 'Invalid area selected' : null;
    case 'company_name': return len(2, 100);
    case 'company_type': return COMPANY_TYPES.includes(val) ? null : 'Select a valid company type';
    case 'gst_number':
      return /^(0[1-9]|[1-2][0-9]|3[0-8])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(val).toUpperCase())
        ? null : 'Invalid GST (State code 01-38 + PAN + 1 char + Z + 1 char)';
    case 'about':
    case 'about_company':
      return len(50, 500);
    default:
      return null;
  }
}

export function getRequiredFields(userType) {
  const common = [
    'full_name', 'email', 'mobile', 'gender', 'dob',
    'office_address', 'city', 'state', 'pincode',
    'experience_years', 'languages', 'areas_of_expertise'
  ];
  if (userType === 'broker') return [...common, 'pan_number', 'about'];
  if (userType === 'builder') return [...common, 'company_name', 'company_type', 'gst_number', 'pan_number', 'about_company'];
  return common;
}

export function validateDraft(formData) {
  const errors = {};
  if (!formData.user_type) errors.user_type = 'Select Builder or Broker';

  const hasName = formData.full_name?.trim()?.length > 0;
  const hasMobile = normaliseMobile(formData.mobile).length > 0;
  if (!hasName && !hasMobile) {
    errors.full_name = errors.mobile = 'Enter Full name or Mobile to save draft';
  }

  getRequiredFields(formData.user_type).forEach(f => {
    const val = formData[f];
    if (val !== undefined && val !== null && val !== '') {
      const err = validateField(f, val, formData);
      if (err) errors[f] = err;
    }
  });

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateSubmit(formData) {
  const errors = {};
  if (!formData.user_type) {
    return { isValid: false, errors: { user_type: 'Select Builder or Broker' } };
  }

  getRequiredFields(formData.user_type).forEach(f => {
    const val = formData[f];
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) {
      errors[f] = 'This field is required';
    } else {
      const err = validateField(f, val, formData);
      if (err) errors[f] = err;
    }
  });

  if (!formData.email_verified) errors.email = 'Email must be verified by OTP';
  if (!formData.mobile_verified) errors.mobile = 'Mobile must be verified by OTP';

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function calculateCompletion(formData) {
  if (formData.status === 'submitted') return 100;
  if (!formData.user_type) return 0;

  const fields = getRequiredFields(formData.user_type);
  const validFieldsCount = fields.filter(f => {
    const val = formData[f];
    return val !== undefined && val !== null && val !== '' &&
      (!Array.isArray(val) || val.length > 0) &&
      !validateField(f, val, formData);
  }).length;

  const validVerifications = (formData.email_verified ? 1 : 0) + (formData.mobile_verified ? 1 : 0);
  const totalPossible = formData.user_type === 'broker' ? 16 : 19;
  return Math.min(100, Math.floor(((validFieldsCount + validVerifications) / totalPossible) * 100));
}

export function isDraftStale(updatedAt, status) {
  if (status !== 'draft' || !updatedAt) return false;
  return (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24) > 7;
}
