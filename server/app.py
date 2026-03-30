from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
from stegano import lsb
import base64
from io import BytesIO
from PIL import Image
from vigenre import encrypt_binary, decrypt_binary

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = None # No size limit

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "message": "Optimized & Binary-Safe Backend"}), 200

@app.route('/api/encrypt_text', methods=['POST'])
def encrypt_text():
    try:
        image_file = request.files['image']
        text = request.form['text']
        password = request.form['password']

        # Wrap text in marker and encrypt safely
        payload = f"VALID:{text}"
        encrypted_payload = encrypt_binary(payload, password)

        carrier_img = Image.open(image_file)
        if carrier_img.mode != 'RGB': carrier_img = carrier_img.convert('RGB')
        
        # Hide with latin-1 to preserve binary integrity
        secret_img = lsb.hide(carrier_img, encrypted_payload, auto_convert_to_str=False)
        
        buf = BytesIO()
        secret_img.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype='image/png', as_attachment=True, download_name="stego_enc.png")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/decrypt_text', methods=['POST'])
def decrypt_text():
    try:
        image_file = request.files['image']
        password = request.form['password']

        carrier_img = Image.open(image_file)
        revealed_data = lsb.reveal(carrier_img)
        
        if not revealed_data: return jsonify({"error": "No hidden data"}), 404

        plain_text = decrypt_binary(revealed_data, password)

        if plain_text.startswith("VALID:"):
            return jsonify({"text": plain_text[6:]})
        else:
            return jsonify({"error": "Invalid password"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/encrypt_images', methods=['POST'])
def encrypt_images():
    try:
        carrier_file = request.files['image1']
        secret_file = request.files['image2']
        password = request.form['password']

        # 1. Base64 encode the secret image
        secret_b64 = base64.b64encode(secret_file.read()).decode('utf-8')

        # 2. Encrypt binary safe
        payload = f"IMAGE_VALID:{secret_b64}"
        encrypted_payload = encrypt_binary(payload, password)

        # 3. Hide in carrier (memory only)
        carrier_img = Image.open(carrier_file)
        if carrier_img.mode != 'RGB': carrier_img = carrier_img.convert('RGB')
        
        result_img = lsb.hide(carrier_img, encrypted_payload)
        
        buf = BytesIO()
        result_img.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype='image/png', as_attachment=True, download_name="stego_merged.png")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/decrypt_image', methods=['POST'])
def decrypt_image():
    try:
        image_file = request.files['image']
        password = request.form['password']

        carrier_img = Image.open(image_file)
        encrypted_payload = lsb.reveal(carrier_img)

        if not encrypted_payload: return jsonify({"error": "Nothing found"}), 404

        decrypted_payload = decrypt_binary(encrypted_payload, password)

        if decrypted_payload.startswith("IMAGE_VALID:"):
            b64_data = decrypted_payload[12:]
            missing_padding = len(b64_data) % 4
            if missing_padding: b64_data += '=' * (4 - missing_padding)
            
            img_bytes = base64.b64decode(b64_data)
            return send_file(BytesIO(img_bytes), mimetype='image/png', as_attachment=True, download_name="revealed.png")
        else:
            return jsonify({"error": "Incorrect password"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
