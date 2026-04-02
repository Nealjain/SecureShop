from fastapi import APIRouter, Request, Depends, HTTPException
from core.database import get_db
from core.dependencies import get_current_user
from core.security import compute_device_fingerprint, verify_record_hash, get_totp_uri, decrypt_aes
from core.middleware import limiter
from models.user import UserCreate, UserLogin, OTPVerify, EnableMFA
from services.auth_service import register_user, login_user
from services.session_service import invalidate_session
from services.audit_service import log_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_client_info(request: Request):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    lang = request.headers.get("accept-language", "")
    return ip, compute_device_fingerprint(ua, ip, lang)

@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request, body: UserCreate, db=Depends(get_db)):
    """Register a new user with PBKDF2 password hashing and OTP secret generation."""
    ip, device_fp = get_client_info(request)
    return await register_user(db, body.name, body.email, body.password, ip, device_fp)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: UserLogin, db=Depends(get_db)):
    """Authenticate user — returns JWT or MFA challenge."""
    ip, device_fp = get_client_info(request)
    return await login_user(db, body.email, body.password, ip, device_fp)

@router.post("/logout")
@limiter.limit("20/minute")
async def logout(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Invalidate current session."""
    await invalidate_session(db, current_user["token"])
    await log_audit(db, "LOGOUT", current_user["user_id"], "User logged out")
    return {"message": "Logged out successfully"}

@router.get("/me")
@limiter.limit("60/minute")
async def me(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get current user profile with integrity check."""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["_id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "mfa_enabled": user.get("mfa_enabled", False),
        "created_at": user["created_at"],
        "integrity_status": "ok" if verify_record_hash(user) else "tampered"
    }



@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Re-issue JWT token for active session."""
    from core.security import create_access_token
    from services.session_service import create_session
    ip, device_fp = get_client_info(request)
    await invalidate_session(db, current_user["token"])
    new_token = create_access_token({"sub": current_user["email"],
                                     "user_id": current_user["user_id"],
                                     "role": current_user["role"]})
    await create_session(db, current_user["user_id"], new_token, ip, device_fp)
    return {"access_token": new_token, "token_type": "bearer"}
