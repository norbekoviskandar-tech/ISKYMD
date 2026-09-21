import crypto from 'crypto';
import { promisify } from 'util';

// Server-only password hashing (scrypt, built into Node - no extra dependency).
// Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
// Legacy format (unsalted SHA-256, 64 hex chars) is still accepted so existing
// users can log in; it is upgraded to scrypt on their next successful login.

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;
const N = 16384;
const R = 8;
const P = 1;

const LEGACY_SHA256 = /^[0-9a-f]{64}$/;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

function safeEqual(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Returns { valid, needsUpgrade }
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string' || !stored) {
    return { valid: false, needsUpgrade: false };
  }

  if (stored.startsWith('scrypt$')) {
    const [, n, r, p, saltB64, hashB64] = stored.split('$');
    if (!n || !r || !p || !saltB64 || !hashB64) return { valid: false, needsUpgrade: false };
    const expected = Buffer.from(hashB64, 'base64');
    const derived = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return { valid: safeEqual(derived, expected), needsUpgrade: false };
  }

  if (LEGACY_SHA256.test(stored)) {
    const candidate = Buffer.from(crypto.createHash('sha256').update(password).digest('hex'));
    const valid = safeEqual(candidate, Buffer.from(stored));
    return { valid, needsUpgrade: valid };
  }

  return { valid: false, needsUpgrade: false };
}
