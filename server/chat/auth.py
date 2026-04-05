"""
Authentication Module — Zero-Knowledge Challenge-Response
==========================================================
NO passwords. Auth works by proving you own the private key:

1. Client requests a challenge (random nonce)
2. Server stores the nonce temporarily (5 min expiry)
3. Client signs the nonce with their PRIVATE key
4. Server verifies signature with stored PUBLIC key
5. If valid → JWT token issued

This means:
  - Server NEVER stores or sees any password
  - Server NEVER sees the private key
  - Auth = proof of key ownership (cryptographic guarantee)
"""

import os
import logging
import secrets
import base64
from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
from flask import request, jsonify
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, utils
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

logger = logging.getLogger('SteganoWorld.Auth')

# Secret key for JWT signing — in production, use environment variable
JWT_SECRET = os.environ.get('JWT_SECRET', 'stegano-world-e2e-secret-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 72  # Token valid for 3 days

CHALLENGE_EXPIRY_MINUTES = 5  # Nonce expires in 5 minutes


# ─── Challenge-Response Auth ─────────────────────────────────────

def generate_challenge() -> str:
    """Generate a cryptographically secure random challenge nonce (64 bytes, hex)."""
    return secrets.token_hex(64)


def verify_signature(public_key_pem: str, challenge: str, signature_b64: str) -> bool:
    """
    Verify that `signature_b64` is a valid RSA-PSS signature of `challenge`
    made with the private key corresponding to `public_key_pem`.
    
    This is the core of zero-knowledge auth:
    - Client signs with PRIVATE key (never sent to server)
    - Server verifies with PUBLIC key (stored on server)
    - If valid → client owns the private key → authenticated
    """
    try:
        # Load the public key
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8'),
            backend=default_backend()
        )
        
        # Decode the signature from base64
        signature = base64.b64decode(signature_b64)
        
        # The challenge is hashed with SHA-256 before signing (Web Crypto RSASSA-PKCS1-v1_5)
        # We need to verify using PKCS1v15 to match Web Crypto's RSASSA-PKCS1-v1_5
        public_key.verify(
            signature,
            challenge.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        return True
    except InvalidSignature:
        logger.warning("Challenge signature verification failed: invalid signature")
        return False
    except Exception as e:
        logger.error(f"Challenge signature verification error: {e}")
        return False


# ─── JWT Token Management ────────────────────────────────────────

def generate_token(user_id: str, username: str) -> str:
    """
    Generate a JWT token for authenticated requests.
    Token contains: user_id, username, expiry timestamp.
    """
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_token(token: str) -> dict | None:
    """
    Verify and decode a JWT token.
    Returns the payload dict on success, None on failure.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None


# ─── Auth Decorator ──────────────────────────────────────────────

def token_required(f):
    """
    Decorator for protecting API endpoints.
    
    Usage:
        @app.route('/api/chat/protected')
        @token_required
        def protected_route(current_user_id, current_username):
            # current_user_id and current_username are injected automatically
            pass
    
    Client must send: Authorization: Bearer <token>
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]

        if not token:
            return jsonify({'error': 'Authentication token is required'}), 401

        # Verify the token
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401

        # Inject user info into the route function
        return f(
            *args,
            current_user_id=payload['user_id'],
            current_username=payload['username'],
            **kwargs
        )

    return decorated
