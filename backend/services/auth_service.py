from __future__ import annotations
from datetime import datetime, timedelta
from fastapi import HTTPException
from core.security import (hash_password, verify_password, generate_otp_secret_encrypted,
                            get_totp_uri, verify_totp, create_access_token,
                            compute_record_hash, verify_record_hash, decrypt_aes)
from core.config import settings
from services.session_service import create_session
from services.audit_service import log_audit

async def register_user(db, name: str, email: str, password: str, ip: str, device_fp: str) -> dict:
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    plain_secret, enc_secret = generate_otp_secret_encrypted()
    doc = {
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "customer",
        "mfa_enabled": False,
        "otp_secret_encrypted": enc_secret,
        "failed_login_attempts": 0,
        "account_locked_until": None,
        "known_ips": [ip],
        "known_devices": [device_fp],
        "created_at": datetime.utcnow().isoformat(),
        "last_login": None,
        "last_ip": ip,
    }
    doc["record_hash"] = compute_record_hash(doc)
    result = await db.users.insert_one(doc)
    user_id = result.inserted_id
    await log_audit(db, "REGISTER", user_id,
                    f"New user registered: {email}", ip=ip, device_fp=device_fp)

    otp_uri = get_totp_uri(plain_secret, email, settings.OTP_ISSUER)
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "otp_uri": otp_uri,
        "otp_secret": plain_secret,
        "message": "Registration successful. Scan QR code to enable MFA."
    }

async def login_user(db, email: str, password: str, ip: str, device_fp: str) -> dict:
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = user["_id"]

    # Tamper check — log mismatch but don't block login (hash updates on every login)
    if not verify_record_hash(user):
        await log_audit(db, "HASH_MISMATCH", user_id,
                        "User record hash mismatch on login", ip=ip, risk_level="medium")

    # Account lock check
    if user.get("account_locked_until") and datetime.utcnow().isoformat() < user["account_locked_until"]:
        raise HTTPException(status_code=423, detail="Account temporarily locked due to failed login attempts")

    if not verify_password(password, user["password_hash"]):
        attempts = user.get("failed_login_attempts", 0) + 1
        update = {"failed_login_attempts": attempts}
        if attempts >= settings.MAX_LOGIN_ATTEMPTS:
            update["account_locked_until"] = (datetime.utcnow() + timedelta(minutes=settings.ACCOUNT_LOCK_MINUTES)).isoformat()
        await db.users.update_one({"_id": user_id}, {"$set": update})
        await log_audit(db, "LOGIN_FAILED", user_id,
                        f"Failed login attempt {attempts}", ip=ip, device_fp=device_fp, risk_level="medium")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Reset failed attempts
    known_ips = list(set(user.get("known_ips", []) + [ip]))
    known_devices = list(set(user.get("known_devices", []) + [device_fp]))
    update_fields = {
        "failed_login_attempts": 0,
        "account_locked_until": None,
        "last_login": datetime.utcnow().isoformat(),
        "last_ip": ip,
        "known_ips": known_ips,
        "known_devices": known_devices,
    }
    updated_user = {k: v for k, v in user.items() if k not in ("_id", "record_hash")}
    updated_user.update(update_fields)
    await db.users.update_one({"_id": user_id}, {"$set": update_fields})

    token = create_access_token({"sub": email, "user_id": user_id, "role": user["role"]})
    await create_session(db, user_id, token, ip, device_fp)
    await log_audit(db, "LOGIN", user_id, f"Successful login from {ip}",
                    ip=ip, device_fp=device_fp)
    return {"mfa_required": False, "access_token": token, "token_type": "bearer",
            "role": user["role"], "name": user["name"]}
