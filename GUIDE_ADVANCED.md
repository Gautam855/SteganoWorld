# 🔐 SteganoWorld: Advanced Cryptographic Specification

This document defines the exact protocols and binary formats used in SteganoWorld.

## 1. Key Specification
SteganoWorld uses two distinct RSA-4096 bit key pairs per user:
*   **Auth (Signing)**: `RSASSA-PKCS1-v1_5` with SHA-256.
*   **Encryption (Privacy)**: `RSA-OAEP` with SHA-256.

Private keys are never transmitted; they are stored in the browser's `localStorage` or `IndexedDB`.

## 2. E2EE Messaging Protocol (Double-Wrap)
To support multi-device history (future) and sender-readability, we use a dual-wrapping scheme:
1.  **Payload Encryption**: `AES-256-GCM` with a random 12-byte IV.
2.  **Key Wrapping**: The raw 32-byte AES key is encrypted twice:
    *   `Ciphertext_R = RSA_Encrypt(Recipient_PubKey, AES_Key)`
    *   `Ciphertext_S = RSA_Encrypt(Sender_PubKey, AES_Key)`
3.  **Auth**: All API calls are secured via a JWT issued after a successful RSA challenge-reponse signature verification.

## 3. Steganography Binary Spec
Data is embedded into the **LSB (Least Significant Bit)** of the RGB channels of a PNG image.

### Binary Header & Payload Mapping
| Bit Offset | Name | Description |
| :--- | :--- | :--- |
| `0 - 31` | **Total Length** | 32-bit Big-Endian integer of the payload. |
| `32 - 47` | **Recip Key Len** | 16-bit integer (N). |
| `48 - ...` | **WEK_R** | RSA-wrapped AES key for Recipient (N bytes). |
| `...` | **Sender Key Len** | 16-bit integer (M). |
| `...` | **WEK_S** | RSA-wrapped AES key for Sender (M bytes). |
| `...` | **IV** | 12-byte AES-GCM IV. |
| `...` | **Data** | The AES-encrypted secret content. |

## 4. Vigenere Engine v3.0 (Manual Mode)
For the manual encryption tool, we use a 5-stage pipeline:
1.  **HMAC-SHA256**: 16B verification tag derived from `Password + Plaintext`.
2.  **Zlib (L9)**: Compression for entropy and size reduction.
3.  **PBKDF2**: Key derivation with **600,000 iterations** using HMAC-SHA256.
4.  **AES-256-GCM**: Layer 1 Symmetric encryption.
5.  **ChaCha20-Poly1305**: Layer 2 Symmetric encryption for cryptographic diversity.

## 5. Implementation Notes
*   **Optimization**: Public keys are cached as `CryptoKey` objects to bypass PEM parsing overhead.
*   **Safety**: Alpha channels in images are skipped during embedding to ensure compatibility with standard PNG viewers.

---
*Engineering Team | SteganoWorld*
