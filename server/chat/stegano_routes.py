"""
Chat Image Routes — Upload/Download chat images (normal + stego)
=================================================================
Zero-Knowledge: Server stores images as opaque files.
Server NEVER knows what's hidden inside.

Storage: Supabase Storage → chat-images bucket → {user_id}/{uuid}.ext

Supports:
  - Normal images (JPG, PNG, WebP, GIF)
  - Stego images (PNG only — lossless for LSB)
"""

import os
import uuid
import logging
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from chat.auth import token_required

logger = logging.getLogger('SteganoWorld.Stego')

stego_bp = Blueprint('stego', __name__, url_prefix='/api/chat/stego')

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB max
BUCKET_NAME = 'stego-images'

ALLOWED_TYPES = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
}


def _get_supabase():
    """Get Supabase client."""
    from supabase import create_client
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    if not url or not key:
        raise RuntimeError('Supabase credentials not configured')
    return create_client(url, key)


@stego_bp.route('/upload', methods=['POST'])
@token_required
def upload_image(current_user_id, current_username):
    """
    Upload an image (normal or stego) to Supabase Storage.
    Stored as: chat-images/{user_id}/{uuid}.ext
    
    Query param: ?type=stego|image (default: image)
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image_file = request.files['image']
    upload_type = request.args.get('type', 'image')

    # Validate file size
    image_file.seek(0, 2)
    file_size = image_file.tell()
    image_file.seek(0)

    if file_size > MAX_IMAGE_SIZE:
        return jsonify({'error': f'Image too large ({file_size // 1024}KB). Max {MAX_IMAGE_SIZE // 1024 // 1024}MB.'}), 400

    # Detect content type
    content_type = image_file.content_type or 'application/octet-stream'

    # For stego, enforce PNG (lossless required for LSB)
    if upload_type == 'stego':
        header = image_file.read(8)
        image_file.seek(0)
        if header[:4] != b'\x89PNG':
            return jsonify({'error': 'Stego images must be PNG (lossless format)'}), 400
        ext = '.png'
        content_type = 'image/png'
    else:
        # Normal image — accept common formats
        ext = ALLOWED_TYPES.get(content_type, '')
        if not ext:
            # Try to detect from filename
            filename = image_file.filename or ''
            file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            ext_map = {'png': '.png', 'jpg': '.jpg', 'jpeg': '.jpg', 'webp': '.webp', 'gif': '.gif'}
            ext = ext_map.get(file_ext, '')
            if not ext:
                return jsonify({'error': f'Unsupported image format. Allowed: PNG, JPG, WebP, GIF'}), 400

    # Generate unique filename
    image_id = str(uuid.uuid4())
    storage_path = f"{current_user_id}/{image_id}{ext}"

    try:
        supabase = _get_supabase()
        image_bytes = image_file.read()

        supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=image_bytes,
            file_options={"content-type": content_type}
        )

        logger.info(f"Image uploaded ({upload_type}): {storage_path[:50]}... ({len(image_bytes):,} bytes)")

        return jsonify({
            'image_id': image_id,
            'storage_path': storage_path,
            'size': file_size,
            'content_type': content_type,
            'type': upload_type,
        }), 201

    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@stego_bp.route('/download/<image_id>', methods=['GET'])
@token_required
def download_image(current_user_id, current_username, image_id):
    """
    Download an image by its ID.
    Searches Supabase Storage first, then local fallback.
    """
    # 1. Try Supabase Storage
    try:
        supabase = _get_supabase()
        folders = supabase.storage.from_(BUCKET_NAME).list()

        for folder in folders:
            folder_name = folder.get('name', '')
            if not folder_name:
                continue
            try:
                files = supabase.storage.from_(BUCKET_NAME).list(folder_name)
                for f in files:
                    fname = f.get('name', '')
                    if fname.startswith(image_id):
                        file_path = f"{folder_name}/{fname}"
                        data = supabase.storage.from_(BUCKET_NAME).download(file_path)
                        if data:
                            mime = 'image/png'
                            if fname.endswith('.jpg') or fname.endswith('.jpeg'):
                                mime = 'image/jpeg'
                            elif fname.endswith('.webp'):
                                mime = 'image/webp'
                            elif fname.endswith('.gif'):
                                mime = 'image/gif'

                            buf = BytesIO(data)
                            buf.seek(0)
                            logger.info(f"Image from Supabase: {file_path[:50]}...")
                            return send_file(buf, mimetype=mime, download_name=fname)
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Supabase download failed, trying local: {e}")

    # 2. Local fallback (for old images stored before Supabase migration)
    local_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'stego')
    for ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
        local_path = os.path.join(local_dir, f"{image_id}{ext}")
        if os.path.exists(local_path):
            mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                    'webp': 'image/webp', 'gif': 'image/gif'}.get(ext[1:], 'image/png')
            logger.info(f"Image from local: {image_id}{ext}")
            return send_file(local_path, mimetype=mime, download_name=f"{image_id}{ext}")

    return jsonify({'error': 'Image not found'}), 404
