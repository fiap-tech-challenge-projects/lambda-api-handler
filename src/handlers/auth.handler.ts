// =============================================================================
// Authentication Lambda Handlers
// =============================================================================

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import {
  loginWithEmail,
  loginWithCpf,
  refreshAccessToken,
  logout,
} from '../services/auth.service';
import {
  validateEmailLoginRequest,
  validateCpfLoginRequest,
  validateRefreshTokenRequest,
} from '../utils/validation';
import { AuthError, ValidationError } from '../types';

/**
 * Create API Gateway response
 */
function createResponse(
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Handle errors and return appropriate response
 */
function handleError(error: unknown): APIGatewayProxyResult {
  console.error('Error:', error);

  if (error instanceof AuthError) {
    return createResponse(error.statusCode, {
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof ValidationError) {
    return createResponse(error.statusCode, {
      error: error.code,
      message: error.message,
    });
  }

  // Unknown error
  return createResponse(500, {
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * Parse request body
 */
function parseBody(event: APIGatewayProxyEvent): unknown {
  if (!event.body) {
    return null;
  }

  try {
    return JSON.parse(event.body);
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}

/**
 * Email Login Handler
 * POST /auth/login
 */
export async function emailLoginHandler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody(event);
    const { email, password } = validateEmailLoginRequest(body);

    const result = await loginWithEmail(email, password);

    return createResponse(200, result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * CPF Login Handler
 * POST /auth/login/cpf
 */
export async function cpfLoginHandler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody(event);
    const { cpf } = validateCpfLoginRequest(body);

    const result = await loginWithCpf(cpf);

    return createResponse(200, result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Refresh Token Handler
 * POST /auth/refresh
 */
export async function refreshTokenHandler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody(event);
    const { refreshToken } = validateRefreshTokenRequest(body);

    const result = await refreshAccessToken(refreshToken);

    return createResponse(200, result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Logout Handler
 * POST /auth/logout
 */
export async function logoutHandler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody(event);
    const { refreshToken } = validateRefreshTokenRequest(body);

    await logout(refreshToken);

    return createResponse(200, { message: 'Logged out successfully' });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Main Auth Router Handler
 * Routes to appropriate handler based on path
 */
export async function authHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const path = event.path || event.requestContext?.path || '';
  const method = event.httpMethod || event.requestContext?.httpMethod || '';

  console.log(`Auth Handler: ${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return createResponse(200, {}, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }

  // Route to appropriate handler
  if (method === 'POST') {
    if (path.endsWith('/login/cpf')) {
      return cpfLoginHandler(event, context);
    }
    if (path.endsWith('/login')) {
      return emailLoginHandler(event, context);
    }
    if (path.endsWith('/refresh')) {
      return refreshTokenHandler(event, context);
    }
    if (path.endsWith('/logout')) {
      return logoutHandler(event, context);
    }
  }

  return createResponse(404, {
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
}
