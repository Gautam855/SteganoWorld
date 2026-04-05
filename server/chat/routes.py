"""
Chat REST API Routes — Zero-Knowledge E2EE
=============================================
All endpoints for E2E encrypted messaging.
Server handles ONLY encrypted data — never sees plaintext messages.

Auth Flow (NO passwords):
  POST /register     → Create account with public key only
  POST /auth/challenge → Get a random nonce to sign
  POST /auth/verify    → Submit signed nonce to get JWT token
"""

import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from chat.database import db
from chat.models import ChatUser, Message
from chat.auth import (
    generate_challenge, verify_signature,
    generate_token, token_required,
    CHALLENGE_EXPIRY_MINUTES,
)

logger = logging.getLogger('SteganoWorld.Chat')

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')


# ═══════════════════════════════════════════════════════════════════
# AUTH ROUTES — Zero-Knowledge (No Passwords!)
# ═══════════════════════════════════════════════════════════════════

@chat_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new chat user — ZERO KNOWLEDGE.
    
    Body: {
        "username": "gautam",
        "display_name": "Gautam Verma",
        "public_key": "-----BEGIN PUBLIC KEY-----\\n..."
    }
    
    ❌ NO password required
    ✅ Only public key is stored (safe)
    ✅ Private key stays on client device (never sent here)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        username = (data.get('username') or '').strip().lower()
        display_name = (data.get('display_name') or '').strip()
        public_key = (data.get('public_key') or '').strip()
        encryption_public_key = (data.get('encryption_public_key') or '').strip()

        # Validate all fields
        if not username or len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        if len(username) > 30:
            return jsonify({'error': 'Username must be 30 characters or less'}), 400
        if not username.isalnum():
            return jsonify({'error': 'Username must be alphanumeric only'}), 400
        if not display_name:
            return jsonify({'error': 'Display name is required'}), 400
        if not public_key:
            return jsonify({'error': 'RSA public key is required'}), 400

        # Validate that the public key looks legitimate
        if '-----BEGIN PUBLIC KEY-----' not in public_key:
            return jsonify({'error': 'Invalid public key format (must be PEM)'}), 400

        # Check if username already taken
        existing = ChatUser.query.filter_by(username=username).first()
        if existing:
            return jsonify({'error': 'Username already taken'}), 409

        # Create user — NO password hash!
        user = ChatUser(
            username=username,
            display_name=display_name,
            public_key=public_key,
            encryption_public_key=encryption_public_key or None,
        )
        db.session.add(user)
        db.session.commit()

        # Generate JWT token immediately after registration
        token = generate_token(user.id, user.username)

        logger.info(f"New user registered (zero-knowledge): {username}")
        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict(include_public_key=True),
            'token': token,
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration failed: {str(e)}")
        return jsonify({'error': 'Registration failed. Please try again.'}), 500


@chat_bp.route('/auth/challenge', methods=['POST'])
def auth_challenge():
    """
    Step 1 of challenge-response auth.
    
    Body: { "username": "gautam" }
    Returns: { "challenge": "<random_nonce_hex>" }
    
    The client must sign this challenge with their PRIVATE key
    and submit it to /auth/verify.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        username = (data.get('username') or '').strip().lower()
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        # Find user
        user = ChatUser.query.filter_by(username=username).first()
        if not user:
            # Don't reveal whether user exists
            return jsonify({'error': 'Authentication failed'}), 401

        # Generate and store challenge nonce
        nonce = generate_challenge()
        user.challenge_nonce = nonce
        user.nonce_expires_at = datetime.now(timezone.utc) + timedelta(minutes=CHALLENGE_EXPIRY_MINUTES)
        db.session.commit()

        logger.info(f"Auth challenge issued for: {username}")
        return jsonify({
            'challenge': nonce,
            'expires_in_seconds': CHALLENGE_EXPIRY_MINUTES * 60,
        }), 200

    except Exception as e:
        logger.error(f"Auth challenge failed: {str(e)}")
        return jsonify({'error': 'Authentication failed'}), 500


@chat_bp.route('/auth/verify', methods=['POST'])
def auth_verify():
    """
    Step 2 of challenge-response auth.
    
    Body: {
        "username": "gautam",
        "signature": "<base64_signature>"
    }
    
    Server verifies:
    1. Challenge nonce exists and hasn't expired
    2. Signature is valid (signed with private key matching stored public key)
    3. If valid → issue JWT token
    
    This proves the client owns the private key WITHOUT ever sending it.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        username = (data.get('username') or '').strip().lower()
        signature = (data.get('signature') or '').strip()

        if not username or not signature:
            return jsonify({'error': 'Username and signature are required'}), 400

        # Find user
        user = ChatUser.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'Authentication failed'}), 401

        # Check if challenge exists and hasn't expired
        if not user.challenge_nonce or not user.nonce_expires_at:
            return jsonify({'error': 'No active challenge. Request a new one.'}), 400

        # Compare expiry — handle both timezone-aware and naive (PostgreSQL returns naive UTC)
        now = datetime.now(timezone.utc)
        nonce_exp = user.nonce_expires_at
        if nonce_exp.tzinfo is None:
            nonce_exp = nonce_exp.replace(tzinfo=timezone.utc)
        if now > nonce_exp:
            # Clear expired nonce
            user.challenge_nonce = None
            user.nonce_expires_at = None
            db.session.commit()
            return jsonify({'error': 'Challenge expired. Request a new one.'}), 400

        # Verify signature with stored public key
        is_valid = verify_signature(
            public_key_pem=user.public_key,
            challenge=user.challenge_nonce,
            signature_b64=signature,
        )

        # Clear the nonce regardless (one-time use)
        used_nonce = user.challenge_nonce
        user.challenge_nonce = None
        user.nonce_expires_at = None

        if not is_valid:
            db.session.commit()
            logger.warning(f"Auth verification failed for: {username}")
            return jsonify({'error': 'Authentication failed. Invalid signature.'}), 401

        # Success! Generate JWT token
        token = generate_token(user.id, user.username)
        db.session.commit()

        logger.info(f"User authenticated (zero-knowledge): {username}")
        return jsonify({
            'message': 'Authentication successful',
            'user': user.to_dict(include_public_key=True),
            'token': token,
        }), 200

    except Exception as e:
        logger.error(f"Auth verification failed: {str(e)}")
        return jsonify({'error': 'Authentication failed'}), 500


