"""
Database Setup — SQLAlchemy + Supabase PostgreSQL
====================================
Uses the pooled connection string from .env.
"""

import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.pool import NullPool

db = SQLAlchemy()

def init_db(app):
    """
    Initialize the database with the Flask app.
    Creates all tables if they don't exist.
    """
    # Use the full URI string directly if available, else fallback to SQLite
    db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///stegano_chat.db')
    
    app.config.setdefault('SQLALCHEMY_DATABASE_URI', db_uri)
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # Disable SQLAlchemy client side pooling if using PGBouncer (Supabase)
    if "pooler.supabase.com" in db_uri:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'poolclass': NullPool}

    db.init_app(app)

    with app.app_context():
        # Import models so SQLAlchemy knows about them
        from chat.models import ChatUser, Message
        db.create_all()

    return db
