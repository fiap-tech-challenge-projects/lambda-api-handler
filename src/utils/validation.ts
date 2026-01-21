// =============================================================================
// Validation Utility
// =============================================================================

import { ValidationError } from '../types'

/**
 * Validate email format
 * ReDoS-safe implementation with length check and simplified regex
 * @param email
 */
export function validateEmail(email: string): boolean {
  // Prevent ReDoS by limiting email length
  if (!email || email.length > 254) {
    return false
  }

  // Simple, ReDoS-safe regex with atomic grouping concept
  // Matches: localpart@domain.tld
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  return emailRegex.test(email)
}

/**
 * Validate CPF format and checksum
 * @param cpf
 */
export function validateCpf(cpf: string): boolean {
  // Remove non-digits
  const cleanCpf = cpf.replace(/\D/g, '')

  // Check length
  if (cleanCpf.length !== 11) {
    return false
  }

  // Check for known invalid CPFs
  if (/^(\d)\1{10}$/.test(cleanCpf)) {
    return false
  }

  // Validate first check digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) {
    remainder = 0
  }
  if (remainder !== parseInt(cleanCpf[9])) {
    return false
  }

  // Validate second check digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) {
    remainder = 0
  }
  if (remainder !== parseInt(cleanCpf[10])) {
    return false
  }

  return true
}

/**
 * Normalize CPF (remove formatting)
 * @param cpf
 */
export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Validate password strength
 * @param password
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate email login request
 * @param body
 */
export function validateEmailLoginRequest(body: unknown): {
  email: string
  password: string
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body')
  }

  const { email, password } = body as Record<string, unknown>

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required')
  }

  if (!validateEmail(email)) {
    throw new ValidationError('Invalid email format')
  }

  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required')
  }

  // More lenient validation for login (we validate on registration)
  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters')
  }

  return { email: email.toLowerCase().trim(), password }
}

/**
 * Validate CPF login request
 * @param body
 */
export function validateCpfLoginRequest(body: unknown): { cpf: string } {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body')
  }

  const { cpf } = body as Record<string, unknown>

  if (!cpf || typeof cpf !== 'string') {
    throw new ValidationError('CPF is required')
  }

  if (!validateCpf(cpf)) {
    throw new ValidationError('Invalid CPF')
  }

  return { cpf: normalizeCpf(cpf) }
}

/**
 * Validate refresh token request
 * @param body
 */
export function validateRefreshTokenRequest(body: unknown): {
  refreshToken: string
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body')
  }

  const { refreshToken } = body as Record<string, unknown>

  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new ValidationError('Refresh token is required')
  }

  // Basic format validation for JWT tokens
  const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
  if (!jwtPattern.test(refreshToken)) {
    throw new ValidationError('Invalid token format')
  }

  // Check token length (typical JWT is 100-500 characters)
  if (refreshToken.length < 50 || refreshToken.length > 1000) {
    throw new ValidationError('Invalid token length')
  }

  return { refreshToken }
}
