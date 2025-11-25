import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import bcrypt from 'bcryptjs'

// Environment variables for encryption - should be set in production
const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (isDev ? 'default-encryption-key-for-development-only' : '');
const SALT = process.env.ENCRYPTION_SALT || (isDev ? 'default-salt-for-development-only' : '');

// Generate a secure key from the encryption key and salt
export const generateKey = (): Buffer => {
  return scryptSync(ENCRYPTION_KEY, SALT, 32); // 32 bytes for AES-256
};

// Encrypt data using AES-256-GCM
export const encrypt = (data: string): { encrypted: string; iv: string; authTag: string } => {
  const key = generateKey();
  const iv = randomBytes(16); // 16 bytes for AES
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag
  };
};

// Decrypt data using AES-256-GCM
export const decrypt = (encrypted: string, iv: string, authTag: string): string => {
  const key = generateKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  
  const decipher = createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Hash password with salt (for withdrawal password)
export const hashPassword = (password: string): string => {
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
};

// Verify hashed password
export const verifyPassword = (password: string, hashed: string): boolean => {
  try { return bcrypt.compareSync(password, hashed); } catch { return false; }
};

// Generate secure random token for verification
export const generateSecureToken = (length: number = 32): string => {
  return randomBytes(length).toString('hex');
};

// Validate password meets PCI DSS requirements
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  strength: number;
} => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  
  const strength = Object.values(requirements).filter(Boolean).length * 20;
  
  return {
    isValid: Object.values(requirements).every(Boolean),
    requirements,
    strength
  };
};
