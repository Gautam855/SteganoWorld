import os
from sqlalchemy import text
from app import app
from chat.database import db

def run():
    with app.app_context():
        try:
            db.session.execute(text('ALTER TABLE shared_links ADD COLUMN burn_after_views INTEGER DEFAULT 0'))
        except Exception as e:
            print("burn_after_views already exists or err:", e)
            
        try:
            db.session.execute(text('ALTER TABLE shared_links ADD COLUMN views_count INTEGER DEFAULT 0'))
        except Exception as e:
            print("views_count already exists or err:", e)
            
        db.session.commit()
        print("Database migrated successfully!")

if __name__ == '__main__':
    run()
