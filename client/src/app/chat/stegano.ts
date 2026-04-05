/**
 * 🖼️ Browser-side LSB Steganography Engine
 * ==========================================
 * Hides encrypted data inside image pixels using Least Significant Bit (LSB).
 * All operations happen in the browser — server NEVER sees the plaintext.
 *
 * FLOW:
 *   Encode: plaintext → AES-256-GCM encrypt → RSA wrap key → binary → LSB embed in pixels → PNG blob
 *   Decode: PNG → LSB extract → binary → RSA unwrap key → AES decrypt → plaintext
 *
 * Binary payload format:
 *   [4 bytes: payload length]
 *   [2 bytes: recipientKeyLen]
 *   [recipientKeyLen bytes: encrypted AES key for recipient]
 *   [2 bytes: senderKeyLen]
 *   [senderKeyLen bytes: encrypted AES key for sender]
 *   [12 bytes: AES-GCM IV]
 *   [remaining bytes: AES-encrypted message]
 */

import { encryptMessage, decryptMessage } from './crypto';

// ─── LSB Encode (Hide data in image) ────────────────────────────

/**
 * Embed an encrypted message inside a cover image.
 * Returns a PNG Blob containing the stego image.
 */
export async function embedInImage(
  coverImageFile: File,
  secretText: string,
  recipientPublicKeyPem: string,
  senderPublicKeyPem: string
): Promise<{ blob: Blob; encryptedPayload: EncryptedSteganoPayload }> {
  // 1. Encrypt the secret text
  const encrypted = await encryptMessage(secretText, recipientPublicKeyPem, senderPublicKeyPem);

  // 2. Pack into binary payload
  const payload = packPayload(encrypted);

  // 3. Load cover image onto canvas
  const img = await loadImage(coverImageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // 4. Check capacity (3 bits per pixel — R, G, B channels)
  const maxBytes = Math.floor((img.width * img.height * 3) / 8) - 4; // 4 bytes for length header
  if (payload.length > maxBytes) {
    throw new Error(
      `Message too large for this image. Need ${payload.length} bytes, image can hold ${maxBytes} bytes. Use a larger cover image.`
    );
  }

  // 5. Embed payload into pixels via LSB
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  embedBitsInPixels(imageData.data, payload);
  ctx.putImageData(imageData, 0, 0);

  // 6. Export as PNG blob
  const blob = await canvasToBlob(canvas);

  return {
    blob,
    encryptedPayload: {
      encryptedMessage: encrypted.encryptedMessage,
      encryptedAesKeyRecipient: encrypted.encryptedAesKeyRecipient,
      encryptedAesKeySender: encrypted.encryptedAesKeySender,
      iv: encrypted.iv,
    },
  };
}

export async function hideDataInImage(coverImageFile: File, payloadString: string): Promise<Blob> {
  const encoder = new TextEncoder();
  const payload = encoder.encode(payloadString);

  const img = await loadImage(coverImageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const maxBytes = Math.floor((img.width * img.height * 3) / 8) - 4;
  if (payload.length > maxBytes) {
    throw new Error(`Message too large for this image. Need ${payload.length} bytes, image can hold ${maxBytes} bytes.`);
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  embedBitsInPixels(imageData.data, payload);
  ctx.putImageData(imageData, 0, 0);

  return canvasToBlob(canvas);
}

export async function extractDataFromImage(stegoImageBlob: Blob): Promise<string> {
  const img = await loadImageFromBlob(stegoImageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const payload = extractBitsFromPixels(imageData.data);

  const decoder = new TextDecoder();
  return decoder.decode(payload);
}

/**
 * Extract and decrypt a hidden message from a stego image.
 */
export async function extractFromImage(
  stegoImageBlob: Blob,
  privateKeyPem: string,
  isSender: boolean
): Promise<string> {
  // 1. Load image onto canvas
  const img = await loadImageFromBlob(stegoImageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // 2. Extract payload from pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const payload = extractBitsFromPixels(imageData.data);

  // 3. Unpack binary payload
  const encrypted = unpackPayload(payload);

  // 4. Decrypt using the correct AES key
  const aesKey = isSender
    ? encrypted.encryptedAesKeySender
    : encrypted.encryptedAesKeyRecipient;

  const plaintext = await decryptMessage(
    encrypted.encryptedMessage,
    aesKey,
    encrypted.iv,
    privateKeyPem
  );

  return plaintext;
}


// ─── Shared Link Crypto ──────────────────────────────────────────

export async function decryptSharedHiddenData(
  encryptedPayload: { cipher: string; iv: string; type: string },
  encryptedAesKeyBase64: string,
  privateKeyPem: string
) {
  // 1. Decrypt AES Key using RSA private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryDerString = window.atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  
  const rsaKey = await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );

  const encAesBuf = Uint8Array.from(atob(encryptedAesKeyBase64), c => c.charCodeAt(0));
  const rawAesBuf = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    rsaKey,
    encAesBuf
  );

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawAesBuf,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // 2. Decrypt message using AES key
  const ivBuf = Uint8Array.from(atob(encryptedPayload.iv), c => c.charCodeAt(0));
  const cipherBuf = Uint8Array.from(atob(encryptedPayload.cipher), c => c.charCodeAt(0));

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuf },
    aesKey,
    cipherBuf
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuf);
}


// ─── Payload Types ───────────────────────────────────────────────

export interface EncryptedSteganoPayload {
  encryptedMessage: string;
  encryptedAesKeyRecipient: string;
  encryptedAesKeySender: string;
  iv: string;
}


// ─── Binary Packing ─────────────────────────────────────────────

function packPayload(encrypted: {
  encryptedMessage: string;
  encryptedAesKeyRecipient: string;
  encryptedAesKeySender: string;
  iv: string;
}): Uint8Array {
  const recipientKeyBytes = base64ToBytes(encrypted.encryptedAesKeyRecipient);
  const senderKeyBytes = base64ToBytes(encrypted.encryptedAesKeySender);
  const ivBytes = base64ToBytes(encrypted.iv);
  const messageBytes = base64ToBytes(encrypted.encryptedMessage);

  // Calculate total size
  const totalSize = 2 + recipientKeyBytes.length + 2 + senderKeyBytes.length + ivBytes.length + messageBytes.length;

  // Build payload (without length header — that's added during embedding)
  const payload = new Uint8Array(totalSize);
  let offset = 0;

  // Recipient key length (2 bytes, big-endian)
  payload[offset++] = (recipientKeyBytes.length >> 8) & 0xff;
  payload[offset++] = recipientKeyBytes.length & 0xff;
  payload.set(recipientKeyBytes, offset);
  offset += recipientKeyBytes.length;

  // Sender key length (2 bytes, big-endian)
  payload[offset++] = (senderKeyBytes.length >> 8) & 0xff;
  payload[offset++] = senderKeyBytes.length & 0xff;
  payload.set(senderKeyBytes, offset);
  offset += senderKeyBytes.length;

  // IV (12 bytes)
  payload.set(ivBytes, offset);
  offset += ivBytes.length;

  // Encrypted message (rest)
  payload.set(messageBytes, offset);

  return payload;
}

function unpackPayload(payload: Uint8Array): EncryptedSteganoPayload {
  let offset = 0;

  // Recipient key
  const recipientKeyLen = (payload[offset] << 8) | payload[offset + 1];
  offset += 2;
  const recipientKeyBytes = payload.slice(offset, offset + recipientKeyLen);
  offset += recipientKeyLen;

  // Sender key
  const senderKeyLen = (payload[offset] << 8) | payload[offset + 1];
  offset += 2;
  const senderKeyBytes = payload.slice(offset, offset + senderKeyLen);
  offset += senderKeyLen;

  // IV (12 bytes)
  const ivBytes = payload.slice(offset, offset + 12);
  offset += 12;

  // Encrypted message (rest)
  const messageBytes = payload.slice(offset);

  return {
    encryptedAesKeyRecipient: bytesToBase64(recipientKeyBytes),
    encryptedAesKeySender: bytesToBase64(senderKeyBytes),
    iv: bytesToBase64(ivBytes),
    encryptedMessage: bytesToBase64(messageBytes),
  };
}


// ─── LSB Bit Manipulation ────────────────────────────────────────

function embedBitsInPixels(pixels: Uint8ClampedArray, payload: Uint8Array): void {
  // First 32 bits = payload length
  const lengthBits = numberTo32Bits(payload.length);
  const dataBits = bytesToBits(payload);
  const allBits = [...lengthBits, ...dataBits];

  let bitIndex = 0;
  for (let i = 0; i < pixels.length && bitIndex < allBits.length; i++) {
    // Skip alpha channel (every 4th byte)
    if ((i + 1) % 4 === 0) continue;

    // Set LSB of this channel to our data bit
    pixels[i] = (pixels[i] & 0xfe) | allBits[bitIndex];
    bitIndex++;
  }
}

function extractBitsFromPixels(pixels: Uint8ClampedArray): Uint8Array {
  // First, read 32 bits for payload length
  const lengthBits: number[] = [];
  let pixelIndex = 0;

  for (let i = 0; i < pixels.length && lengthBits.length < 32; i++) {
    if ((i + 1) % 4 === 0) continue;
    lengthBits.push(pixels[i] & 1);
    pixelIndex = i + 1;
  }

  const payloadLength = bits32ToNumber(lengthBits);

  // Sanity check
  if (payloadLength <= 0 || payloadLength > 50_000_000) {
    throw new Error('No hidden data found in this image, or the image is corrupted.');
  }

  // Read payload bits
  const totalBits = payloadLength * 8;
  const dataBits: number[] = [];

  for (let i = pixelIndex; i < pixels.length && dataBits.length < totalBits; i++) {
    if ((i + 1) % 4 === 0) continue;
    dataBits.push(pixels[i] & 1);
  }

  return bitsToBytes(dataBits);
}


// ─── Bit Helpers ─────────────────────────────────────────────────

function numberTo32Bits(n: number): number[] {
  const bits: number[] = [];
  for (let i = 31; i >= 0; i--) {
    bits.push((n >> i) & 1);
  }
  return bits;
}

function bits32ToNumber(bits: number[]): number {
  let n = 0;
  for (let i = 0; i < 32; i++) {
    n = (n << 1) | bits[i];
  }
  return n >>> 0; // Force unsigned
}

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push((bytes[i] >> j) & 1);
    }
  }
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) {
    bytes[Math.floor(i / 8)] |= bits[i] << (7 - (i % 8));
  }
  return bytes;
}


// ─── Image Helpers ───────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load stego image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      },
      'image/png',
      1.0 // Lossless for steganography
    );
  });
}


// ─── Base64 Helpers ──────────────────────────────────────────────

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