# ═══════════════════════════════════════════════════════════════════
# USER ROUTES (Protected)
# ═══════════════════════════════════════════════════════════════════

@chat_bp.route('/users', methods=['GET'])
@token_required
def get_users(current_user_id, current_username):
    """
    Get all registered users (except myself).
    Returns public keys so client can encrypt messages for them.
    """
    users = ChatUser.query.filter(ChatUser.id != current_user_id).all()
    return jsonify({
        'users': [u.to_dict(include_public_key=True) for u in users]
    }), 200


@chat_bp.route('/users/<user_id>', methods=['GET'])
@token_required
def get_user(current_user_id, current_username, user_id):
    """Get a specific user's profile + public key."""
    user = ChatUser.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict(include_public_key=True)}), 200


@chat_bp.route('/users/search', methods=['GET'])
@token_required
def search_users(current_user_id, current_username):
    """Search users by username or display name."""
    query = request.args.get('q', '').strip().lower()
    if not query or len(query) < 2:
        return jsonify({'users': []}), 200

    users = ChatUser.query.filter(
        ChatUser.id != current_user_id,
        db.or_(
            ChatUser.username.ilike(f'%{query}%'),
            ChatUser.display_name.ilike(f'%{query}%')
        )
    ).limit(20).all()

    return jsonify({
        'users': [u.to_dict(include_public_key=True) for u in users]
    }), 200


@chat_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user_id, current_username):
    """Get current logged-in user's profile."""
    user = ChatUser.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict(include_public_key=True)}), 200


# ═══════════════════════════════════════════════════════════════════
# MESSAGE ROUTES (Protected)
# ═══════════════════════════════════════════════════════════════════

