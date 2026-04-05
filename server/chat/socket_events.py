"""
WebSocket Events — Real-time Messaging
========================================
Uses Flask-SocketIO for real-time message delivery.
Events:
  - connect/disconnect: User online/offline status
  - new_message: Real-time message push to recipient
  - typing: Typing indicators
  - message_read: Read receipts
"""

import logging
from datetime import datetime, timezone
from flask_socketio import SocketIO, emit, join_room, leave_room
from chat.auth import verify_token
from chat.models import ChatUser
from chat.database import db

logger = logging.getLogger('SteganoWorld.Socket')

socketio = SocketIO(cors_allowed_origins="*")

# Track connected users: { user_id: sid }
connected_users = {}


def init_socketio(app):
    """Initialize SocketIO with the Flask app."""
    socketio.init_app(app, async_mode='threading')
    return socketio


# ─── Connection Events ───────────────────────────────────────────

@socketio.on('connect')
def handle_connect():
    """
    Client connects with JWT token for authentication.
    Client sends: { "token": "jwt_token_here" } as auth data.
    """
    token = request.args.get('token') or ''
    if not token:
        logger.warning("Socket connection rejected: no token")
        return False  # Reject connection

    payload = verify_token(token)
    if not payload:
        logger.warning("Socket connection rejected: invalid token")
        return False  # Reject connection

    user_id = payload['user_id']
    username = payload['username']

    # Track this connection
    connected_users[user_id] = request.sid

    # Join personal room (for targeted messages)
    join_room(user_id)

    # Update online status in DB
    try:
        user = ChatUser.query.get(user_id)
        if user:
            user.is_online = True
            user.last_seen = datetime.now(timezone.utc)
            db.session.commit()
    except Exception:
        pass

    # Broadcast to all: this user is online
    emit('user_online', {'user_id': user_id, 'username': username}, broadcast=True)
    logger.info(f"Socket connected: {username} ({user_id[:8]}...)")


@socketio.on('disconnect')
def handle_disconnect():
    """Handle user disconnection."""
    # Find which user disconnected
    disconnected_user_id = None
    for uid, sid in connected_users.items():
        if sid == request.sid:
            disconnected_user_id = uid
            break

    if disconnected_user_id:
        del connected_users[disconnected_user_id]
        leave_room(disconnected_user_id)

        # Update offline status
        try:
            user = ChatUser.query.get(disconnected_user_id)
            if user:
                user.is_online = False
                user.last_seen = datetime.now(timezone.utc)
                db.session.commit()
                emit('user_offline', {
                    'user_id': disconnected_user_id,
                    'username': user.username
                }, broadcast=True)
                logger.info(f"Socket disconnected: {user.username}")
        except Exception:
            pass


# ─── Messaging Events ────────────────────────────────────────────

@socketio.on('send_message')
def handle_send_message(data):
    """
    Real-time message delivery.
    
    Client emits: {
        "recipient_id": "uuid",
        "message": { ...encrypted message object from REST API response... }
    }
    
    Server relays to recipient's room — still encrypted!
    """
    recipient_id = data.get('recipient_id')
    message_data = data.get('message')

    if not recipient_id or not message_data:
        return

    # Send to recipient's room (if they're online)
    if recipient_id in connected_users:
        emit('new_message', message_data, room=recipient_id)
        logger.info(f"Real-time message delivered to {recipient_id[:8]}...")


@socketio.on('message_delivered')
def handle_message_delivered(data):
    """
    Delivery confirmation — recipient confirms they received the message.
    Relay back to sender so they can show double tick (✓✓).
    """
    message_id = data.get('message_id')
    sender_id = data.get('sender_id')

    if message_id and sender_id and sender_id in connected_users:
        emit('message_delivered', {'message_id': message_id}, room=sender_id)
        logger.info(f"Delivery receipt: {message_id[:8]}... → sender {sender_id[:8]}...")


@socketio.on('typing')
def handle_typing(data):
    """Forward typing indicator to recipient."""
    recipient_id = data.get('recipient_id')
    sender_id = data.get('sender_id')

    if recipient_id and recipient_id in connected_users:
        emit('typing', {'sender_id': sender_id}, room=recipient_id)


@socketio.on('stop_typing')
def handle_stop_typing(data):
    """Forward stop-typing indicator to recipient."""
    recipient_id = data.get('recipient_id')
    sender_id = data.get('sender_id')

    if recipient_id and recipient_id in connected_users:
        emit('stop_typing', {'sender_id': sender_id}, room=recipient_id)


@socketio.on('message_read')
def handle_message_read(data):
    """Notify sender that their message was read."""
    sender_id = data.get('sender_id')
    reader_id = data.get('reader_id')

    if sender_id and sender_id in connected_users:
        emit('message_read', {'reader_id': reader_id}, room=sender_id)


# Need request context for socket events
from flask import request
