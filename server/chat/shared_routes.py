import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from chat.database import db_session
from chat.models import ChatUser, SharedLink, SharedLinkAccess
from chat.auth import get_current_user
import logging

logger = logging.getLogger('SteganoWorld.Shared')

router = APIRouter(prefix="/api/chat/shared", tags=["shared"])

class ShareRequest(BaseModel):
    image_id: str
    access_list: list[dict] # { user_id, encrypted_aes_key }
    burn_after_views: int = 0

@router.post("/create")
async def create_shared_link(data: ShareRequest, auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    db = db_session()
    try:
        new_link = SharedLink(
            owner_id=user_id,
            image_id=data.image_id,
            burn_after_views=data.burn_after_views
        )
        db.add(new_link)
        db.flush() # Get the new_link.id

        # Add access for each user
        for user_data in data.access_list:
            access = SharedLinkAccess(
                link_id=new_link.id,
                user_id=user_data['user_id'],
                encrypted_aes_key=user_data['encrypted_aes_key']
            )
            db.add(access)
        
        db.commit()
        return {"link_id": new_link.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create shared link: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create shared link")
    finally:
        db_session.remove()

@router.get("/{link_id}")
async def get_shared_access(link_id: str, auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    db = db_session()
    try:
        link = db.query(SharedLink).filter(SharedLink.id == link_id).first()
        if not link:
            raise HTTPException(status_code=404, detail="Shared link not found")
        
        # Check if user has access
        access = db.query(SharedLinkAccess).filter(
            SharedLinkAccess.link_id == link_id,
            SharedLinkAccess.user_id == user_id
        ).first()
        
        if not access:
            raise HTTPException(status_code=403, detail="You do not have access to this shared link")

        # Check burn-after-views
        if link.burn_after_views > 0 and link.views_count >= link.burn_after_views:
            db.delete(link)
            db.commit()
            raise HTTPException(status_code=410, detail="This shared link has expired (burned after reading)")

        # Increment view count
        link.views_count += 1
        db.commit()

        return {
            "image_id": link.image_id,
            "encrypted_aes_key": access.encrypted_aes_key,
            "owner_id": link.owner_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to access shared link: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to access shared link")
    finally:
        db_session.remove()
