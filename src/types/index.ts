// =============================================================================
// Types - Lambda API Handler
// =============================================================================

// -----------------------------------------------------------------------------
// Authentication Types
// -----------------------------------------------------------------------------

export interface EmailLoginRequest {
  email: string
  password: string
}

export interface CpfLoginRequest {
  cpf: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// -----------------------------------------------------------------------------
// Security Error Types
// -----------------------------------------------------------------------------

export class RateLimitError extends Error {
  constructor(
    message: string,
    public statusCode: number = 429,
    public code: string = 'RATE_LIMIT_EXCEEDED',
    public retryAfter?: number,
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
  user: UserInfo
}

export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  clientId?: string
  employeeId?: string
}

// -----------------------------------------------------------------------------
// JWT Types
// -----------------------------------------------------------------------------

export interface JwtPayload {
  sub: string
  email: string
  name: string
  role: string
  clientId?: string
  employeeId?: string
  iat: number
  exp: number
}

export interface JwtConfig {
  secret: string
  accessTokenExpiry: string
  refreshTokenExpiry: string
}

// -----------------------------------------------------------------------------
// Database Types
// -----------------------------------------------------------------------------

export interface DbUser {
  id: string
  email: string
  password_hash: string
  name: string
  role: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface DbClient {
  id: string
  cpf_cnpj: string
  name: string
  email: string
  user_id: string
  created_at: Date
}

export interface DbEmployee {
  id: string
  name: string
  email: string
  role: string
  user_id: string
  is_active: boolean
  created_at: Date
}

export interface DbRefreshToken {
  id: string
  token: string
  user_id: string
  expires_at: Date
  created_at: Date
  revoked_at?: Date
}

// -----------------------------------------------------------------------------
// API Gateway Types
// -----------------------------------------------------------------------------

export interface ApiGatewayAuthorizerEvent {
  type: 'TOKEN' | 'REQUEST'
  methodArn: string
  authorizationToken?: string
  headers?: Record<string, string>
}

export interface ApiGatewayAuthorizerResult {
  principalId: string
  policyDocument: {
    Version: string
    Statement: Array<{
      Action: string
      Effect: 'Allow' | 'Deny'
      Resource: string
    }>
  }
  context?: Record<string, string | number | boolean>
}

// -----------------------------------------------------------------------------
// Secrets Manager Types
// -----------------------------------------------------------------------------

export interface DatabaseSecrets {
  DATABASE_URL: string
  DB_HOST: string
  DB_PORT: string
  DB_NAME: string
  DB_USER: string
  DB_PASSWORD: string
}

export interface AuthSecrets {
  JWT_SECRET: string
  JWT_ACCESS_EXPIRY: string
  JWT_REFRESH_EXPIRY: string
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

/**
 *
 */
export class AuthError extends Error {
  /**
   *
   * @param message
   * @param statusCode
   * @param code
   */
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'AUTH_ERROR',
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 *
 */
export class ValidationError extends Error {
  /**
   *
   * @param message
   * @param statusCode
   * @param code
   */
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'VALIDATION_ERROR',
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
