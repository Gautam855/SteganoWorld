from app import app
from chat.database import db
from chat.models import SharedLink, SharedLinkAccess

with app.app_context():
    db.create_all()
    print("Database models synced.")
