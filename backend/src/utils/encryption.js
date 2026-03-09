/**
 * Shared AES-256-GCM encryption/decryption utility
 *
 * Extracted from credentialService.js so that multiple modules
 * (credentialService, AdConfiguration bind-password, etc.) can
 * share the same symmetric-key helpers without duplicating code.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

/**
 * Derive a 32-byte key from the configured secret.
 * Uses ENCRYPTION_KEY env var first, falls back to JWT_SECRET.
 */
function getEncryptionKey() {
  const raw =
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'default-encryption-key-change-in-production';
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext - The data to encrypt
 * @param {Buffer} [key] - Optional 32-byte key; defaults to getEncryptionKey()
 * @returns {{ encryptedData: string, iv: string, authTag: string }} hex-encoded
 */
function encrypt(plaintext, key) {
  const encKey = key || getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, encKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt data previously encrypted with encrypt().
 * @param {string} encryptedData - Hex-encoded ciphertext
 * @param {string} iv - Hex-encoded initialization vector
 * @param {string} authTag - Hex-encoded GCM authentication tag
 * @param {Buffer} [key] - Optional 32-byte key; defaults to getEncryptionKey()
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedData, iv, authTag, key) {
  const encKey = key || getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encKey,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt, getEncryptionKey, ALGORITHM };
