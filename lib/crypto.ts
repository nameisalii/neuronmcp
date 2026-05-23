import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12 // NIST SP 800-38D standard for AES-GCM; existing tokens need re-encryption
const TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY environment variable is not set')
  const key = Buffer.from(raw, 'hex')
  if (key.length !== KEY_LENGTH) throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  return key
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const buf = Buffer.from(ciphertext, 'base64url')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
