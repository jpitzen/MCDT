/**
 * Account Lockout Middleware
 *
 * Tracks consecutive failed login attempts per email address using an in-memory
 * Map.  After `MAX_ATTEMPTS` failures within `LOCKOUT_WINDOW_MS` the account is
 * locked for `LOCKOUT_DURATION_MS`.
 *
 * The middleware is designed to be applied *before* the login handler so it can
 * short-circuit locked accounts, and it exposes helpers that the login route
 * calls to record successes/failures.
 *
 * Defaults (overridable via environment):
 *   MAX_ATTEMPTS          = 5
 *   LOCKOUT_DURATION_MS   = 15 * 60 * 1000   (15 minutes)
 *   LOCKOUT_WINDOW_MS     = 15 * 60 * 1000   (15 minutes — sliding)
 */

const logger = require('../services/logger');

const MAX_ATTEMPTS = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS, 10) || 5;
const LOCKOUT_DURATION_MS = parseInt(process.env.LOCKOUT_DURATION_MS, 10) || 15 * 60 * 1000;
const LOCKOUT_WINDOW_MS = parseInt(process.env.LOCKOUT_WINDOW_MS, 10) || 15 * 60 * 1000;

// In-memory store — { email → { attempts: number, firstAttempt: number, lockedUntil: number|null } }
const attempts = new Map();

/**
 * Periodically purge stale entries (every 10 minutes) so the Map doesn't grow
 * unboundedly on long-lived processes.
 */
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of attempts) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      attempts.delete(email);
    } else if (now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
      attempts.delete(email);
    }
  }
}, 10 * 60 * 1000).unref(); // .unref() so this doesn't prevent process exit

/**
 * Check if the account is currently locked.  Short-circuits with 429.
 */
const checkAccountLock = (req, res, next) => {
  const email = req.body?.email?.toLowerCase?.();
  if (!email) return next();

  const entry = attempts.get(email);
  if (!entry) return next();

  const now = Date.now();

  // If locked and lock hasn't expired → reject
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSec = Math.ceil((entry.lockedUntil - now) / 1000);
    logger.security('Account locked — login rejected', 'warn', { email, retryAfterSec });
    return res.status(429).json({
      status: 'error',
      message: 'Account temporarily locked due to too many failed login attempts. Try again later.',
      code: 'ACCOUNT_LOCKED',
      retryAfterSeconds: retryAfterSec,
    });
  }

  // Lock expired — reset
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    attempts.delete(email);
  }

  next();
};

/**
 * Record a failed login attempt.  Call from the login handler on bad password.
 */
const recordFailedAttempt = (email) => {
  if (!email) return;
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = attempts.get(key) || { attempts: 0, firstAttempt: now, lockedUntil: null };

  // Reset window if it expired
  if (now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
    entry.attempts = 0;
    entry.firstAttempt = now;
    entry.lockedUntil = null;
  }

  entry.attempts += 1;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    logger.security('Account locked after max failed attempts', 'warn', {
      email: key,
      attempts: entry.attempts,
      lockedUntilISO: new Date(entry.lockedUntil).toISOString(),
    });
  }

  attempts.set(key, entry);
};

/**
 * Clear attempts on successful login.
 */
const recordSuccessfulLogin = (email) => {
  if (!email) return;
  attempts.delete(email.toLowerCase());
};

/** Expose internals for testing */
const _getAttempts = () => attempts;

module.exports = {
  checkAccountLock,
  recordFailedAttempt,
  recordSuccessfulLogin,
  _getAttempts,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
};
