import { INDIAN_STATES_AND_UTS, MANDATORY_LANGUAGES, AREAS_OF_EXPERTISE, COMPANY_TYPES } from '../constants/indianData';

// Normalise mobile: remove +91, spaces, hyphens
export function normaliseMobile(val) {
  if (!val) return '';
  let str = String(val).replace(/[\s\-\+]/g, '');
  if (str.startsWith('91') && str.length > 10) {
    str = str.slice(2);
  }
  return str.trim();
}

// Calculate age from YYYY-MM-DD
export function calculateAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Validate individual field
export function validateField(name, value, form = {}) {
  if (value === undefined || value === null || value === '') return null;
  const val = typeof value === 'string' ? value.trim() : value;

  switch (name) {
    case 'full_name':
      if (val.length < 3 || val.length > 60) return 'Must be between 3 and 60 characters';
      if (!/^[a-zA-Z\s.]+$/.test(val)) return 'Only letters, spaces, and dots allowed';
      return null;

    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email address';
      return null;

    case 'mobile':
      if (!/^[6-9]\d{9}$/.test(normaliseMobile(val))) return 'Must be 10 digits starting with 6-9';
      return null;

    case 'gender':
      if (!['Male', 'Female', 'Other'].includes(val)) return 'Select a valid gender';
      return null;

    case 'dob': {
      const age = calculateAge(val);
      if (age === null || age < 18 || age > 100) return 'Age must be between 18 and 100 years old';
      return null;
    }

    case 'office_address':
      if (val.length < 10 || val.length > 200) return 'Must be between 10 and 200 characters';
      return null;

    case 'city':
      if (val.length < 2 || val.length > 50) return 'Must be between 2 and 50 characters';
      return null;

    case 'state':
      if (!INDIAN_STATES_AND_UTS.includes(val)) return 'Select a valid State/UT';
      return null;

    case 'pincode':
      if (!/^[1-9]\d{5}$/.test(val)) return 'Must be 6 digits and cannot start with 0';
      return null;

    case 'experience_years': {
      const exp = Number(val);
      if (isNaN(exp) || exp < 0 || exp > 60 || !Number.isInteger(exp)) {
        return 'Must be a whole number between 0 and 60';
      }
      if (form.dob) {
        const age = calculateAge(form.dob);
        if (age && exp > (age - 18)) return `Cannot exceed age - 18 (${age - 18} years max)`;
      }
      return null;
    }

    case 'languages':
      if (!Array.isArray(val) || val.length === 0) return 'Select at least 1 language';
      if (val.some(l => !MANDATORY_LANGUAGES.includes(l))) return 'Invalid language selected';
      return null;

    case 'areas_of_expertise':
      if (!Array.isArray(val) || val.length < 1 || val.length > 3) return 'Choose 1 to 3 areas of expertise';
      if (val.some(a => !AREAS_OF_EXPERTISE.includes(a))) return 'Invalid area selected';
      return null;

    // Broker fields
    case 'pan_number': {
      const pan = String(val).toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return 'Invalid PAN format (e.g. ABCDE1234F)';
      if (form.user_type === 'broker') {
        if (pan[3] !== 'P') return 'Broker is an individual, 4th letter must be "P"';
      } else if (form.user_type === 'builder') {
        if (form.gst_number) {
          const expectedPan = form.gst_number.substring(2, 12).toUpperCase();
          if (pan !== expectedPan) return `Must match characters 3-12 of GST (${expectedPan})`;
        }
        const cType = form.company_type;
        if (cType === 'Private Limited' && pan[3] !== 'C') return '4th letter must be "C" for Private Limited';
        if ((cType === 'LLP' || cType === 'Partnership') && pan[3] !== 'F') return '4th letter must be "F" for LLP/Partnership';
        if (cType === 'Proprietorship' && pan[3] !== 'P') return '4th letter must be "P" for Proprietorship';
      }
      return null;
    }

    case 'about':
      if (val.length < 50 || val.length > 500) return 'Must be between 50 and 500 characters';
      return null;

    // Builder fields
    case 'company_name':
      if (val.length < 2 || val.length > 100) return 'Must be between 2 and 100 characters';
      return null;

    case 'company_type':
      if (!COMPANY_TYPES.includes(val)) return 'Select a valid company type';
      return null;

    case 'gst_number': {
      const gst = String(val).toUpperCase();
      const regex = /^(0[1-9]|[1-2][0-9]|3[0-8])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
      if (!regex.test(gst)) return 'Invalid GST (State code 01-38 + PAN + 1 char + Z + 1 char)';
      return null;
    }

    case 'about_company':
      if (val.length < 50 || val.length > 500) return 'Must be between 50 and 500 characters';
      return null;

    default:
      return null;
  }
}

// Get required field names for given user type
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

// R1: Draft validation - needs user_type and (name or mobile)
export function validateDraft(formData) {
  const errors = {};

  if (!formData.user_type) {
    errors.user_type = 'Select Builder or Broker';
  }

  const hasName = formData.full_name && formData.full_name.trim().length > 0;
  const hasMobile = formData.mobile && normaliseMobile(formData.mobile).length > 0;

  if (!hasName && !hasMobile) {
    errors.full_name = 'Enter Full name or Mobile to save draft';
    errors.mobile = 'Enter Full name or Mobile to save draft';
  }

  const fields = getRequiredFields(formData.user_type);
  fields.forEach(f => {
    const val = formData[f];
    if (val !== undefined && val !== null && val !== '') {
      const err = validateField(f, val, formData);
      if (err) errors[f] = err;
    }
  });

  return { isValid: Object.keys(errors).length === 0, errors };
}

// R2: Submit validation - all fields valid + OTP verified
export function validateSubmit(formData) {
  const errors = {};

  if (!formData.user_type) {
    errors.user_type = 'Select Builder or Broker';
    return { isValid: false, errors };
  }

  const fields = getRequiredFields(formData.user_type);
  fields.forEach(f => {
    const val = formData[f];
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
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

// R7: Completion percentage
export function calculateCompletion(formData) {
  if (formData.status === 'submitted') return 100;
  if (!formData.user_type) return 0;

  const fields = getRequiredFields(formData.user_type);
  let validCount = 0;

  fields.forEach(f => {
    const val = formData[f];
    if (val !== undefined && val !== null && val !== '') {
      if (!Array.isArray(val) || val.length > 0) {
        if (!validateField(f, val, formData)) validCount++;
      }
    }
  });

  if (formData.email_verified) validCount++;
  if (formData.mobile_verified) validCount++;

  const totalPossible = formData.user_type === 'broker' ? 16 : 19;
  return Math.min(100, Math.floor((validCount / totalPossible) * 100));
}

// R8: Stale draft check (> 7 days)
export function isDraftStale(updatedAt, status) {
  if (status !== 'draft' || !updatedAt) return false;
  const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
  return daysDiff > 7;
}
