import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("server/.env")

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

bucket_name = "chat-images"
file_name = f"test_{uuid.uuid4()}.txt"
content = b"test file content"

try:
    res = supabase.storage.from_(bucket_name).upload(file_name, content)
    print("SUCCESS", res)
except Exception as e:
    import traceback
    traceback.print_exc()
