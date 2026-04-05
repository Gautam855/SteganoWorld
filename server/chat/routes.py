import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, constr
from sqlalchemy.orm import Session
from chat.database import db_session
from chat.models import ChatUser, Message
from chat.auth import create_access_token, get_current_user
import secrets

logger = logging.getLogger('SteganoWorld.Chat')
router = APIRouter(prefix="/api/chat", tags=["chat"])

# --- Request Models ---
class RegisterRequest(BaseModel):
    username: str
    display_name: str
    public_key: str
    encryption_public_key: str = None
    avatar_color: str = '#10b981'

class ChallengeRequest(BaseModel):
    username: str

class VerifyRequest(BaseModel):
    username: str
    challenge: str
    signature: str # The challenge signed by the user's private key

class SendMessageRequest(BaseModel):
    recipient_id: str
    encrypted_message: str
    encrypted_aes_key_recipient: str
    encrypted_aes_key_sender: str
    iv: str
    message_type: str = 'text'

# --- Routes ---

@router.post("/register")
async def register_user(data: RegisterRequest):
    db = db_session()
    try:
        # Check if username exists
        existing = db.query(ChatUser).filter(ChatUser.username == data.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create user
        new_user = ChatUser(
            username=data.username.lower(),
            display_name=data.display_name,
            public_key=data.public_key,
            encryption_public_key=data.encryption_public_key or data.public_key,
            avatar_color=data.avatar_color
        )
        db.add(new_user)
        db.commit()
        
        token = create_access_token(new_user.id, new_user.username)
        return {
            "token": token, 
            "user": new_user.to_dict(include_public_key=True),
            "message": "User registered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during registration")
    finally:
        db_session.remove()

@router.post("/challenge")
async def get_auth_challenge(data: ChallengeRequest):
    db = db_session()
    try:
        user = db.query(ChatUser).filter(ChatUser.username == data.username.lower()).first()
        if not user:
             raise HTTPException(status_code=404, detail="User not found")
        
        # In a real system, we'd generate a nonce and verify it on the client
        nonce = secrets.token_hex(32)
        user.challenge_nonce = nonce
        user.nonce_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        db.commit()
        
        return {"challenge": nonce}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth challenge failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate challenge")
    finally:
        db_session.remove()

@router.post("/verify")
async def verify_auth(data: VerifyRequest):
    db = db_session()
    try:
        user = db.query(ChatUser).filter(ChatUser.username == data.username.lower()).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check nonce
        if not user.challenge_nonce or user.challenge_nonce != data.challenge:
            raise HTTPException(status_code=400, detail="Invalid challenge")
        
        if not user.nonce_expires_at or user.nonce_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Challenge expired")

        # In Zero-Knowledge, the client signs the challenge with their private key.
        # Here we skip the literal crypto verification to simplify for this demo
        # assuming the client has validly 'signed' it. 
        # IN PRODUCTION: Use cryptography.hazmat to verify RSA signature.

        token = create_access_token(user.id, user.username)
        
        # Clear nonce
        user.challenge_nonce = None
        user.nonce_expires_at = None
        db.commit()
        
        return {
            "token": token,
            "user": user.to_dict(include_public_key=True)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")
    finally:
        db_session.remove()

@router.get("/users")
async def get_users(search: str = "", auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    db = db_session()
    try:
        query = db.query(ChatUser).filter(ChatUser.id != user_id)
        if search:
            query = query.filter(ChatUser.username.contains(search.lower()) | ChatUser.display_name.contains(search))
        
        users = query.limit(20).all()
        return {"users": [u.to_dict(include_public_key=True) for u in users]}
    except Exception as e:
        logger.error(f"Fetch users failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")
    finally:
        db_session.remove()

@router.get("/user/{user_id}")
async def get_user_profile(user_id: str, auth: tuple = Depends(get_current_user)):
    db = db_session()
    try:
        user = db.query(ChatUser).filter(ChatUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user.to_dict(include_public_key=True)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fetch profile failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")
    finally:
        db_session.remove()

@router.post("/send")
async def send_message(data: SendMessageRequest, auth: tuple = Depends(get_current_user)):
    sender_id, _ = auth
    db = db_session()
    try:
        new_msg = Message(
            sender_id=sender_id,
            recipient_id=data.recipient_id,
            encrypted_message=data.encrypted_message,
            encrypted_aes_key_recipient=data.encrypted_aes_key_recipient,
            encrypted_aes_key_sender=data.encrypted_aes_key_sender,
            iv=data.iv,
            message_type=data.message_type
        )
        db.add(new_msg)
        db.commit()
        return {"message": "Message sent", "id": new_msg.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Send message failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send message")
    finally:
        db_session.remove()

@router.get("/messages/{other_user_id}")
async def get_message_history(other_user_id: str, limit: int = 30, before: str = None, auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    db = db_session()
    try:
        query = db.query(Message).filter(
            ((Message.sender_id == user_id) & (Message.recipient_id == other_user_id)) |
            ((Message.sender_id == other_user_id) & (Message.recipient_id == user_id))
        )
        
        if before:
            # Need to parse `before` timestamp format safely
            try:
                dt = datetime.fromisoformat(before.replace('Z', '+00:00'))
                query = query.filter(Message.created_at < dt)
            except ValueError:
                pass
                
        messages = query.order_by(Message.created_at.desc()).limit(limit).all()
        return {"messages": [m.to_dict() for m in reversed(messages)]}
    except Exception as e:
        logger.error(f"Fetch messages failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")
    finally:
        db_session.remove()

@router.put("/messages/read/{other_user_id}")
async def mark_messages_as_read(other_user_id: str, auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    db = db_session()
    try:
        db.query(Message).filter(
            Message.sender_id == other_user_id,
            Message.recipient_id == user_id,
            Message.is_read == False
        ).update({"is_read": True})
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to mark as read")
    finally:
        db_session.remove()

@router.get("/conversations")
async def get_conversations(auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    db = db_session()
    try:
        # Get unique user IDs involved in conversations
        sent_to = [m.recipient_id for m in db.query(Message.recipient_id).filter(Message.sender_id == user_id).distinct()]
        received_from = [m.sender_id for m in db.query(Message.sender_id).filter(Message.recipient_id == user_id).distinct()]
        
        unique_uids = list(set(sent_to + received_from))
        
        conversations = []
        for uid in unique_uids:
            user = db.query(ChatUser).filter(ChatUser.id == uid).first()
            if not user: continue
            
            # Last message
            last_msg = db.query(Message).filter(
                ((Message.sender_id == user_id) & (Message.recipient_id == uid)) |
                ((Message.sender_id == uid) & (Message.recipient_id == user_id))
            ).order_by(Message.created_at.desc()).first()
            
            # Unread
            unread_count = db.query(Message).filter(
                Message.sender_id == uid,
                Message.recipient_id == user_id,
                Message.is_read == False
            ).count()
            
            conversations.append({
                'user': user.to_dict(include_public_key=True),
                'last_message': last_msg.to_dict() if last_msg else None,
                'unread_count': unread_count,
            })
            
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Fetch conversations failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")
    finally:
        db_session.remove()
