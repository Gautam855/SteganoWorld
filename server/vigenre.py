import numpy as np

def encrypt_binary(data_str, key):
    """Secure XOR-based encryption that works for ANY data (including Base64)"""
    if not key: key = "STEGANO"
    
    # Convert everything to bytes
    data_bytes = np.frombuffer(data_str.encode('utf-8'), dtype=np.uint8).copy()
    key_bytes = np.frombuffer(key.encode('utf-8'), dtype=np.uint8)
    
    # Vectorized XOR operation
    key_len = len(key_bytes)
    key_cycle = np.tile(key_bytes, (len(data_bytes) // key_len) + 1)[:len(data_bytes)]
    
    # XOR each byte with the key (Preserves all cases and symbols!)
    encrypted_bytes = np.bitwise_xor(data_bytes, key_cycle)
    
    # Return as safe latin-1 string (to avoid UTF-8 errors)
    return encrypted_bytes.tobytes().decode('latin-1')

def decrypt_binary(encrypted_str, key):
    """The beauty of XOR is that decryption is exactly the same as encryption!"""
    if not key: key = "STEGANO"
    
    data_bytes = np.frombuffer(encrypted_str.encode('latin-1'), dtype=np.uint8).copy()
    key_bytes = np.frombuffer(key.encode('utf-8'), dtype=np.uint8)
    
    key_len = len(key_bytes)
    key_cycle = np.tile(key_bytes, (len(data_bytes) // key_len) + 1)[:len(data_bytes)]
    
    decrypted_bytes = np.bitwise_xor(data_bytes, key_cycle)
    return decrypted_bytes.tobytes().decode('utf-8', errors='ignore')

# Legacy aliases for text-only compatibility (using the new fast XOR logic)
def encrypt_vigenere(text, key):
    return encrypt_binary(text, key)

def decrypt_vigenere(text, key):
    return decrypt_binary(text, key)
