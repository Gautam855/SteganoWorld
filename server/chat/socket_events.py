import logging
from datetime import datetime, timezone
import socketio
from chat.auth import verify_token
from chat.models import ChatUser
from chat.database import db_session

logger = logging.getLogger('SteganoWorld.Socket')

# Create a Socket.IO server
# async_mode='asgi' is important for FastAPI integration
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")

# Track connected users: { user_id: sid }
connected_users = {}

@sio.event
async def connect(sid, environ, auth=None):
    """
    Client connects with JWT token for authentication.
    """
    # Extract token from query params
    # Depending on how client sends it, may need adjustment
    query_string = environ.get('QUERY_STRING', '')
    token = ""
    for param in query_string.split('&'):
        if param.startswith('token='):
            token = param.split('=')[1]
            break
            
    if not token:
        logger.warning(f"Socket connection rejected for {sid}: no token")
        return False  # Reject connection

    payload = verify_token(token)
    if not payload:
        logger.warning(f"Socket connection rejected for {sid}: invalid token")
        return False  # Reject connection

    user_id = payload['user_id']
    username = payload['username']

    # Track this connection
    connected_users[user_id] = sid

    # Join personal room (for targeted messages)
    await sio.enter_room(sid, user_id)

    # Update online status in DB
    db = db_session()
    try:
        user = db.query(ChatUser).get(user_id)
        if user:
            user.is_online = True
            user.last_seen = datetime.now(timezone.utc)
            db.commit()
    except Exception as e:
        logger.error(f"Socket offline status update failed: {str(e)}")
        db.rollback()
    finally:
        db_session.remove()

    # Broadcast to all: this user is online
    await sio.emit('user_online', {'user_id': user_id, 'username': username})
    logger.info(f"Socket connected: {username} ({user_id[:8]}...)")

@sio.event
async def disconnect(sid):
    """Handle user disconnection."""
    disconnected_user_id = None
    for uid, conn_sid in list(connected_users.items()):
        if conn_sid == sid:
            disconnected_user_id = uid
            break

    if disconnected_user_id:
        if disconnected_user_id in connected_users:
            del connected_users[disconnected_user_id]
        
        db = db_session()
        try:
            user = db.query(ChatUser).get(disconnected_user_id)
            if user:
                user.is_online = False
                user.last_seen = datetime.now(timezone.utc)
                db.commit()
                await sio.emit('user_offline', {
                    'user_id': disconnected_user_id,
                    'username': user.username
                })
                logger.info(f"Socket disconnected: {user.username}")
        except Exception as e:
            logger.error(f"Socket offline status update failed: {str(e)}")
            db.rollback()
        finally:
            db_session.remove()

@sio.event
async def new_message_client(sid, data):
    """Client sends a new message successfully."""
    # Data is the message dict
    recipient_id = data.get('recipient_id')
    if recipient_id:
        await sio.emit('new_message', data, room=recipient_id)

@sio.event
async def typing_client(sid, data):
    """Client is typing."""
    # data: { recipient_id, is_typing: bool }
    recipient_id = data.get('recipient_id')
    sender_id = data.get('sender_id')
    if recipient_id:
        await sio.emit('typing', {
            'sender_id': sender_id,
            'is_typing': data.get('is_typing', False)
        }, room=recipient_id)

async def emit_new_message(message_data):
    """Helper to emit new message to recipient."""
    recipient_id = message_data.get('recipient_id')
    if recipient_id:
        await sio.emit('new_message', message_data, room=recipient_id)
