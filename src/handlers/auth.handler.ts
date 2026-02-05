// =============================================================================
// Authentication Lambda Handlers
// =============================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

import { loginWithEmail, loginWithCpf, refreshAccessToken, logout } from '../services/auth.service'
import { AuthError, ValidationError, RateLimitError } from '../types'
import { isRateLimited, getResetTime } from '../utils/rate-limiter'
import {
  validateEmailLoginRequest,
  validateCpfLoginRequest,
  validateRefreshTokenRequest,
} from '../utils/validation'

/**
 * Create API Gateway response
 * @param statusCode
 * @param body
 * @param headers
 */
function createResponse(
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>,
): APIGatewayProxyResult {
  // Get allowed origins from environment variable or use default
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://fiap-tech-challenge.com']

  // Default to first allowed origin if not specified
  const origin = allowedOrigins[0]

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      ...headers,
    },
    body: JSON.stringify(body),
  }
}

/**
 * Handle errors and return appropriate response
 * @param error
 */
function handleError(error: unknown): APIGatewayProxyResult {
  // Log error without sensitive details
  if (error instanceof Error) {
    console.error('Error type:', error.constructor.name, 'Message:', error.message)
  } else {
    console.error('Unknown error type')
  }

  if (error instanceof RateLimitError) {
    const headers: Record<string, string> = {}
    if (error.retryAfter) {
      headers['Retry-After'] = Math.ceil(error.retryAfter / 1000).toString()
    }
    return createResponse(
      error.statusCode,
      {
        error: error.code,
        message: error.message,
      },
      headers,
    )
  }

  if (error instanceof AuthError) {
    return createResponse(error.statusCode, {
      error: error.code,
      message: error.message,
    })
  }

  if (error instanceof ValidationError) {
    return createResponse(error.statusCode, {
      error: error.code,
      message: error.message,
    })
  }

  // Unknown error
  return createResponse(500, {
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  })
}

/**
 * Parse request body
 * @param event
 */
function parseBody(event: APIGatewayProxyEvent): unknown {
  if (!event.body) {
    return null
  }

  try {
    return JSON.parse(event.body)
  } catch {
    throw new ValidationError('Invalid JSON body')
  }
}

/**
 * Get client identifier for rate limiting
 * @param event
 */
function getClientIdentifier(event: APIGatewayProxyEvent): string {
  // Prefer source IP from requestContext
  const sourceIp =
    event.requestContext?.identity?.sourceIp ||
    event.headers?.['X-Forwarded-For']?.split(',')[0] ||
    'unknown'

  return sourceIp
}

/**
 * Email Login Handler
 * POST /auth/login
 * @param event
 * @param _context
 */
export async function emailLoginHandler(
  event: APIGatewayProxyEvent,
  _context: Context,
): Promise<APIGatewayProxyResult> {
  try {
    // Rate limiting check
    const clientId = getClientIdentifier(event)
    if (isRateLimited(clientId)) {
      const resetTime = getResetTime(clientId)
      const retryAfter = resetTime ? resetTime - Date.now() : undefined
      throw new RateLimitError(
        'Too many login attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        retryAfter,
      )
    }

    const body = parseBody(event)
    const { email, password } = validateEmailLoginRequest(body)

    const result = await loginWithEmail(email, password)

    return createResponse(200, result)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * CPF Login Handler
 * POST /auth/login/cpf
 * @param event
 * @param _context
 */
export async function cpfLoginHandler(
  event: APIGatewayProxyEvent,
  _context: Context,
): Promise<APIGatewayProxyResult> {
  try {
    // Rate limiting check
    const clientId = getClientIdentifier(event)
    if (isRateLimited(clientId)) {
      const resetTime = getResetTime(clientId)
      const retryAfter = resetTime ? resetTime - Date.now() : undefined
      throw new RateLimitError(
        'Too many login attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        retryAfter,
      )
    }

    const body = parseBody(event)
    const { cpf } = validateCpfLoginRequest(body)

    const result = await loginWithCpf(cpf)

    return createResponse(200, result)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Refresh Token Handler
 * POST /auth/refresh
 * @param event
 * @param _context
 */
export async function refreshTokenHandler(
  event: APIGatewayProxyEvent,
  _context: Context,
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody(event)
    const { refreshToken } = validateRefreshTokenRequest(body)

    const result = await refreshAccessToken(refreshToken)

    return createResponse(200, result)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Logout Handler
 * POST /auth/logout
 * @param event
 * @param _context
 */
export async function logoutHandler(
  event: APIGatewayProxyEvent,
  _context: Context,
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody(event)
    const { refreshToken } = validateRefreshTokenRequest(body)

    await logout(refreshToken)

    return createResponse(200, { message: 'Logged out successfully' })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Main Auth Router Handler
 * Routes to appropriate handler based on path
 * @param event
 * @param context
 */
export async function authHandler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  // Support both API Gateway REST API (v1) and HTTP API (v2) formats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventAny = event as any
  const path = event.path || eventAny.rawPath || event.requestContext?.path || ''
  const method =
    event.httpMethod ||
    eventAny.requestContext?.http?.method ||
    event.requestContext?.httpMethod ||
    ''

  console.log(`Auth Handler: ${method} ${path}`)
  console.log(
    'Event structure:',
    JSON.stringify(
      {
        path: event.path,
        rawPath: eventAny.rawPath,
        httpMethod: event.httpMethod,
        requestContext: event.requestContext,
      },
      null,
      2,
    ),
  )

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return createResponse(
      200,
      {},
      {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    )
  }

  // Route to appropriate handler
  if (method === 'POST') {
    if (path.endsWith('/login/cpf')) {
      return cpfLoginHandler(event, context)
    }
    if (path.endsWith('/login')) {
      return emailLoginHandler(event, context)
    }
    if (path.endsWith('/refresh')) {
      return refreshTokenHandler(event, context)
    }
    if (path.endsWith('/logout')) {
      return logoutHandler(event, context)
    }
  }

  return createResponse(404, {
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  })
}
