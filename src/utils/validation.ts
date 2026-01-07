// =============================================================================
// Validation Utility
// =============================================================================

import { ValidationError } from '../types';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate CPF format and checksum
 */
export function validateCpf(cpf: string): boolean {
  // Remove non-digits
  const cleanCpf = cpf.replace(/\D/g, '');

  // Check length
  if (cleanCpf.length !== 11) {
    return false;
  }

  // Check for known invalid CPFs
  if (/^(\d)\1{10}$/.test(cleanCpf)) {
    return false;
  }

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanCpf[9])) {
    return false;
  }

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanCpf[10])) {
    return false;
  }

  return true;
}

/**
 * Normalize CPF (remove formatting)
 */
export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Validate email login request
 */
export function validateEmailLoginRequest(body: unknown): {
  email: string;
  password: string;
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const { email, password } = body as Record<string, unknown>;

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required');
  }

  if (!validateEmail(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }

  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  return { email: email.toLowerCase().trim(), password };
}

/**
 * Validate CPF login request
 */
export function validateCpfLoginRequest(body: unknown): { cpf: string } {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const { cpf } = body as Record<string, unknown>;

  if (!cpf || typeof cpf !== 'string') {
    throw new ValidationError('CPF is required');
  }

  if (!validateCpf(cpf)) {
    throw new ValidationError('Invalid CPF');
  }

  return { cpf: normalizeCpf(cpf) };
}

/**
 * Validate refresh token request
 */
export function validateRefreshTokenRequest(body: unknown): {
  refreshToken: string;
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const { refreshToken } = body as Record<string, unknown>;

  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new ValidationError('Refresh token is required');
  }

  return { refreshToken };
}
