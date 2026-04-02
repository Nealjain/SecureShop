from __future__ import annotations
from datetime import datetime, timedelta
from core.security import compute_record_hash
from core.config import settings

SESSION_TIMEOUT_MINUTES = settings.SESSION_TIMEOUT_MINUTES

async def create_session(db, user_id: str, token: str, ip: str, device_fp: str) -> None:
    now = datetime.utcnow()
    session = {
        "user_id":            user_id,
        "token":              token,
        "ip_address":         ip,
        "device_fingerprint": device_fp,
        "created_at":         now.isoformat(),
        "expires_at":         (now + timedelta(hours=1)).isoformat(),
        "last_activity":      now.isoformat(),
        "is_active":          True,
    }
    session["record_hash"] = compute_record_hash(session)
    await db.sessions.insert_one(session)

async def invalidate_session(db, token: str) -> None:
    await db.sessions.update_one({"token": token}, {"$set": {"is_active": False}})

async def invalidate_all_user_sessions(db, user_id: str) -> int:
    result = await db.sessions.update_many(
        {"user_id": user_id, "is_active": True},
        {"$set": {"is_active": False}}
    )
    return result.modified_count
