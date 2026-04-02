import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from core.config import settings
from core.database import connect_db, close_db
from core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware, limiter
from routers import auth, products, orders, admin, crypto_demo
from routers.profile import router as profile_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Connect to Convex
    await connect_db()
    # 2. Train ML model if pkl files don't exist
    if not os.path.exists("ml/fraud_model.pkl"):
        from ml.train_model import train
        train()
    print("✅ Application ready — docs at http://localhost:8000/docs")
    yield
    await close_db()

app = FastAPI(
    title="Secure E-Commerce API",
    description="CCS Project — Shah & Anchor Kutchhi Engineering College | AES-256-GCM, PBKDF2, JWT, TOTP, Isolation Forest",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(crypto_demo.router)
app.include_router(profile_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = "".join(traceback.format_exception(None, exc, exc.__traceback__))
    print(f"❌ GLOBAL 500: {exc}\n{error_msg}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error — Check Vercel logs or contact admin", "error": str(exc)}
    )

@app.get("/")
async def root():
    return {
        "app": "Secure E-Commerce API",
        "docs": "/docs",
        "version": "1.0.0",
        "security": ["AES-256-GCM", "PBKDF2-HMAC-SHA256", "JWT-HS256", "TOTP-RFC6238", "Isolation-Forest"]
    }
