"""
SteganoWorld Encryption Engine v3.0
===================================
Multi-layered encryption pipeline:
  1. HMAC verification (replaces plaintext 'VALID:' markers)
  2. zlib compression (reduces size + maximum entropy)
  3. Random padding (hides actual message length)
  4. AES-256 GCM (Encryption Layer 1)
  5. ChaCha20-Poly1305 (Encryption Layer 2)

Payload Structure:
  [Salt 16B] [ChaCha Nonce 12B] [ChaCha Tag 16B] [ChaCha Ciphertext]
      └── contains: [AES Nonce 16B] [AES Tag 16B] [AES Ciphertext]
              └── contains: [PadLen 1B] [Compressed Data] [Random Padding]
                      └── compressed from: [Type 1B] [HMAC 16B] [Raw Data]
"""

import zlib
import hmac as hmac_mod
import hashlib
from Crypto.Cipher import AES, ChaCha20_Poly1305
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes

# ─── Data Type Markers (binary, not plaintext — no known-plaintext attack) ────
DATA_TYPE_TEXT = b'\x01'
DATA_TYPE_IMAGE = b'\x02'

# ─── Constants ────────────────────────────────────────────────────
HMAC_SIZE = 16            # 16 bytes HMAC for password verification
PBKDF2_ITERATIONS = 600000
PAD_MIN = 32              # Minimum random padding bytes
PAD_MAX = 128             # Maximum random padding bytes


def _generate_hmac(password_bytes, data_bytes):
    """
    Generate a 16-byte HMAC-SHA256 tag for password verification.
    Unlike 'VALID:' prefix, this is unique per password+data combo.
    Attacker cannot predict it without knowing the password.
    """
    return hmac_mod.new(password_bytes, data_bytes, hashlib.sha256).digest()[:HMAC_SIZE]


def encrypt_binary(data, password, data_type=DATA_TYPE_TEXT):
    """
    Multi-layered encryption pipeline.
    
    Args:
        data: str or bytes — the raw data to encrypt
        password: str — user's password
        data_type: bytes — DATA_TYPE_TEXT or DATA_TYPE_IMAGE

    Returns:
        str (latin-1 encoded) — encrypted payload ready for LSB embedding
    """
    # FIX 5: No default password — must be explicitly provided
    if not password or len(password.strip()) == 0:
        raise ValueError("Password is required for encryption")

    password_bytes = password.encode('utf-8')

    # Ensure data is bytes
    if isinstance(data, str):
        data = data.encode('utf-8')

    # ── Step 1: HMAC Verification Tag ─────────────────────────────
    # Replaces "VALID:" / "IMAGE_VALID:" plaintext markers.
    # HMAC is derived from (password + data), so it's unique and unpredictable.
    hmac_tag = _generate_hmac(password_bytes, data)
    tagged_data = data_type + hmac_tag + data

    # ── Step 2: Compress (zlib level 9) ───────────────────────────
    # - Reduces payload size (fewer pixels modified = harder to detect)
    # - Increases entropy (compressed data looks random = defeats statistical analysis)
    compressed = zlib.compress(tagged_data, level=9)

    # ── Step 3: Random Padding ────────────────────────────────────
    # Adds 32-128 random bytes so payload size doesn't reveal message length.
    # pad_len stored in first byte so we can strip it during decryption.
    pad_len = get_random_bytes(1)[0] % (PAD_MAX - PAD_MIN + 1) + PAD_MIN
    random_padding = get_random_bytes(pad_len)
    padded = bytes([pad_len]) + compressed + random_padding

    # ── Step 4: Derive TWO Independent Keys ───────────────────────
    # Single password → 64-byte key material → split into 2 x 32-byte keys
    # Each layer uses a completely independent key.
    salt = get_random_bytes(16)
    full_key = PBKDF2(password, salt, dkLen=64, count=PBKDF2_ITERATIONS)
    aes_key = full_key[:32]       # First 32 bytes → AES-256
    chacha_key = full_key[32:]    # Last 32 bytes → ChaCha20

    # ── Step 5: Layer 1 — AES-256 GCM ────────────────────────────
    aes_cipher = AES.new(aes_key, AES.MODE_GCM)
    aes_ct, aes_tag = aes_cipher.encrypt_and_digest(padded)
    aes_bundle = aes_cipher.nonce + aes_tag + aes_ct  # [Nonce 16B][Tag 16B][CT]

    # ── Step 6: Layer 2 — ChaCha20-Poly1305 ──────────────────────
    # Different algorithm family than AES. If AES ever breaks, ChaCha20 still protects.
    chacha_cipher = ChaCha20_Poly1305.new(key=chacha_key)
    chacha_ct, chacha_tag = chacha_cipher.encrypt_and_digest(aes_bundle)

    # ── Final Payload ─────────────────────────────────────────────
    # [Salt 16B] + [ChaCha Nonce 12B] + [ChaCha Tag 16B] + [ChaCha Ciphertext]
    payload = salt + chacha_cipher.nonce + chacha_tag + chacha_ct

    # Return as latin-1 string to preserve raw byte integrity for LSB stegano lib
    return payload.decode('latin-1')


