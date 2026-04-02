from __future__ import annotations
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security import decode_access_token, compute_device_fingerprint
from core.database import get_db

bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db=Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("type") == "partial":
        raise HTTPException(status_code=401, detail="MFA verification required")

    # Session validation
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    lang = request.headers.get("accept-language", "")
    device_fp = compute_device_fingerprint(ua, ip, lang)

    session = await db.sessions.find_one({"token": token, "is_active": True})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found or expired")

    from datetime import datetime
    from core.config import settings
    last_activity_raw = session.get("last_activity", session["created_at"])
    # last_activity is stored as ISO string — parse it before arithmetic
    if isinstance(last_activity_raw, str):
        last_activity = datetime.fromisoformat(last_activity_raw)
    else:
        last_activity = last_activity_raw
    idle_minutes = (datetime.utcnow() - last_activity).total_seconds() / 60
    if idle_minutes > settings.SESSION_TIMEOUT_MINUTES:
        await db.sessions.update_one({"token": token}, {"$set": {"is_active": False}})
        raise HTTPException(status_code=401, detail="Session expired due to inactivity")

    if session.get("device_fingerprint") and session["device_fingerprint"] != device_fp:
        # Log the mismatch but don't immediately invalidate — could be browser quirk
        # Only invalidate if IP also changed (stronger signal of hijacking)
        session_ip = session.get("ip_address", "")
        if session_ip and session_ip != ip:
            await db.sessions.update_one({"token": token}, {"$set": {"is_active": False}})
            raise HTTPException(status_code=401, detail="Session hijacking detected — session invalidated")

    await db.sessions.update_one({"token": token}, {"$set": {"last_activity": datetime.utcnow().isoformat()}})

    user = await db.users.find_one({"email": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"user_id": user["_id"], "email": user["email"], "role": user["role"], "token": token}

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
