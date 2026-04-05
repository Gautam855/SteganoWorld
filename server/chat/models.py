"""
Database Models — ChatUser & Message
=====================================
Zero-Knowledge Architecture:
  - ChatUser: Stores ONLY public key + profile (NO password, NO secrets)
  - Message:  Stores ONLY encrypted data (server can NEVER read them)
  
Auth is via challenge-response: server sends nonce, client signs with
private key, server verifies with stored public key. No password ever
touches the server.
"""

import uuid
from datetime import datetime, timezone
from chat.database import db


class ChatUser(db.Model):
    """
    User profile for the E2E chat system — ZERO KNOWLEDGE.
    
    - public_key: RSA public key (SPKI/PEM format) — safe to store on server
    - challenge_nonce: Temporary random nonce for challenge-response auth
    - nonce_expires_at: Expiry time for the challenge nonce
    
    ❌ NO password_hash — server never knows any password
    ❌ NO private_key — stays on user's device ONLY
    """
    __tablename__ = 'chat_users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(100), nullable=False)
    public_key = db.Column(db.Text, nullable=False)  # Signing public key (RSASSA-PKCS1-v1_5) for auth
    encryption_public_key = db.Column(db.Text, nullable=True)  # RSA-OAEP public key for message encryption
    avatar_color = db.Column(db.String(10), default='#10b981')
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Challenge-response auth fields (temporary, no secrets)
    challenge_nonce = db.Column(db.String(128), nullable=True)
    nonce_expires_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy='dynamic')
    received_messages = db.relationship('Message', foreign_keys='Message.recipient_id', backref='recipient', lazy='dynamic')

    def to_dict(self, include_public_key=False):
        """Convert to JSON-safe dictionary."""
        data = {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'avatar_color': self.avatar_color,
            'is_online': self.is_online,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_public_key:
            data['public_key'] = self.public_key
            data['encryption_public_key'] = self.encryption_public_key or self.public_key
        return data


class Message(db.Model):
    """
    Encrypted message storage — ZERO KNOWLEDGE.
    
    Server stores ONLY encrypted data:
    - encrypted_message: AES-GCM encrypted message content (base64)
    - encrypted_aes_key_recipient: RSA encrypted AES key for RECIPIENT (base64)
    - encrypted_aes_key_sender: RSA encrypted AES key for SENDER (base64) — so sender can also decrypt their own sent messages
    - iv: AES-GCM initialization vector (base64)
    
    Server can NEVER decrypt these without a user's PRIVATE key
    which is stored ONLY on the user's device.
    """
    __tablename__ = 'messages'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = db.Column(db.String(36), db.ForeignKey('chat_users.id'), nullable=False, index=True)
    recipient_id = db.Column(db.String(36), db.ForeignKey('chat_users.id'), nullable=False, index=True)

    # Encrypted payload — server sees only base64 garbage
    encrypted_message = db.Column(db.Text, nullable=False)
    encrypted_aes_key_recipient = db.Column(db.Text, nullable=False)  # RSA-encrypted AES key for recipient
    encrypted_aes_key_sender = db.Column(db.Text, nullable=False)     # RSA-encrypted AES key for sender
    iv = db.Column(db.String(50), nullable=False)

    message_type = db.Column(db.String(10), default='text')  # 'text' | 'image' | 'stego'
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        """Convert to JSON-safe dictionary (still encrypted!)."""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'encrypted_message': self.encrypted_message,
            'encrypted_aes_key_recipient': self.encrypted_aes_key_recipient,
            'encrypted_aes_key_sender': self.encrypted_aes_key_sender,
            'iv': self.iv,
            'message_type': self.message_type,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
