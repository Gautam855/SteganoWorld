"""
Add encryption_public_key column to chat_users table.
Run once after updating the model.
"""
from dotenv import load_dotenv
load_dotenv()

from app import app
from chat.database import db

with app.app_context():
    # Add the new column if it doesn't exist
    try:
        db.engine.execute("ALTER TABLE chat_users ADD COLUMN encryption_public_key TEXT;")
        print("✅ Column 'encryption_public_key' added successfully!")
    except Exception as e:
        if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
            print("ℹ️  Column already exists, skipping.")
        else:
            # Try SQLAlchemy text() approach
            from sqlalchemy import text
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS encryption_public_key TEXT;"))
                conn.commit()
            print("✅ Column 'encryption_public_key' added successfully (via text)!")
