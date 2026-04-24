/**
 * Application-level encryption for sensitive per-user secrets (API keys).
 *
 * AES-256-GCM with a random IV per ciphertext. The auth tag is appended to
 * the ciphertext, and the IV is prefixed, separated by a dot:
 *
 *     <iv_base64>.<ciphertext_with_tag_base64>
 *
 * This format is one opaque text column in Postgres, easy to copy around,
 * and authenticated so tampering is detected on decrypt.
 *
 * Key is a 32-byte (256-bit) secret provided via the ENCRYPTION_KEY env var,
 * stored as base64.
 *
 * Generate with:  openssl rand -base64 32
 */
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY missing from environment');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== KEY_LEN) {
    throw new Error(`ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${buf.length})`);
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, tag]);
  return `${iv.toString('base64')}.${payload.toString('base64')}`;
}

export function decrypt(token: string): string {
  const [ivB64, payloadB64] = token.split('.');
  if (!ivB64 || !payloadB64) throw new Error('Malformed encrypted token');
  const iv = Buffer.from(ivB64, 'base64');
  const payload = Buffer.from(payloadB64, 'base64');
  if (iv.length !== IV_LEN || payload.length <= TAG_LEN) {
    throw new Error('Malformed encrypted token');
  }
  const encrypted = payload.subarray(0, payload.length - TAG_LEN);
  const tag = payload.subarray(payload.length - TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
