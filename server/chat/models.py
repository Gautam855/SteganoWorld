import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship
from chat.database import Base

class ChatUser(Base):
    """
    User profile for the E2E chat system — ZERO KNOWLEDGE.
    """
    __tablename__ = 'chat_users'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    public_key = Column(Text, nullable=False)  # Signing public key (RSASSA-PKCS1-v1_5) for auth
    encryption_public_key = Column(Text, nullable=True)  # RSA-OAEP public key for message encryption
    avatar_color = Column(String(10), default='#10b981')
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Challenge-response auth fields (temporary, no secrets)
    challenge_nonce = Column(String(128), nullable=True)
    nonce_expires_at = Column(DateTime, nullable=True)

    # Relationships
    # Note: in raw SQLAlchemy, relationships are defined differently
    sent_messages = relationship('Message', primaryjoin="ChatUser.id==Message.sender_id", back_populates='sender')
    received_messages = relationship('Message', primaryjoin="ChatUser.id==Message.recipient_id", back_populates='recipient')

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


class Message(Base):
    """
    Encrypted message storage — ZERO KNOWLEDGE.
    """
    __tablename__ = 'messages'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String(36), ForeignKey('chat_users.id'), nullable=False, index=True)
    recipient_id = Column(String(36), ForeignKey('chat_users.id'), nullable=False, index=True)

    # Encrypted payload — server sees only base64 garbage
    encrypted_message = Column(Text, nullable=False)
    encrypted_aes_key_recipient = Column(Text, nullable=False)  # RSA-encrypted AES key for recipient
    encrypted_aes_key_sender = Column(Text, nullable=False)     # RSA-encrypted AES key for sender
    iv = Column(String(50), nullable=False)

    message_type = Column(String(10), default='text')  # 'text' | 'image' | 'stego'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    sender = relationship('ChatUser', primaryjoin="ChatUser.id==Message.sender_id", back_populates='sent_messages')
    recipient = relationship('ChatUser', primaryjoin="ChatUser.id==Message.recipient_id", back_populates='received_messages')

    def to_dict(self):
        """Convert to JSON-safe dictionary."""
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


class SharedLink(Base):
    """
    Secure Shared Link for Stego Images.
    Owner can grant access to specific users.
    """
    __tablename__ = 'shared_links'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey('chat_users.id'), nullable=False, index=True)
    image_id = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Burn-after-reading / Ephemerality parameters
    burn_after_views = Column(Integer, default=0) # 0 means disabled
    views_count = Column(Integer, default=0)
    
    # Relationships
    access_list = relationship('SharedLinkAccess', back_populates='link', cascade='all, delete-orphan')


class SharedLinkAccess(Base):
    """
    Zero-Knowledge Access Record for a Shared Link.
    """
    __tablename__ = 'shared_link_access'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    link_id = Column(String(36), ForeignKey('shared_links.id'), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('chat_users.id'), nullable=False, index=True)
    
    # The AES key used to encrypt the image data, encrypted with THIS user's RSA public key
    encrypted_aes_key = Column(Text, nullable=False)

    link = relationship('SharedLink', back_populates='access_list')
