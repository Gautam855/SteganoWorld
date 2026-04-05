import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("server/.env")

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

bucket_name = "chat-images"

try:
    # Check if bucket exists
    buckets = supabase.storage.list_buckets()
    bucket_names = [b.name for b in buckets]
    if bucket_name not in bucket_names:
        print(f"Creating bucket {bucket_name}...")
        supabase.storage.create_bucket(bucket_name, {"public": True})
        print("Bucket created successfully!")
    else:
        print("Bucket already exists.")
except Exception as e:
    import traceback
    traceback.print_exc()
