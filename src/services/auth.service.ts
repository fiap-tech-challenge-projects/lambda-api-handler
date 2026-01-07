// =============================================================================
// Authentication Service
// =============================================================================

import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  findUserById,
  findClientByCpf,
  findUserByClientId,
  saveRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
} from '../utils/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getAccessTokenExpiry,
} from '../utils/jwt';
import { AuthResponse, UserInfo, AuthError } from '../types';

/**
 * Login with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Find user by email
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const accessToken = await generateAccessToken(userInfo);
  const { token: refreshToken, expiresAt } = await generateRefreshToken(user.id);

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken, expiresAt);

  const expiresIn = await getAccessTokenExpiry();

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user: userInfo,
  };
}

/**
 * Login with CPF (no password required for quick identification)
 */
export async function loginWithCpf(cpf: string): Promise<AuthResponse> {
  // Find client by CPF
  const client = await findClientByCpf(cpf);

  if (!client) {
    throw new AuthError('CPF not found', 404, 'CPF_NOT_FOUND');
  }

  // Find associated user
  const user = await findUserByClientId(client.id);

  if (!user) {
    throw new AuthError('User not found for this CPF', 404, 'USER_NOT_FOUND');
  }

  // Generate tokens
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: client.id,
  };

  const accessToken = await generateAccessToken(userInfo);
  const { token: refreshToken, expiresAt } = await generateRefreshToken(user.id);

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken, expiresAt);

  const expiresIn = await getAccessTokenExpiry();

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user: userInfo,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshTokenStr: string
): Promise<AuthResponse> {
  // Verify refresh token JWT
  const { sub: userId } = await verifyRefreshToken(refreshTokenStr);

  // Check if refresh token is valid in database
  const tokenRecord = await findValidRefreshToken(refreshTokenStr);

  if (!tokenRecord) {
    throw new AuthError(
      'Refresh token not found or expired',
      401,
      'INVALID_REFRESH_TOKEN'
    );
  }

  // Find user
  const user = await findUserById(userId);

  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Revoke old refresh token
  await revokeRefreshToken(refreshTokenStr);

  // Generate new tokens
  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const accessToken = await generateAccessToken(userInfo);
  const { token: newRefreshToken, expiresAt } = await generateRefreshToken(
    user.id
  );

  // Save new refresh token
  await saveRefreshToken(user.id, newRefreshToken, expiresAt);

  const expiresIn = await getAccessTokenExpiry();

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user: userInfo,
  };
}

/**
 * Logout - revoke refresh token
 */
export async function logout(refreshTokenStr: string): Promise<void> {
  await revokeRefreshToken(refreshTokenStr);
}
