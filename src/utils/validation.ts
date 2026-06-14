/**
 * Validation rules for Splitify forms
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============ Group Validation ============

export function validateGroupName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Group name is required' };
  }
  if (name.trim().length < 3) {
    return { isValid: false, error: 'Group name must be at least 3 characters' };
  }
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Group name must be less than 50 characters' };
  }
  return { isValid: true };
}

// ============ Expense Validation ============

export interface ExpenseValidationData {
  title: string;
  amount: number;
  payerId: string;
  date: Date;
}

export function validateExpenseTitle(title: string): ValidationResult {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Expense title is required' };
  }
  if (title.trim().length > 100) {
    return { isValid: false, error: 'Title must be less than 100 characters' };
  }
  return { isValid: true };
}

export function validateExpenseAmount(amount: number): ValidationResult {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > 999999999) {
    return { isValid: false, error: 'Amount is too large' };
  }
  return { isValid: true };
}

export function validatePayer(payerId: string): ValidationResult {
  if (!payerId || payerId.trim().length === 0) {
    return { isValid: false, error: 'Please select who paid' };
  }
  return { isValid: true };
}

export function validateExpenseDate(date: Date): ValidationResult {
  if (!date || isNaN(date.getTime())) {
    return { isValid: false, error: 'Please select a valid date' };
  }
  if (date > new Date()) {
    return { isValid: false, error: 'Date cannot be in the future' };
  }
  return { isValid: true };
}

export function validateExpense(data: ExpenseValidationData): ValidationResult {
  const titleValidation = validateExpenseTitle(data.title);
  if (!titleValidation.isValid) return titleValidation;
  
  const amountValidation = validateExpenseAmount(data.amount);
  if (!amountValidation.isValid) return amountValidation;
  
  const payerValidation = validatePayer(data.payerId);
  if (!payerValidation.isValid) return payerValidation;
  
  const dateValidation = validateExpenseDate(data.date);
  if (!dateValidation.isValid) return dateValidation;
  
  return { isValid: true };
}

// ============ User Validation ============

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}

export function validateFullName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Full name is required' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }
  return { isValid: true };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true };
}

// ============ Member Validation ============

export function validateMemberCount(memberCount: number): ValidationResult {
  if (memberCount < 2) {
    return { isValid: false, error: 'Group must have at least 2 members' };
  }
  if (memberCount > 50) {
    return { isValid: false, error: 'Group cannot have more than 50 members' };
  }
  return { isValid: true };
}

// ============ Settlement Validation ============

export function validateSettlementAmount(amount: number, maxAmount: number): ValidationResult {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > maxAmount) {
    return { isValid: false, error: `Amount cannot exceed ₱${maxAmount.toFixed(2)}` };
  }
  return { isValid: true };
}