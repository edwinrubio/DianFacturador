'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Ensure userData directory exists and return path to a secret file.
 */
function ensureUserData(userData) {
  fs.mkdirSync(userData, { recursive: true });
}

/**
 * Get or create the SECRET_KEY.
 * Stored in userData/.secret_key — generated once via crypto.randomBytes(32).
 * @param {string} userData - path to Electron userData directory
 * @returns {string} 64-character hex string
 */
function getSecretKey(userData) {
  ensureUserData(userData);
  const filePath = path.join(userData, '.secret_key');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8').trim();
  }
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(filePath, key, { mode: 0o600 });
  return key;
}

/**
 * Get or create the FERNET_KEY.
 * Stored in userData/.fernet_key — generated once via crypto.randomBytes(32) -> base64url.
 * Fernet keys must be 32 URL-safe base64-encoded bytes (44 characters with padding).
 * @param {string} userData - path to Electron userData directory
 * @returns {string} 44-character base64url string
 */
function getFernetKey(userData) {
  ensureUserData(userData);
  const filePath = path.join(userData, '.fernet_key');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8').trim();
  }
  // Generate 32 random bytes, base64url encode -> 44 chars (with = padding stripped to 43, or kept)
  const key = Buffer.from(crypto.randomBytes(32)).toString('base64url').slice(0, 44);
  fs.writeFileSync(filePath, key, { mode: 0o600 });
  return key;
}

module.exports = { getSecretKey, getFernetKey };
