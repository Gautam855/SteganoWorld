import os
from jose import jwt, JWTError
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session
from chat.database import db_session
from chat.models import ChatUser

logger = logging.getLogger('SteganoWorld.Auth')

# Secret key for JWT signing — in production, use environment variable
JWT_SECRET = os.environ.get('JWT_SECRET', 'stegano-world-jwt-fallback-xyz')
if os.environ.get('JWT_SECRET') is None:
    logger.warning("JWT_SECRET environment variable is NOT set! Using default (UNSAFE).")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 72  # Token valid for 3 days

def create_access_token(user_id: str, username: str):
    """Generate a JWT token for the user."""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(request: Request):
    """Get currentUser from JWT in request headers."""
    auth_header = request.headers.get('Authorization')
    token = None
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    else:
        token = request.query_params.get('token')
        
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id'], payload['username']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_token(token: str):
    """Verify a JWT token (used for Socket.IO)."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

