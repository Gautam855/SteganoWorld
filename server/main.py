import os
import logging
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from chat.database import db_session, init_db
from chat.routes import router as chat_router
from chat.stegano_routes import router as stego_router
from chat.shared_routes import router as shared_router
from chat.ops_routes import router as ops_router
import socketio
from chat.socket_events import sio

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('SteganoWorld.API')

# Create FastAPI app
app = FastAPI(title="SteganoWorld API", version="2.0.0")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for debug/initial prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database
try:
    init_db()
    logger.info("Database connection established")
except Exception as e:
    logger.error(f"Database error: {str(e)}")

# --- Endpoints ---
@app.get("/api/health")
async def health_check():
    """Service health check endpoint."""
    return {"status": "online", "version": "2.0.0 (FastAPI)"}

@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    """Ensure database sessions are removed after each request."""
    response = await call_next(request)
    db_session.remove()
    return response

# Mount Routers
app.include_router(chat_router)
app.include_router(stego_router)
app.include_router(shared_router)
app.include_router(ops_router)

# --- Socket.IO Integration ---
# Wrap FastAPI with Socket.IO ASGI app
from socketio import ASGIApp
sio_app = ASGIApp(sio, app)

# For Vercel, we need to export 'app' correctly
# If we're using socketio, we export sio_app or use middleware
# On Vercel, it's often easier to export 'app' for simple HTTP and separate socket server if needed
# but ASGIApp works fine for many cases.
# Let's export 'app' for Vercel's python builder but wrap it.

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(sio_app, host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))

# Vercel entry point
# Vercel needs to point to 'app' or 'sio_app'
# We'll use 'app' as the main export in vercel.json
