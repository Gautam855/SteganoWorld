import os
import logging
import base64
import zlib
from io import BytesIO
from PIL import Image
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from stegano import lsb
from vigenre import encrypt_binary, decrypt_binary, DATA_TYPE_TEXT, DATA_TYPE_IMAGE

logger = logging.getLogger('SteganoWorld.Ops')
router = APIRouter(prefix="/api", tags=["ops"])

# --- Constants ---
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'}
MAX_PIXEL_COUNT = 25_000_000

def validate_image_fastapi(image: UploadFile):
    """
    Validates uploaded file is a real image.
    """
    filename = image.filename or ''
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type '.{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    try:
        content = image.file.read()
        image.file.seek(0)
        img = Image.open(BytesIO(content))
        # verify() consumes the stream, but we already have content or can seek
        # img.verify() 
        
        total_pixels = img.width * img.height
        if total_pixels > MAX_PIXEL_COUNT:
            raise HTTPException(status_code=400, detail=f"Image too large. Max {MAX_PIXEL_COUNT:,} pixels.")
        
        return img, content
    except Exception as e:
        logger.error(f"Image validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail="File is not a valid image or is corrupted")

@router.post("/encrypt_text")
async def encrypt_text_api(
    image: UploadFile = File(...),
    text: str = Form(...),
    password: str = Form(...)
):
    try:
        carrier_img, _ = validate_image_fastapi(image)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Secret message text is required")
        if not password.strip():
            raise HTTPException(status_code=400, detail="Encryption password is required")

        if carrier_img.mode != 'RGB':
            carrier_img = carrier_img.convert('RGB')

        # Encrypt and hide
        encrypted_payload = encrypt_binary(text, password, data_type=DATA_TYPE_TEXT)
        secret_img = lsb.hide(carrier_img, encrypted_payload, auto_convert_to_str=False)

        buf = BytesIO()
        secret_img.save(buf, format="PNG")
        buf.seek(0)

        logger.info("Text encryption successful via FastAPI")
        return StreamingResponse(buf, media_type="image/png", headers={"Content-Disposition": "attachment; filename=stego_enc.png"})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text encryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Text encryption failed. Please check your inputs.")

@router.post("/decrypt_text")
async def decrypt_text_api(
    image: UploadFile = File(...),
    password: str = Form(...)
):
    try:
        carrier_img, _ = validate_image_fastapi(image)
        
        if not password.strip():
            raise HTTPException(status_code=400, detail="Decryption password is required")

        revealed_data = lsb.reveal(carrier_img)
        if not revealed_data:
            raise HTTPException(status_code=404, detail="No hidden data found in this image")

        result = decrypt_binary(revealed_data, password)
        if isinstance(result, str) and result.startswith("ERROR:"):
            raise HTTPException(status_code=400, detail="Invalid password or data corrupted")

        data_type, raw_data = result
        if data_type == DATA_TYPE_TEXT:
            return {"text": raw_data.decode('utf-8')}
        else:
            raise HTTPException(status_code=400, detail="This image does not contain hidden text")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text decryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Text decryption failed.")

@router.post("/encrypt_images")
async def encrypt_images_api(
    image1: UploadFile = File(...), # Carrier
    image2: UploadFile = File(...), # Secret
    password: str = Form(...)
):
    try:
        carrier_img, _ = validate_image_fastapi(image1)
        _, secret_content = validate_image_fastapi(image2)
        
        if not password.strip():
            raise HTTPException(status_code=400, detail="Encryption password is required")

        # Base64 encode the secret image
        secret_b64 = base64.b64encode(secret_content).decode('utf-8')

        # Encrypt
        encrypted_payload = encrypt_binary(secret_b64, password, data_type=DATA_TYPE_IMAGE)

        if carrier_img.mode != 'RGB':
            carrier_img = carrier_img.convert('RGB')

        result_img = lsb.hide(carrier_img, encrypted_payload, auto_convert_to_str=False)

        buf = BytesIO()
        result_img.save(buf, format="PNG")
        buf.seek(0)

        logger.info("Image encryption successful via FastAPI")
        return StreamingResponse(buf, media_type="image/png", headers={"Content-Disposition": "attachment; filename=stego_merged.png"})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image encryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Image encryption failed.")

@router.post("/decrypt_image")
async def decrypt_image_api(
    image: UploadFile = File(...),
    password: str = Form(...)
):
    try:
        carrier_img, _ = validate_image_fastapi(image)
        
        if not password.strip():
            raise HTTPException(status_code=400, detail="Decryption password is required")

        encrypted_payload = lsb.reveal(carrier_img)
        if not encrypted_payload:
            raise HTTPException(status_code=404, detail="No hidden data found in this image")

        result = decrypt_binary(encrypted_payload, password)
        if isinstance(result, str) and result.startswith("ERROR:"):
            raise HTTPException(status_code=400, detail="Incorrect password or data corrupted")

        data_type, raw_data = result
        if data_type == DATA_TYPE_IMAGE:
            b64_data = raw_data.decode('utf-8')
            img_bytes = base64.b64decode(b64_data)
            return StreamingResponse(BytesIO(img_bytes), media_type="image/png", headers={"Content-Disposition": "attachment; filename=revealed.png"})
        else:
            raise HTTPException(status_code=400, detail="This image does not contain a hidden image")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image decryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Image decryption failed.")
