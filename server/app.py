import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from stegano import lsb
import base64
from io import BytesIO
from PIL import Image
from vigenre import encrypt_binary, decrypt_binary, DATA_TYPE_TEXT, DATA_TYPE_IMAGE

# ─── Logging Setup ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('SteganoWorld')

# ─── App Init ─────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
if not app.config['SECRET_KEY']:
    raise RuntimeError("SECRET_KEY environment variable is not set!")

# ─── Chat Module Init ─────────────────────────────────────────────
from chat.database import init_db
from chat.routes import chat_bp
from chat.stegano_routes import stego_bp
from chat.shared_routes import shared_bp
from chat.socket_events import init_socketio, socketio

init_db(app)                    # Initialize SQLite database + create tables
app.register_blueprint(chat_bp)  # Register /api/chat/* routes
app.register_blueprint(stego_bp) # Register /api/chat/stego/* routes
app.register_blueprint(shared_bp) # Register /api/shared/* routes
init_socketio(app)               # Initialize WebSocket support

# CORS — Only allow specific origins (not the entire internet)
# Can be a comma-separated list in ALLOWED_ORIGINS env var
env_origins = os.environ.get('ALLOWED_ORIGINS', '')
ALLOWED_ORIGINS = [origin.strip() for origin in env_origins.split(',') if origin.strip()] or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://steganoworld.vercel.app",
    "https://stegano-world.vercel.app"
]
CORS(app, origins=ALLOWED_ORIGINS)

# FIX 2: File upload limit — 20 MB max (prevents DoS via giant uploads)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB

# FIX 4: Rate Limiting — prevents brute-force attacks (higher limit for image-heavy chat)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["120 per minute"],
    storage_uri="memory://",
)

# ─── Constants ────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'}
MAX_PIXEL_COUNT = 25_000_000  # 25 megapixels max (prevents pixel bomb)


# ─── FIX 5: Image Validation Helper ──────────────────────────────
def validate_image(file_storage):
    """
    Validates uploaded file is a real image.
    Returns (PIL.Image, None) on success or (None, error_string) on failure.
    """
    # 1. Check filename extension
    filename = file_storage.filename or ''
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return None, f"Invalid file type '.{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    # 2. Try to open and verify as actual image (magic bytes check)
    try:
        img = Image.open(file_storage)
        img.verify()  # Checks file integrity without fully loading pixels
        file_storage.seek(0)  # Reset stream after verify
        img = Image.open(file_storage)  # Re-open for actual use
    except Exception:
        return None, "File is not a valid image or is corrupted"

    # 3. Pixel bomb protection
    total_pixels = img.width * img.height
    if total_pixels > MAX_PIXEL_COUNT:
        return None, f"Image too large ({img.width}x{img.height} = {total_pixels:,} pixels). Max {MAX_PIXEL_COUNT:,} pixels."

    return img, None


# ─── FIX 6: Safe Error Response Helper ───────────────────────────
def safe_error(message, status_code=500, log_detail=None):
    """
    Returns a safe JSON error response.
    Logs the real error internally but sends a generic message to the client.
    """
    if log_detail:
        logger.error(f"{message} | Detail: {log_detail}")
    return jsonify({"error": message}), status_code


# ═══════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/health', methods=['GET'])
@limiter.exempt  # Health check doesn't need rate limiting
def health_check():
    return jsonify({"status": "online", "message": "Secure & Hardened Backend v2.0"}), 200


@app.route('/api/encrypt_text', methods=['POST'])
def encrypt_text():
    try:
        # FIX 7: Input sanitization — validate all required fields
        if 'image' not in request.files:
            return safe_error("Cover image is required", 400)

        text = request.form.get('text', '').strip()
        password = request.form.get('password', '').strip()

        if not text:
            return safe_error("Secret message text is required", 400)
        if not password:
            return safe_error("Encryption password is required", 400)

        image_file = request.files['image']

        # FIX 5: Validate the image file
        carrier_img, err = validate_image(image_file)
        if err:
            return safe_error(err, 400)

        if carrier_img.mode != 'RGB':
            carrier_img = carrier_img.convert('RGB')

        # Encrypt and hide (HMAC-verified, compressed, double-encrypted)
        encrypted_payload = encrypt_binary(text, password, data_type=DATA_TYPE_TEXT)
        secret_img = lsb.hide(carrier_img, encrypted_payload, auto_convert_to_str=False)

        buf = BytesIO()
        secret_img.save(buf, format="PNG")
        buf.seek(0)

        logger.info("Text encryption successful")
        return send_file(buf, mimetype='image/png', as_attachment=True, download_name="stego_enc.png")

    except Exception as e:
        # FIX 6: Log real error internally, send safe message to client
        return safe_error("Text encryption failed. Please check your inputs and try again.", 500, log_detail=str(e))