def decrypt_binary(encrypted_str, password):
    """
    Reverse multi-layered decryption pipeline.

    Args:
        encrypted_str: str (latin-1) — the encrypted payload from LSB reveal
        password: str — user's password

    Returns:
        tuple (data_type: bytes, raw_data: bytes) on success
        str starting with "ERROR:" on failure
    """
    if not password or len(password.strip()) == 0:
        raise ValueError("Password is required for decryption")

    password_bytes = password.encode('utf-8')

    try:
        data = encrypted_str.encode('latin-1')

        # Minimum size check:
        # Salt(16) + ChachaNonce(12) + ChachaTag(16) + AESNonce(16) + AESTag(16) + PadLen(1) + min(1)
        if len(data) < 78:
            return "ERROR:DATA_TOO_SHORT"

        # ── Unpack Outer Layer ────────────────────────────────────
        salt = data[:16]
        chacha_nonce = data[16:28]     # ChaCha20 nonce = 12 bytes
        chacha_tag = data[28:44]       # ChaCha20 tag = 16 bytes
        chacha_ct = data[44:]          # ChaCha20 ciphertext

        # ── Re-derive Both Keys ──────────────────────────────────
        full_key = PBKDF2(password, salt, dkLen=64, count=PBKDF2_ITERATIONS)
        aes_key = full_key[:32]
        chacha_key = full_key[32:]

        # ── Layer 2 Decrypt: ChaCha20-Poly1305 ───────────────────
        chacha_cipher = ChaCha20_Poly1305.new(key=chacha_key, nonce=chacha_nonce)
        aes_bundle = chacha_cipher.decrypt_and_verify(chacha_ct, chacha_tag)

        # ── Layer 1 Decrypt: AES-256 GCM ─────────────────────────
        aes_nonce = aes_bundle[:16]
        aes_tag = aes_bundle[16:32]
        aes_ct = aes_bundle[32:]

        aes_cipher = AES.new(aes_key, AES.MODE_GCM, nonce=aes_nonce)
        padded = aes_cipher.decrypt_and_verify(aes_ct, aes_tag)

        # ── Remove Random Padding ────────────────────────────────
        pad_len = padded[0]
        compressed = padded[1 : len(padded) - pad_len]

        # ── Decompress ───────────────────────────────────────────
        tagged_data = zlib.decompress(compressed)

        # ── Extract Type + HMAC + Data ───────────────────────────
        data_type = tagged_data[0:1]              # 1 byte type
        stored_hmac = tagged_data[1:1 + HMAC_SIZE]  # 16 bytes HMAC
        raw_data = tagged_data[1 + HMAC_SIZE:]      # remaining = actual data

        # ── Verify HMAC (constant-time comparison) ───────────────
        expected_hmac = _generate_hmac(password_bytes, raw_data)
        if not hmac_mod.compare_digest(stored_hmac, expected_hmac):
            return "ERROR:INVALID_DECRYPTION"

        return (data_type, raw_data)

    except (ValueError, KeyError):
        # Authentication failed (wrong password or tampered data)
        return "ERROR:INVALID_DECRYPTION"
    except Exception as e:
        return f"ERROR:{str(e)}"


# ─── Legacy Compatibility ────────────────────────────────────────
def encrypt_vigenere(text, key):
    return encrypt_binary(text, key)

def decrypt_vigenere(text, key):
    return decrypt_binary(text, key)
