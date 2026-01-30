// =============================================================================
// Secrets Manager Utility
// =============================================================================

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

import { DatabaseSecrets, AuthSecrets } from '../types'

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

// Cache for secrets
let dbSecretsCache: DatabaseSecrets | null = null
let authSecretsCache: AuthSecrets | null = null

/**
 * Get database secrets from AWS Secrets Manager
 */
export async function getDatabaseSecrets(): Promise<DatabaseSecrets> {
  if (dbSecretsCache) {
    return dbSecretsCache
  }

  const secretName =
    process.env.DATABASE_SECRET_NAME || 'fiap-tech-challenge/development/database/credentials'

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)

    if (!response.SecretString) {
      throw new Error('Secret string is empty')
    }

    dbSecretsCache = JSON.parse(response.SecretString) as DatabaseSecrets
    return dbSecretsCache
  } catch (error) {
    console.error('Error fetching database secrets:', error)
    throw new Error('Failed to retrieve database credentials')
  }
}

/**
 * Get auth secrets from AWS Secrets Manager
 */
export async function getAuthSecrets(): Promise<AuthSecrets> {
  if (authSecretsCache) {
    return authSecretsCache
  }

  const secretName = process.env.AUTH_SECRET_NAME || 'fiap-tech-challenge/development/auth/config'

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)

    if (!response.SecretString) {
      throw new Error('Secret string is empty')
    }

    authSecretsCache = JSON.parse(response.SecretString) as AuthSecrets
    return authSecretsCache
  } catch (error) {
    console.error('Error fetching auth secrets:', error)
    throw new Error('Failed to retrieve auth configuration')
  }
}

/**
 * Clear secrets cache (useful for testing)
 */
export function clearSecretsCache(): void {
  dbSecretsCache = null
  authSecretsCache = null
}
