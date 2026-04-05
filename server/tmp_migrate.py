
from app import app
from chat.database import db

def run_migration():
    print("Starting migration to Supabase...")
    try:
        with app.app_context():
            # SQLAlchemy will use the URL in .env to create tables in Supabase
            db.create_all()
            print("✅ Migration successful! Tables created in Supabase.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
