// =============================================================================
// API Gateway Authorizer Lambda Handler
// =============================================================================

import { APIGatewayAuthorizerEvent, APIGatewayAuthorizerResult, Context } from 'aws-lambda'

import { JwtPayload } from '../types'
import { verifyAccessToken } from '../utils/jwt'

/**
 * Generate IAM policy document
 * @param principalId
 * @param effect
 * @param resource
 * @param context
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string | number | boolean>,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  }
}

/**
 * Generate Allow policy
 * @param principalId
 * @param resource
 * @param context
 */
function generateAllowPolicy(
  principalId: string,
  resource: string,
  context: Record<string, string | number | boolean>,
): APIGatewayAuthorizerResult {
  return generatePolicy(principalId, 'Allow', resource, context)
}

/**
 * Generate Deny policy
 * @param principalId
 * @param resource
 */
function generateDenyPolicy(principalId: string, resource: string): APIGatewayAuthorizerResult {
  return generatePolicy(principalId, 'Deny', resource)
}

/**
 * Extract token from Authorization header
 * @param authorizationHeader
 */
function extractToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null
  }

  // Support both "Bearer <token>" and raw token
  const parts = authorizationHeader.split(' ')

  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1]
  }

  // Assume raw token if no "Bearer" prefix
  if (parts.length === 1) {
    return parts[0]
  }

  return null
}

/**
 * Lambda Authorizer Handler
 * Validates JWT tokens and returns IAM policy
 * @param event
 * @param _context
 */
export async function authorizerHandler(
  event: APIGatewayAuthorizerEvent,
  _context: Context,
): Promise<APIGatewayAuthorizerResult> {
  console.log('Authorizer event:', JSON.stringify(event, null, 2))

  try {
    // Get token from event
    let token: string | null = null

    if (event.type === 'TOKEN') {
      // Token authorizer
      token = extractToken(event.authorizationToken)
    } else if (event.type === 'REQUEST') {
      // Request authorizer
      const authHeader = event.headers?.Authorization || event.headers?.authorization
      token = extractToken(authHeader)
    }

    if (!token) {
      console.log('No token provided')
      throw new Error('Unauthorized')
    }

    // Verify token
    const decoded: JwtPayload = await verifyAccessToken(token)

    console.log('Token verified for user:', decoded.sub)

    // Generate allow policy with user context
    const methodArn = event.methodArn
    // Allow all methods in the API (wildcard)
    const resource = methodArn.replace(/\/[^/]+\/[^/]+$/, '/*')

    return generateAllowPolicy(decoded.sub, resource, {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      ...(decoded.clientId && { clientId: decoded.clientId }),
      ...(decoded.employeeId && { employeeId: decoded.employeeId }),
    })
  } catch (error) {
    console.error('Authorization failed:', error)

    // Return deny policy (API Gateway can cache this decision)
    const methodArn = event.methodArn
    const resource = methodArn.replace(/\/[^/]+\/[^/]+$/, '/*')
    return generateDenyPolicy('unauthorized', resource)
  }
}

/**
 * Simple Token Validator Handler
 * For endpoints that just need to validate a token and return user info
 * @param event
 * @param event.token
 * @param _context
 */
export async function validateTokenHandler(
  event: { token: string },
  _context: Context,
): Promise<{
  valid: boolean
  user?: Omit<JwtPayload, 'iat' | 'exp'>
  error?: string
}> {
  try {
    const decoded = await verifyAccessToken(event.token)

    return {
      valid: true,
      user: {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        ...(decoded.clientId && { clientId: decoded.clientId }),
        ...(decoded.employeeId && { employeeId: decoded.employeeId }),
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    }
  }
}
