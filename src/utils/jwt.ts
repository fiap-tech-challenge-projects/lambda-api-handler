// =============================================================================
// JWT Utility
// =============================================================================

import jwt, { SignOptions } from 'jsonwebtoken'

import { JwtPayload, UserInfo, AuthError } from '../types'

import { getAuthSecrets } from './secrets'

/**
 * Generate access token
 * @param user
 */
export async function generateAccessToken(user: UserInfo): Promise<string> {
  const secrets = await getAuthSecrets()

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.clientId && { clientId: user.clientId }),
    ...(user.employeeId && { employeeId: user.employeeId }),
  }

  return jwt.sign(payload, secrets.JWT_SECRET, {
    expiresIn: secrets.JWT_ACCESS_EXPIRY || '15m',
  } as SignOptions)
}

/**
 * Generate refresh token
 * @param userId
 */
export async function generateRefreshToken(userId: string): Promise<{
  token: string
  expiresAt: Date
}> {
  const secrets = await getAuthSecrets()

  const token = jwt.sign({ sub: userId, type: 'refresh' }, secrets.JWT_SECRET, {
    expiresIn: secrets.JWT_REFRESH_EXPIRY || '7d',
  } as SignOptions)

  // Calculate expiration date
  const expiresIn = secrets.JWT_REFRESH_EXPIRY || '7d'
  const expiresAt = new Date()

  if (expiresIn.endsWith('d')) {
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn))
  } else if (expiresIn.endsWith('h')) {
    expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn))
  } else {
    // Default to 7 days
    expiresAt.setDate(expiresAt.getDate() + 7)
  }

  return { token, expiresAt }
}

/**
 * Verify and decode access token
 * @param token
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const secrets = await getAuthSecrets()

  try {
    const decoded = jwt.verify(token, secrets.JWT_SECRET) as JwtPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token expired', 401, 'TOKEN_EXPIRED')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token', 401, 'INVALID_TOKEN')
    }
    throw new AuthError('Token verification failed', 401, 'TOKEN_ERROR')
  }
}

/**
 * Verify refresh token
 * @param token
 */
export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const secrets = await getAuthSecrets()

  try {
    const decoded = jwt.verify(token, secrets.JWT_SECRET) as {
      sub: string
      type: string
    }

    if (decoded.type !== 'refresh') {
      throw new AuthError('Invalid token type', 401, 'INVALID_TOKEN_TYPE')
    }

    return { sub: decoded.sub }
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED')
    }
    throw new AuthError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }
}

/**
 * Get access token expiry in seconds
 */
export async function getAccessTokenExpiry(): Promise<number> {
  const secrets = await getAuthSecrets()
  const expiry = secrets.JWT_ACCESS_EXPIRY || '15m'

  if (expiry.endsWith('m')) {
    return parseInt(expiry) * 60
  }
  if (expiry.endsWith('h')) {
    return parseInt(expiry) * 60 * 60
  }
  if (expiry.endsWith('d')) {
    return parseInt(expiry) * 60 * 60 * 24
  }

  return 900 // Default 15 minutes
}
