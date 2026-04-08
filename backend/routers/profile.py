from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.dependencies import get_current_user
from core.security import compute_record_hash, encrypt_aes, decrypt_aes
from core.middleware import limiter
import json

router = APIRouter(prefix="/api/profile", tags=["profile"])

class SavedAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = ""
    city: str
    state: str
    pincode: str

class SavedCard(BaseModel):
    card_number: str
    expiry: str
    card_brand: str
    nickname: Optional[str] = ""

class ProfileUpdate(BaseModel):
    address: Optional[SavedAddress] = None
    saved_card: Optional[SavedCard] = None
    delete_card: Optional[bool] = False


@router.get("")
@limiter.limit("30/minute")
async def get_profile(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get saved address and masked card details."""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    if not user:
        return {"address": None, "saved_card": None}

    address = user.get("saved_address")
    saved_card = None

    # Decrypt saved card if exists — return only masked version
    enc_card = user.get("saved_card_encrypted")
    if enc_card:
        try:
            card_data = json.loads(decrypt_aes(enc_card))
            saved_card = {
                "card_last4": card_data.get("card_number", "")[-4:],
                "expiry": card_data.get("expiry", ""),
                "card_brand": card_data.get("card_brand", ""),
                "nickname": card_data.get("nickname", ""),
                "masked": f"****-****-****-{card_data.get('card_number','')[-4:]}",
            }
        except Exception:
            saved_card = None

    return {"address": address, "saved_card": saved_card}


@router.post("")
@limiter.limit("10/minute")
async def save_profile(request: Request, body: ProfileUpdate,
                        current_user=Depends(get_current_user), db=Depends(get_db)):
    """Save address and/or card details (card AES-256-GCM encrypted)."""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    if not user:
        return {"error": "User not found"}

    update_fields = {}

    if body.address:
        update_fields["saved_address"] = body.address.model_dump()

    if body.saved_card:
        card_data = body.saved_card.model_dump()
        update_fields["saved_card_encrypted"] = encrypt_aes(json.dumps(card_data))
    elif body.delete_card:
        update_fields["saved_card_encrypted"] = None

    if update_fields:
        await db.users.update_one({"_id": current_user["user_id"]}, {"$set": update_fields})

    return {"message": "Profile saved ✅"}


@router.get("/card-raw")
@limiter.limit("5/minute")
async def get_saved_card_raw(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Return decrypted card number for pre-filling checkout (only to authenticated user)."""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    enc_card = user.get("saved_card_encrypted") if user else None
    if not enc_card:
        return {"card": None}
    try:
        card_data = json.loads(decrypt_aes(enc_card))
        return {"card": card_data}
    except Exception:
        return {"card": None}


@router.get("/otp-uri")
@limiter.limit("5/minute")
async def get_otp_uri(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Return TOTP provisioning URI for re-scanning QR code."""
    user = await db.users.find_one({"_id": current_user["user_id"]})
    if not user:
        return {"otp_uri": ""}
    from core.security import decrypt_aes, get_totp_uri
    from core.config import settings
    try:
        secret = decrypt_aes(user["otp_secret_encrypted"])
        uri = get_totp_uri(secret, user["email"], settings.OTP_ISSUER)
        return {"otp_uri": uri}
    except Exception:
        return {"otp_uri": ""}
