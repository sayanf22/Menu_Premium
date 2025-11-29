/**
 * Security utilities for rate limiting, input sanitization, and DDoS protection
 * Defense-in-depth approach with multiple layers of protection
 */

// Rate limiter using sliding window algorithm
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number; // How long to block after exceeding limit
}

// Default rate limits for different actions (stricter limits)
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 5 attempts/min, 5min block
  passwordReset: { maxRequests: 3, windowMs: 5 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 }, // 3 per 5min, 15min block
  order: { maxRequests: 5, windowMs: 60 * 1000, blockDurationMs: 2 * 60 * 1000 }, // 5 orders/min, 2min block
  feedback: { maxRequests: 3, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 3 feedback/min, 5min block
  api: { maxRequests: 60, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 }, // 60 API calls/min, 1min block
  menuView: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 views/min (no block)
} as const;

/**
 * Check if an action is rate limited
 * @returns true if the action should be blocked
 */
export function isRateLimited(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Check if currently blocked
  if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
    return true;
  }

  if (!entry || now > entry.resetTime) {
    // First request or window expired - reset
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs, blocked: false });
    return false;
  }

  if (entry.count >= config.maxRequests) {
    // Block the user if blockDurationMs is set
    if (config.blockDurationMs) {
      entry.blocked = true;
      entry.blockUntil = now + config.blockDurationMs;
    }
    return true;
  }

  entry.count++;
  return false;
}

/**
 * Check if user is currently blocked (for UI feedback)
 */
export function isBlocked(key: string): { blocked: boolean; remainingMs: number } {
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
    return { blocked: true, remainingMs: entry.blockUntil - now };
  }
  return { blocked: false, remainingMs: 0 };
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

/**
 * Detect suspicious activity patterns
 */
export function detectSuspiciousActivity(key: string): boolean {
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  
  // If user hit rate limit multiple times, flag as suspicious
  return entry.blocked === true;
}

/**
 * Validate and sanitize order data
 */
export function validateOrderData(data: {
  tableNumber: string;
  items: any[];
  restaurantId: string;
}): { valid: boolean; error?: string } {
  // Validate restaurant ID
  if (!isValidUUID(data.restaurantId)) {
    return { valid: false, error: 'Invalid restaurant' };
  }
  
  // Validate table number
  if (!isValidTableNumber(data.tableNumber)) {
    return { valid: false, error: 'Invalid table number' };
  }
  
  // Validate items array
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { valid: false, error: 'No items in order' };
  }
  
  if (data.items.length > 50) {
    return { valid: false, error: 'Too many items in order' };
  }
  
  // Validate each item
  for (const item of data.items) {
    if (!item.id || !isValidUUID(item.id)) {
      return { valid: false, error: 'Invalid item in order' };
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 99) {
      return { valid: false, error: 'Invalid item quantity' };
    }
  }
  
  return { valid: true };
}

/**
 * Sanitize feedback comment
 */
export function sanitizeFeedback(comment: string): string {
  if (!comment) return '';
  
  // Remove any HTML/script tags
  let sanitized = sanitizeInput(comment);
  
  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Check for bot-like behavior
 */
export function detectBot(): boolean {
  // Check for common bot indicators
  const indicators = [
    !navigator.cookieEnabled,
    navigator.webdriver === true,
    !window.localStorage,
    !window.sessionStorage,
    navigator.languages?.length === 0,
  ];
  
  const botScore = indicators.filter(Boolean).length;
  return botScore >= 2; // If 2+ indicators, likely a bot
}

/**
 * Generate a honeypot field name (for form spam protection)
 */
export function getHoneypotFieldName(): string {
  return 'website_url_field_' + Math.random().toString(36).substring(7);
}
