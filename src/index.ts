// =============================================================================
// Lambda API Handler - Entry Point
// =============================================================================

// Export all handlers
export {
  authHandler,
  emailLoginHandler,
  cpfLoginHandler,
  refreshTokenHandler,
  logoutHandler,
} from './handlers/auth.handler'
export { authorizerHandler, validateTokenHandler } from './handlers/authorizer.handler'

// Export types
export * from './types'
