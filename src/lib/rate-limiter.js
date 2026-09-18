// Simple in-memory rate limiter
// For production, consider using Redis or a database-backed solution

const loginAttempts = new Map(); // key: email:ip, value: { count, timestamp }
const registerAttempts = new Map(); // key: ip, value: { count, timestamp }

const LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutes
const REGISTER_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_REGISTER_ATTEMPTS = 5;

function cleanupOldEntries(map, windowMs) {
  const now = Date.now();
  for (const [key, value] of map.entries()) {
    if (now - value.timestamp > windowMs) {
      map.delete(key);
    }
  }
}

export function checkLoginRateLimit(email, ip) {
  cleanupOldEntries(loginAttempts, LOGIN_WINDOW);
  
  const key = `${email}:${ip}`;
  const record = loginAttempts.get(key);
  
  if (!record) {
    return { allowed: true };
  }
  
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingTime = Math.ceil((LOGIN_WINDOW - (Date.now() - record.timestamp)) / 1000 / 60);
    return { 
      allowed: false, 
      message: `Too many failed login attempts. Try again in ${remainingTime} minutes.` 
    };
  }
  
  return { allowed: true };
}

export function recordFailedLogin(email, ip) {
  const key = `${email}:${ip}`;
  const record = loginAttempts.get(key) || { count: 0, timestamp: Date.now() };
  record.count++;
  record.timestamp = Date.now();
  loginAttempts.set(key, record);
}

export function resetLoginAttempts(email, ip) {
  const key = `${email}:${ip}`;
  loginAttempts.delete(key);
}

export function checkRegisterRateLimit(ip) {
  cleanupOldEntries(registerAttempts, REGISTER_WINDOW);
  
  const record = registerAttempts.get(ip);
  
  if (!record) {
    return { allowed: true };
  }
  
  if (record.count >= MAX_REGISTER_ATTEMPTS) {
    const remainingTime = Math.ceil((REGISTER_WINDOW - (Date.now() - record.timestamp)) / 1000 / 60);
    return { 
      allowed: false, 
      message: `Too many registration attempts. Try again in ${remainingTime} minutes.` 
    };
  }
  
  return { allowed: true };
}

export function recordRegisterAttempt(ip) {
  const record = registerAttempts.get(ip) || { count: 0, timestamp: Date.now() };
  record.count++;
  record.timestamp = Date.now();
  registerAttempts.set(ip, record);
}
