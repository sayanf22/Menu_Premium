/**
 * Security utilities for rate limiting, input sanitization, and DDoS protection
 */

// Rate limiter using sliding window algorithm
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default rate limits for different actions
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 attempts per minute
  passwordReset: { maxRequests: 3, windowMs: 60 * 1000 }, // 3 per minute
  order: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 orders per minute
  feedback: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 feedback per minute
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 API calls per minute
} as const;

/**
 * Check if an action is rate limited
 * @returns true if the action should be blocked
 */
export function isRateLimited(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return false;
  }

  if (entry.count >= config.maxRequests) {
    return true;
  }

  entry.count++;
  return false;
}

/**
 * Get remaining attempts for a rate limit key
 */
export function getRemainingAttempts(key: string, config: RateLimitConfig): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.resetTime) {
    return config.maxRequests;
  }
  return Math.max(0, config.maxRequests - entry.count);
}

/**
 * Clear rate limit for a key (e.g., after successful auth)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}


/**
 * Input sanitization to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate table number (alphanumeric, max 10 chars)
 */
export function isValidTableNumber(tableNumber: string): boolean {
  if (!tableNumber || tableNumber.length > 10) return false;
  return /^[a-zA-Z0-9]+$/.test(tableNumber);
}

/**
 * Generate a unique client fingerprint for rate limiting
 */
export function getClientFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL().slice(-50),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Secure session storage wrapper with expiry
 */
export const secureStorage = {
  set(key: string, value: any, expiryMs: number = 3600000): void {
    const item = {
      value,
      expiry: Date.now() + expiryMs,
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn('Session storage unavailable');
    }
  },

  get<T>(key: string): T | null {
    try {
      const itemStr = sessionStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        sessionStorage.removeItem(key);
        return null;
      }
      return item.value as T;
    } catch (e) {
      return null;
    }
  },

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  },
};

/**
 * CSRF token generation and validation
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateCSRFToken(): string {
  let token = secureStorage.get<string>('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    secureStorage.set('csrf_token', token, 24 * 60 * 60 * 1000); // 24 hours
  }
  return token;
}
