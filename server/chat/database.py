from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base
import os
from sqlalchemy.pool import NullPool

# Use /tmp/ for SQLite on Vercel/Serverless to avoid Read-only filesystem error
DB_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:////tmp/stegano_chat.db')

# Disable SQLAlchemy client side pooling if using PGBouncer (Supabase)
engine_kwargs = {}
if "pooler.supabase.com" in DB_URI:
    engine_kwargs['poolclass'] = NullPool

engine = create_engine(DB_URI, **engine_kwargs)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    # import all modules here that might define models so that
    # they will be registered properly on the metadata.  Otherwise
    # you will have to import them first before calling init_db()
    import chat.models
    Base.metadata.create_all(bind=engine)
