import os
import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from supabase import create_client, Client
from chat.auth import get_current_user
import base64
from io import BytesIO
from PIL import Image

logger = logging.getLogger('SteganoWorld.Stegano')
router = APIRouter(prefix="/api/chat/stego", tags=["stego"])

def _get_supabase() -> Client:
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")
    return create_client(url, key)

@router.post("/upload")
async def upload_stego_image(
    image: UploadFile = File(...),
    type: str = "image",
    auth: tuple = Depends(get_current_user)
):
    user_id, _ = auth
    supabase = _get_supabase()
    
    try:
        file_ext = image.filename.split('.')[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        bucket_name = "chat-images"
        
        # Read file contents
        content = await image.read()
        
        # Upload to Supabase Storage. Throws exception on failure.
        res = supabase.storage.from_(bucket_name).upload(file_name, content)
        
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        
        return {"image_id": file_name, "url": public_url}
    
    except Exception as e:
        logger.error(f"Supabase upload failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get/{image_id}")
async def get_stego_image(image_id: str, auth: tuple = Depends(get_current_user)):
    user_id, _ = auth
    supabase = _get_supabase()
    
    try:
        bucket_name = "chat-images"
        # Since images are encrypted, we just provide the URL or the raw data
        public_url = supabase.storage.from_(bucket_name).get_public_url(image_id)
        return {"url": public_url}
    except Exception as e:
        logger.error(f"Supabase fetch failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch image")
