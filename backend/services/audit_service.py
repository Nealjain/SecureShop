from datetime import datetime
from core.security import compute_record_hash

async def log_audit(db, action: str, user_id, details: str,
                    ip: str = None, device_fp: str = None, risk_level: str = "low"):
    now = datetime.utcnow().isoformat()
    entry = {
        "action":    action,
        "user_id":   str(user_id) if user_id else None,
        "details":   details,
        "ip":        ip,
        "device_fp": device_fp,
        "risk_level": risk_level,
        "timestamp": now,
    }
    entry["record_hash"] = compute_record_hash(entry)
    await db.audit_logs.insert_one(entry)
