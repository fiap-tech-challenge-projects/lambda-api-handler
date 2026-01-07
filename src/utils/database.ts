// =============================================================================
// Database Connection Utility
// =============================================================================

import { Pool, PoolClient } from 'pg'

import { DbUser, DbClient, DbRefreshToken } from '../types'

import { getDatabaseSecrets } from './secrets'

let pool: Pool | null = null

/**
 * Get database connection pool
 */
async function getPool(): Promise<Pool> {
  if (pool) {
    return pool
  }

  const secrets = await getDatabaseSecrets()

  pool = new Pool({
    connectionString: secrets.DATABASE_URL,
    max: 5, // Lambda has limited connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  return pool
}

/**
 * Execute a query with automatic connection handling
 * @param sql
 * @param params
 */
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const pool = await getPool()
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

/**
 * Get a client for transaction operations
 */
export async function getClient(): Promise<PoolClient> {
  const pool = await getPool()
  return pool.connect()
}

/**
 * Find user by email
 * @param email
 */
export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const users = await query<DbUser>(
    'SELECT * FROM "User" WHERE email = $1 AND is_active = true LIMIT 1',
    [email],
  )
  return users[0] || null
}

/**
 * Find user by ID
 * @param id
 */
export async function findUserById(id: string): Promise<DbUser | null> {
  const users = await query<DbUser>(
    'SELECT * FROM "User" WHERE id = $1 AND is_active = true LIMIT 1',
    [id],
  )
  return users[0] || null
}

/**
 * Find client by CPF/CNPJ
 * @param cpf
 */
export async function findClientByCpf(cpf: string): Promise<DbClient | null> {
  // Normalize CPF (remove formatting)
  const normalizedCpf = cpf.replace(/\D/g, '')

  const clients = await query<DbClient>('SELECT * FROM "Client" WHERE cpf_cnpj = $1 LIMIT 1', [
    normalizedCpf,
  ])
  return clients[0] || null
}

/**
 * Find user by client ID
 * @param clientId
 */
export async function findUserByClientId(clientId: string): Promise<DbUser | null> {
  const users = await query<DbUser>(
    `SELECT u.* FROM "User" u
     INNER JOIN "Client" c ON c.user_id = u.id
     WHERE c.id = $1 AND u.is_active = true
     LIMIT 1`,
    [clientId],
  )
  return users[0] || null
}

/**
 * Save refresh token
 * @param userId
 * @param token
 * @param expiresAt
 */
export async function saveRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await query(
    `INSERT INTO "RefreshToken" (id, token, user_id, expires_at, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
    [token, userId, expiresAt],
  )
}

/**
 * Find valid refresh token
 * @param token
 */
export async function findValidRefreshToken(token: string): Promise<DbRefreshToken | null> {
  const tokens = await query<DbRefreshToken>(
    `SELECT * FROM "RefreshToken"
     WHERE token = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL
     LIMIT 1`,
    [token],
  )
  return tokens[0] || null
}

/**
 * Revoke refresh token
 * @param token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await query('UPDATE "RefreshToken" SET revoked_at = NOW() WHERE token = $1', [token])
}

/**
 * Revoke all user refresh tokens
 * @param userId
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await query(
    'UPDATE "RefreshToken" SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  )
}

/**
 * Close database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