@app.route('/api/decrypt_text', methods=['POST'])
def decrypt_text():
    try:
        # FIX 7: Input sanitization
        if 'image' not in request.files:
            return safe_error("Stego image is required", 400)

        password = request.form.get('password', '').strip()
        if not password:
            return safe_error("Decryption password is required", 400)

        image_file = request.files['image']

        # FIX 5: Validate the image
        carrier_img, err = validate_image(image_file)
        if err:
            return safe_error(err, 400)

        revealed_data = lsb.reveal(carrier_img)

        if not revealed_data:
            return safe_error("No hidden data found in this image", 404)

        result = decrypt_binary(revealed_data, password)

        # New format returns tuple (data_type, raw_data) on success, error string on failure
        if isinstance(result, str):
            return safe_error("Invalid password or data corrupted", 400)

        data_type, raw_data = result
        if data_type == DATA_TYPE_TEXT:
            logger.info("Text decryption successful")
            return jsonify({"text": raw_data.decode('utf-8')})
        else:
            return safe_error("This image does not contain hidden text", 400)

    except Exception as e:
        return safe_error("Text decryption failed. Please try again.", 500, log_detail=str(e))


@app.route('/api/encrypt_images', methods=['POST'])
def encrypt_images():
    try:
        # FIX 7: Input sanitization
        if 'image1' not in request.files or 'image2' not in request.files:
            return safe_error("Both carrier and secret images are required", 400)

        password = request.form.get('password', '').strip()
        if not password:
            return safe_error("Encryption password is required", 400)

        carrier_file = request.files['image1']
        secret_file = request.files['image2']

        # FIX 5: Validate both images
        carrier_img, err = validate_image(carrier_file)
        if err:
            return safe_error(f"Carrier image: {err}", 400)

        # For secret image, we need raw bytes — validate extension & integrity separately
        secret_filename = secret_file.filename or ''
        secret_ext = secret_filename.rsplit('.', 1)[-1].lower() if '.' in secret_filename else ''
        if secret_ext not in ALLOWED_EXTENSIONS:
            return safe_error(f"Secret image: Invalid file type '.{secret_ext}'", 400)

        # Verify it's a real image
        try:
            secret_img_check = Image.open(secret_file)
            secret_img_check.verify()
            secret_file.seek(0)  # Reset for reading bytes
        except Exception:
            return safe_error("Secret image is not valid or is corrupted", 400)

        # Base64 encode the secret image
        secret_b64 = base64.b64encode(secret_file.read()).decode('utf-8')

        # Encrypt (HMAC-verified, compressed, double-encrypted)
        encrypted_payload = encrypt_binary(secret_b64, password, data_type=DATA_TYPE_IMAGE)

        if carrier_img.mode != 'RGB':
            carrier_img = carrier_img.convert('RGB')

        result_img = lsb.hide(carrier_img, encrypted_payload)

        buf = BytesIO()
        result_img.save(buf, format="PNG")
        buf.seek(0)

        logger.info("Image encryption successful")
        return send_file(buf, mimetype='image/png', as_attachment=True, download_name="stego_merged.png")

    except Exception as e:
        return safe_error("Image encryption failed. Please check your inputs and try again.", 500, log_detail=str(e))


@app.route('/api/decrypt_image', methods=['POST'])
def decrypt_image():
    try:
        # FIX 7: Input sanitization
        if 'image' not in request.files:
            return safe_error("Stego image is required", 400)

        password = request.form.get('password', '').strip()
        if not password:
            return safe_error("Decryption password is required", 400)

        image_file = request.files['image']

        # FIX 5: Validate the image
        carrier_img, err = validate_image(image_file)
        if err:
            return safe_error(err, 400)

        encrypted_payload = lsb.reveal(carrier_img)

        if not encrypted_payload:
            return safe_error("No hidden data found in this image", 404)

        result = decrypt_binary(encrypted_payload, password)

        # New format returns tuple (data_type, raw_data) on success, error string on failure
        if isinstance(result, str):
            return safe_error("Incorrect password or data corrupted", 400)

        data_type, raw_data = result
        if data_type == DATA_TYPE_IMAGE:
            b64_data = raw_data.decode('utf-8')
            missing_padding = len(b64_data) % 4
            if missing_padding:
                b64_data += '=' * (4 - missing_padding)

            img_bytes = base64.b64decode(b64_data)

            logger.info("Image decryption successful")
            return send_file(BytesIO(img_bytes), mimetype='image/png', as_attachment=True, download_name="revealed.png")
        else:
            return safe_error("This image does not contain a hidden image", 400)

    except Exception as e:
        return safe_error("Image decryption failed. Please try again.", 500, log_detail=str(e))


# ─── Error Handlers ───────────────────────────────────────────────

@app.errorhandler(413)
def too_large(e):
    """Triggered when upload exceeds MAX_CONTENT_LENGTH (16 MB)"""
    return safe_error("File too large. Maximum upload size is 16 MB.", 413)

@app.errorhandler(429)
def rate_limit_exceeded(e):
    """Triggered when rate limit is exceeded"""
    return safe_error("Too many requests. Please wait a moment and try again.", 429)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    logger.info(f"Starting SteganoWorld server on port {port} (with WebSocket)")
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
