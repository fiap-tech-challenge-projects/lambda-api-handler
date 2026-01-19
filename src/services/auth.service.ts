// =============================================================================
// Authentication Service
// =============================================================================

import bcrypt from 'bcryptjs'

import { AuthResponse, UserInfo, AuthError } from '../types'
import {
  findUserByEmail,
  findUserById,
  findClientByCpf,
  findUserByClientId,
  findClientByUserId,
  findEmployeeByUserId,
  saveRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
} from '../utils/database'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getAccessTokenExpiry,
} from '../utils/jwt'

/**
 * Login with email and password
 * @param email
 * @param password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  // Find user by email
  const user = await findUserByEmail(email)

  if (!user) {
    // Use timing-safe comparison to prevent timing attacks
    // Hash a dummy password to maintain consistent timing
    await bcrypt.compare(password, '$2a$10$dummyhashfortimingatttackprevention00000000000000000')
    throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  // Verify password with constant time comparison
  const isValidPassword = await bcrypt.compare(password, user.password_hash)

  if (!isValidPassword) {
    throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  // Check for associated client or employee
  const client = await findClientByUserId(user.id)
  const employee = await findEmployeeByUserId(user.id)

  // Generate tokens
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(client && { clientId: client.id }),
    ...(employee && { employeeId: employee.id }),
  }

  const accessToken = await generateAccessToken(userInfo)
  const { token: refreshToken, expiresAt } = await generateRefreshToken(user.id)

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken, expiresAt)

  const expiresIn = await getAccessTokenExpiry()

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user: userInfo,
  }
}

/**
 * Login with CPF (no password required for quick identification)
 * @param cpf
 */
export async function loginWithCpf(cpf: string): Promise<AuthResponse> {
  // Find client by CPF
  const client = await findClientByCpf(cpf)

  if (!client) {
    throw new AuthError('CPF not found', 404, 'CPF_NOT_FOUND')
  }

  // Find associated user
  const user = await findUserByClientId(client.id)

  if (!user) {
    throw new AuthError('User not found for this CPF', 404, 'USER_NOT_FOUND')
  }

  // Check for associated employee (rare but possible)
  const employee = await findEmployeeByUserId(user.id)

  // Generate tokens
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: client.id,
    ...(employee && { employeeId: employee.id }),
  }

  const accessToken = await generateAccessToken(userInfo)
  const { token: refreshToken, expiresAt } = await generateRefreshToken(user.id)

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken, expiresAt)

  const expiresIn = await getAccessTokenExpiry()

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user: userInfo,
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshTokenStr
 */
export async function refreshAccessToken(refreshTokenStr: string): Promise<AuthResponse> {
  // Verify refresh token JWT
  const { sub: userId } = await verifyRefreshToken(refreshTokenStr)

  // Check if refresh token is valid in database
  const tokenRecord = await findValidRefreshToken(refreshTokenStr)

  if (!tokenRecord) {
    throw new AuthError('Refresh token not found or expired', 401, 'INVALID_REFRESH_TOKEN')
  }

  // Find user
  const user = await findUserById(userId)

  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND')
  }

  // Check for associated client or employee
  const client = await findClientByUserId(user.id)
  const employee = await findEmployeeByUserId(user.id)

  // Revoke old refresh token
  await revokeRefreshToken(refreshTokenStr)

  // Generate new tokens
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(client && { clientId: client.id }),
    ...(employee && { employeeId: employee.id }),
  }

  const accessToken = await generateAccessToken(userInfo)
  const { token: newRefreshToken, expiresAt } = await generateRefreshToken(user.id)

  // Save new refresh token
  await saveRefreshToken(user.id, newRefreshToken, expiresAt)

  const expiresIn = await getAccessTokenExpiry()

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user: userInfo,
  }
}

/**
 * Logout - revoke refresh token
 * @param refreshTokenStr
 */
export async function logout(refreshTokenStr: string): Promise<void> {
  await revokeRefreshToken(refreshTokenStr)
}
