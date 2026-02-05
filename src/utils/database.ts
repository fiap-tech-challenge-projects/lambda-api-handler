// =============================================================================
// Database Connection Utility
// =============================================================================

import { Pool, PoolClient } from 'pg'

import { DbUser, DbClient, DbEmployee, DbRefreshToken } from '../types'

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
    'SELECT * FROM "users" WHERE email = $1 AND "isActive" = true LIMIT 1',
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
    'SELECT * FROM "users" WHERE id = $1 AND "isActive" = true LIMIT 1',
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

  const clients = await query<DbClient>('SELECT * FROM "clients" WHERE "cpfCnpj" = $1 LIMIT 1', [
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
    `SELECT u.* FROM "users" u
     WHERE u."clientId" = $1 AND u."isActive" = true
     LIMIT 1`,
    [clientId],
  )
  return users[0] || null
}

/**
 * Find client by user ID
 * @param userId
 */
export async function findClientByUserId(userId: string): Promise<DbClient | null> {
  const clients = await query<DbClient>(
    `SELECT c.* FROM "clients" c
     INNER JOIN "users" u ON u."clientId" = c.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  )
  return clients[0] || null
}

/**
 * Find employee by user ID
 * @param userId
 */
export async function findEmployeeByUserId(userId: string): Promise<DbEmployee | null> {
  const employees = await query<DbEmployee>(
    `SELECT e.* FROM "employees" e
     INNER JOIN "users" u ON u."employeeId" = e.id
     WHERE u.id = $1 AND e."isActive" = true
     LIMIT 1`,
    [userId],
  )
  return employees[0] || null
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
    `INSERT INTO "refresh_tokens" (id, token, "userId", "expiresAt", "createdAt")
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
    `SELECT * FROM "refresh_tokens"
     WHERE token = $1
       AND "expiresAt" > NOW()
     LIMIT 1`,
    [token],
  )
  return tokens[0] || null
}

/**
 * Revoke refresh token (deletes it since schema has no revoked_at field)
 * @param token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await query('DELETE FROM "refresh_tokens" WHERE token = $1', [token])
}

/**
 * Revoke all user refresh tokens (deletes them since schema has no revoked_at field)
 * @param userId
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await query('DELETE FROM "refresh_tokens" WHERE "userId" = $1', [userId])
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