@chat_bp.route('/messages/send', methods=['POST'])
@token_required
def send_message(current_user_id, current_username):
    """
    Send an encrypted message.
    
    Body: {
        "recipient_id": "uuid",
        "encrypted_message": "base64...",            ← AES-GCM encrypted (server can't read)
        "encrypted_aes_key_recipient": "base64...",  ← RSA encrypted for recipient
        "encrypted_aes_key_sender": "base64...",     ← RSA encrypted for sender (so they can read own msgs)
        "iv": "base64...",                           ← AES-GCM IV
        "message_type": "text"                       ← optional, default "text"
    }
    
    Server stores this as-is — it's ALL encrypted garbage to us.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        recipient_id = (data.get('recipient_id') or '').strip()
        encrypted_message = (data.get('encrypted_message') or '').strip()
        encrypted_aes_key_recipient = (data.get('encrypted_aes_key_recipient') or '').strip()
        encrypted_aes_key_sender = (data.get('encrypted_aes_key_sender') or '').strip()
        iv = (data.get('iv') or '').strip()
        message_type = data.get('message_type', 'text')

        # Validate
        if not recipient_id:
            return jsonify({'error': 'Recipient ID is required'}), 400
        if not encrypted_message or not encrypted_aes_key_recipient or not encrypted_aes_key_sender or not iv:
            return jsonify({'error': 'Encrypted message, AES keys (recipient + sender), and IV are required'}), 400

        # Verify recipient exists
        recipient = ChatUser.query.get(recipient_id)
        if not recipient:
            return jsonify({'error': 'Recipient not found'}), 404

        # Can't message yourself
        if recipient_id == current_user_id:
            return jsonify({'error': 'Cannot send a message to yourself'}), 400

        # Store encrypted message (server never decrypts it!)
        message = Message(
            sender_id=current_user_id,
            recipient_id=recipient_id,
            encrypted_message=encrypted_message,
            encrypted_aes_key_recipient=encrypted_aes_key_recipient,
            encrypted_aes_key_sender=encrypted_aes_key_sender,
            iv=iv,
            message_type=message_type,
        )
        db.session.add(message)
        db.session.commit()

        # 🚀 Real-time: Emit to recipient via WebSocket
        try:
            from chat.socket_events import socketio
            message_dict = message.to_dict()
            # Send to recipient's personal room
            socketio.emit('new_message', message_dict, room=recipient_id)
            logger.info(f"Real-time: Message pushed to recipient room: {recipient_id[:8]}...")
        except Exception as e:
            logger.error(f"WebSocket emit failed: {str(e)}")

        logger.info(f"Message sent: {current_user_id[:8]}... → {recipient_id[:8]}... (encrypted)")
        return jsonify({
            'message': 'Message sent',
            'data': message.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Send message failed: {str(e)}")
        return jsonify({'error': 'Failed to send message'}), 500


@chat_bp.route('/messages/<other_user_id>', methods=['GET'])
@token_required
def get_conversation(current_user_id, current_username, other_user_id):
    """
    Get conversation with a specific user.
    Returns encrypted messages — client decrypts on device.
    
    Query params:
        ?limit=50 — max messages to return
    """
    limit = min(int(request.args.get('limit', 50)), 100)

    messages = Message.query.filter(
        db.or_(
            db.and_(Message.sender_id == current_user_id, Message.recipient_id == other_user_id),
            db.and_(Message.sender_id == other_user_id, Message.recipient_id == current_user_id),
        )
    ).order_by(Message.created_at.desc()).limit(limit).all()

    # Reverse to get chronological order
    messages.reverse()

    return jsonify({
        'messages': [m.to_dict() for m in messages]
    }), 200


@chat_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user_id, current_username):
    """
    Get list of conversations (unique users this user has chatted with).
    Returns the last message from each conversation.
    """
    # Get all unique user IDs from conversations
    sent_to = db.session.query(Message.recipient_id).filter(
        Message.sender_id == current_user_id
    ).distinct().all()

    received_from = db.session.query(Message.sender_id).filter(
        Message.recipient_id == current_user_id
    ).distinct().all()

    # Combine unique user IDs
    user_ids = set()
    for (uid,) in sent_to:
        user_ids.add(uid)
    for (uid,) in received_from:
        user_ids.add(uid)

    conversations = []
    for uid in user_ids:
        user = ChatUser.query.get(uid)
        if not user:
            continue

        # Get last message in this conversation
        last_msg = Message.query.filter(
            db.or_(
                db.and_(Message.sender_id == current_user_id, Message.recipient_id == uid),
                db.and_(Message.sender_id == uid, Message.recipient_id == current_user_id),
            )
        ).order_by(Message.created_at.desc()).first()

        # Count unread messages from this user
        unread_count = Message.query.filter(
            Message.sender_id == uid,
            Message.recipient_id == current_user_id,
            Message.is_read == False
        ).count()

        conversations.append({
            'user': user.to_dict(include_public_key=True),
            'last_message': last_msg.to_dict() if last_msg else None,
            'unread_count': unread_count,
        })

    # Sort by last message time (newest first)
    conversations.sort(
        key=lambda c: c['last_message']['created_at'] if c['last_message'] else '',
        reverse=True
    )

    return jsonify({'conversations': conversations}), 200


@chat_bp.route('/messages/read/<other_user_id>', methods=['PUT'])
@token_required
def mark_as_read(current_user_id, current_username, other_user_id):
    """Mark all messages from a specific user as read + emit read receipt."""
    # Get unread message IDs before marking them
    unread_msgs = Message.query.filter(
        Message.sender_id == other_user_id,
        Message.recipient_id == current_user_id,
        Message.is_read == False
    ).all()

    read_ids = [m.id for m in unread_msgs]

    if read_ids:
        Message.query.filter(Message.id.in_(read_ids)).update(
            {'is_read': True}, synchronize_session='fetch'
        )
        db.session.commit()

        # 🚀 Emit read receipt to the sender via WebSocket
        try:
            from chat.socket_events import socketio
            socketio.emit('messages_read', {
                'message_ids': read_ids,
                'reader_id': current_user_id,
            }, room=other_user_id)
            logger.info(f"Read receipt: {len(read_ids)} messages by {current_user_id[:8]}... → {other_user_id[:8]}...")
        except Exception as e:
            logger.error(f"Read receipt emit failed: {str(e)}")

    return jsonify({'message': 'Messages marked as read', 'count': len(read_ids)}), 200
