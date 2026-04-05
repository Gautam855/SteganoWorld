/**
 * 🔐 E2EE Crypto Module — Web Crypto API (Optimized)
 * ====================================================
 * Zero-Knowledge Encryption System
 *
 * OPTIMIZATIONS:
 * - CryptoKey cache: Public/private keys are imported ONCE, then reused
 * - Parallel RSA: Recipient + Sender key wrapping happens simultaneously
 * - Pre-warmed keys: importAndCacheKey() can be called ahead of time
 *
 * PRIVATE KEY NEVER LEAVES THIS DEVICE.
 * Server only ever sees: public key + encrypted data.
 */

// ─── Key Cache (HUGE performance win) ────────────────────────────
// RSA key import from PEM is expensive (~50-100ms for 4096-bit).
// Cache imported CryptoKey objects so it only happens once per key.

const publicKeyCache = new Map<string, CryptoKey>();
const privateKeyCache = new Map<string, CryptoKey>();
const signingKeyCache = new Map<string, CryptoKey>();

// Create a short fingerprint of a PEM for cache key (first 64 chars of base64)
function pemFingerprint(pem: string): string {
  return pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '').substring(0, 64);
}


// ─── Key Generation ──────────────────────────────────────────────

/**
 * Generate an RSA-4096 key pair for E2EE.
 * Returns both the CryptoKeyPair and PEM-encoded public key.
 */
export async function generateKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyPem: string;
  privateKeyPem: string;
}> {
  const encryptionKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', encryptionKeyPair.publicKey);
  const publicKeyPem = arrayBufferToPem(publicKeyBuffer, 'PUBLIC KEY');

  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', encryptionKeyPair.privateKey);
  const privateKeyPem = arrayBufferToPem(privateKeyBuffer, 'PRIVATE KEY');

  // Pre-cache these keys immediately
  const pubFp = pemFingerprint(publicKeyPem);
  const privFp = pemFingerprint(privateKeyPem);
  publicKeyCache.set(pubFp, encryptionKeyPair.publicKey);
  privateKeyCache.set(privFp, encryptionKeyPair.privateKey);

  return { keyPair: encryptionKeyPair, publicKeyPem, privateKeyPem };
}

/**
 * Generate a separate RSA key pair for signing (challenge-response auth).
 */
export async function generateSigningKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyPem: string;
  privateKeyPem: string;
}> {
  const signingKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', signingKeyPair.publicKey);
  const publicKeyPem = arrayBufferToPem(publicKeyBuffer, 'PUBLIC KEY');

  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', signingKeyPair.privateKey);
  const privateKeyPem = arrayBufferToPem(privateKeyBuffer, 'PRIVATE KEY');

  return { keyPair: signingKeyPair, publicKeyPem, privateKeyPem };
}


// ─── Message Encryption (AES-256-GCM + RSA-OAEP) — OPTIMIZED ─────

/**
 * Encrypt a message for a recipient. FAST version.
 *
 * Optimizations vs original:
 * 1. CryptoKey cache — PEM parsed only once, reused forever
 * 2. Parallel RSA — recipient + sender key wrapping runs simultaneously
 * 3. AES gen + plaintext encryption runs while keys import
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyPem: string,
  senderPublicKeyPem: string
): Promise<{
  encryptedMessage: string;
  encryptedAesKeyRecipient: string;
  encryptedAesKeySender: string;
  iv: string;
}> {
  // 🚀 Start key imports IMMEDIATELY (cached = instant)
  const recipientKeyPromise = importPublicKey(recipientPublicKeyPem);
  const senderKeyPromise = importPublicKey(senderPublicKeyPem);

  // While keys are importing, generate AES key + encrypt plaintext
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // AES encryption + key export run in parallel
  const [encryptedBuffer, rawAesKey] = await Promise.all([
    crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintextBytes),
    crypto.subtle.exportKey('raw', aesKey),
  ]);

  // Now wrap the AES key with BOTH RSA keys IN PARALLEL
  const [recipientRsaKey, senderRsaKey] = await Promise.all([
    recipientKeyPromise,
    senderKeyPromise,
  ]);

  const [encryptedAesKeyRecipient, encryptedAesKeySender] = await Promise.all([
    crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientRsaKey, rawAesKey),
    crypto.subtle.encrypt({ name: 'RSA-OAEP' }, senderRsaKey, rawAesKey),
  ]);

  return {
    encryptedMessage: arrayBufferToBase64(encryptedBuffer),
    encryptedAesKeyRecipient: arrayBufferToBase64(encryptedAesKeyRecipient),
    encryptedAesKeySender: arrayBufferToBase64(encryptedAesKeySender),
    iv: arrayBufferToBase64(iv),
  };
}


/**
 * Decrypt a message using your private key. FAST version with caching.
 */
export async function decryptMessage(
  encryptedMessage: string,
  encryptedAesKey: string,
  iv: string,
  privateKeyPem: string
): Promise<string> {
  // 1. Import private key (cached after first use)
  const privateKey = await importPrivateKey(privateKeyPem);

  // 2. Decrypt AES key with RSA private key
  const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKey);
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedAesKeyBuffer
  );

  // 3. Import AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // 4. Decrypt message with AES
  const ivBuffer = base64ToArrayBuffer(iv);
  const encryptedBuffer = base64ToArrayBuffer(encryptedMessage);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    aesKey,
    encryptedBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}


// ─── Challenge-Response Auth ─────────────────────────────────────

/**
 * Sign a challenge nonce with the signing private key.
 */
export async function signChallenge(
  challenge: string,
  signingPrivateKeyPem: string
): Promise<string> {
  const privateKey = await importSigningPrivateKey(signingPrivateKeyPem);
  const data = new TextEncoder().encode(challenge);

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    data
  );

  return arrayBufferToBase64(signature);
}


// ─── Pre-warming (call on app start for instant first message) ───

/**
 * Pre-import keys into cache so the first message sends instantly.
 * Call this when the chat window opens with a user.
 */
export async function prewarmKeys(
  recipientPublicKeyPem: string,
  senderPublicKeyPem: string,
  senderPrivateKeyPem: string
): Promise<void> {
  await Promise.all([
    importPublicKey(recipientPublicKeyPem),
    importPublicKey(senderPublicKeyPem),
    importPrivateKey(senderPrivateKeyPem),
  ]);
}


// ─── Key Import/Export Helpers (CACHED) ──────────────────────────

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const fp = pemFingerprint(pem);
  const cached = publicKeyCache.get(fp);
  if (cached) return cached;

  const binaryDer = pemToArrayBuffer(pem);
  const key = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  publicKeyCache.set(fp, key);
  return key;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const fp = pemFingerprint(pem);
  const cached = privateKeyCache.get(fp);
  if (cached) return cached;

  const binaryDer = pemToArrayBuffer(pem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
  privateKeyCache.set(fp, key);
  return key;
}

async function importSigningPrivateKey(pem: string): Promise<CryptoKey> {
  const fp = pemFingerprint(pem);
  const cached = signingKeyCache.get(fp);
  if (cached) return cached;

  const binaryDer = pemToArrayBuffer(pem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  signingKeyCache.set(fp, key);
  return key;
}


// ─── Encoding Helpers ────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToPem(buffer: ArrayBuffer, type: string): string {
  const base64 = arrayBufferToBase64(buffer);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '');
  return base64ToArrayBuffer(base64);
}
