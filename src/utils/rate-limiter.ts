// =============================================================================
// Rate Limiter Utility
// =============================================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (for Lambda, consider using DynamoDB for distributed rate limiting)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5 // Max 5 login attempts per 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000 // Block for 30 minutes after exceeding

/**
 * Check if request should be rate limited
 * @param identifier - IP address or user identifier
 * @returns true if rate limit exceeded
 */
export function isRateLimited(identifier: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry) {
    // First request
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  // Check if reset time has passed
  if (now > entry.resetTime) {
    // Reset counter
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  // Increment counter
  entry.count++

  // Check if limit exceeded
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    // Extend block duration
    entry.resetTime = now + BLOCK_DURATION_MS
    rateLimitStore.set(identifier, entry)
    return true
  }

  rateLimitStore.set(identifier, entry)
  return false
}

/**
 * Get remaining requests for identifier
 * @param identifier
 */
export function getRemainingRequests(identifier: string): number {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetTime) {
    return MAX_REQUESTS_PER_WINDOW
  }

  return Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count)
}

/**
 * Get reset time for identifier
 * @param identifier
 */
export function getResetTime(identifier: string): number | null {
  const entry = rateLimitStore.get(identifier)
  return entry ? entry.resetTime : null
}

/**
 * Clear rate limit for identifier (useful for testing)
 * @param identifier
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}
