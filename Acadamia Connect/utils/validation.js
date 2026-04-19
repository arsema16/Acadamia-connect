/**
 * Enhanced Input Validation System for Academia Connect V2
 * Implements comprehensive validation for phone numbers, emails, and passwords
 * with real-time feedback and strength indicators.
 */

/**
 * Validates Ethiopian mobile phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid Ethiopian format (+251[7|9]XXXXXXXX)
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Remove whitespace
  const cleaned = phone.replace(/\s/g, '');
  
  // Ethiopian format: +251 followed by 7 or 9, then 8 digits
  return /^\+251[79]\d{8}$/.test(cleaned);
}

/**
 * Validates email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Check for exactly one @ and at least one . after @
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks password strength and returns level
 * @param {string} password - Password to check
 * @returns {string} - One of: 'weak', 'fair', 'good', 'strong'
 */
function checkPasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return 'weak';
  }
  
  if (password.length < 8) return 'weak';
  
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (hasLower && hasUpper && hasDigit && hasSpecial) return 'strong';
  if ((hasLower || hasUpper) && hasDigit) return 'good';
  if (hasLower || hasUpper) return 'fair';
  
  return 'weak';
}

/**
 * Validates registration input payload
 * @param {Object} payload - Registration data
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
function validateRegistrationInput(payload) {
  const errors = [];
  
  // Check required fields
  const requiredFields = ['role', 'full_name', 'email', 'phone', 'password', 'school_name'];
  for (const field of requiredFields) {
    if (!payload[field] || payload[field].toString().trim() === '') {
      errors.push(`${field.replace('_', ' ')} is required`);
    }
  }
  
  // Validate role
  const validRoles = ['student', 'teacher', 'parent', 'admin'];
  if (payload.role && !validRoles.includes(payload.role)) {
    errors.push('Invalid role. Must be student, teacher, parent, or admin');
  }
  
  // Validate email format
  if (payload.email && payload.email.trim() !== '') {
    if (!validateEmail(payload.email)) {
      errors.push('Invalid email format. Email must contain @ and .');
    }
  }
  
  // Validate phone format
  if (payload.phone && payload.phone.trim() !== '') {
    if (!validatePhoneNumber(payload.phone)) {
      errors.push('Invalid phone number. Use Ethiopian format: +251XXXXXXXXX');
    }
  }
  
  // Validate password strength
  if (payload.password && payload.password.trim() !== '') {
    if (payload.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (payload.confirm_password !== undefined && payload.password !== payload.confirm_password) {
      errors.push('Passwords do not match');
    }
  }
  
  // Role-specific validation
  if (payload.role === 'teacher') {
    if (!payload.employee_id || payload.employee_id.toString().trim() === '') {
      errors.push('Employee ID is required for teacher registration');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates login input
 * @param {Object} payload - Login data
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
function validateLoginInput(payload) {
  const errors = [];
  
  // Check required fields
  if (!payload.email || payload.email.trim() === '') {
    errors.push('Email is required');
  }
  
  if (!payload.password || payload.password.trim() === '') {
    errors.push('Password is required');
  }
  
  if (!payload.role || payload.role.trim() === '') {
    errors.push('Role is required');
  }
  
  // Validate role
  const validRoles = ['student', 'teacher', 'parent', 'admin'];
  if (payload.role && !validRoles.includes(payload.role)) {
    errors.push('Invalid role');
  }
  
  // Validate email format
  if (payload.email && payload.email.trim() !== '') {
    if (!validateEmail(payload.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Teacher-specific validation
  if (payload.role === 'teacher') {
    if (!payload.employee_id || payload.employee_id.toString().trim() === '') {
      errors.push('Employee ID is required for teacher login');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Client-side validation error messages
 */
const ValidationMessages = {
  PHONE_REQUIRED: 'Phone number is required',
  PHONE_INVALID: 'Invalid phone number. Use format: +251XXXXXXXXX',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Invalid email format',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  EMPLOYEE_ID_REQUIRED: 'Employee ID is required',
  ROLE_REQUIRED: 'Role is required',
  FULL_NAME_REQUIRED: 'Full name is required',
  SCHOOL_NAME_REQUIRED: 'School name is required'
};

/**
 * Password strength levels with descriptions
 */
const PasswordStrengthLevels = {
  weak: {
    label: 'Weak',
    description: 'Fewer than 8 characters',
    color: '#ff4444',
    score: 1
  },
  fair: {
    label: 'Fair',
    description: '8+ characters, letters only',
    color: '#ff8800',
    score: 2
  },
  good: {
    label: 'Good',
    description: '8+ characters, mixed case or letters + digits',
    color: '#ffaa00',
    score: 3
  },
  strong: {
    label: 'Strong',
    description: '8+ characters, mixed case + digits + special character',
    color: '#00aa00',
    score: 4
  }
};

module.exports = {
  validatePhoneNumber,
  validateEmail,
  checkPasswordStrength,
  validateRegistrationInput,
  validateLoginInput,
  ValidationMessages,
  PasswordStrengthLevels
};