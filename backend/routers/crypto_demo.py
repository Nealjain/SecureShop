from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import Optional, Any, Dict
from core.middleware import limiter
from core.security import (encrypt_aes, decrypt_aes, sha256_hex, compute_record_hash,
                            hash_password, verify_password, generate_otp_secret_encrypted,
                            get_totp_uri, verify_totp, generate_payment_token)
from services.token_vault_service import luhn_check
from ml.predict import predict_fraud_ml
from ml.features import extract_features

router = APIRouter(prefix="/api/crypto", tags=["crypto-demo"])

class TextIn(BaseModel):
    text: str

class EncryptedIn(BaseModel):
    encrypted: str

class PasswordIn(BaseModel):
    password: str

class VerifyPasswordIn(BaseModel):
    password: str
    stored_hash: str

class OTPVerifyIn(BaseModel):
    encrypted_secret: str
    otp_code: str

class TokenizeIn(BaseModel):
    card_number: str
    cvv: str
    expiry: str
    card_brand: Optional[str] = "Unknown"

class LuhnIn(BaseModel):
    card_number: str

class FraudIn(BaseModel):
    order: Dict[str, Any]
    user_history: Optional[list] = []

class RecordHashIn(BaseModel):
    document: Dict[str, Any]

@router.post("/encrypt")
async def demo_encrypt(body: TextIn):
    """AES-256-GCM encrypt demo."""
    return {"encrypted": encrypt_aes(body.text)}

@router.post("/decrypt")
async def demo_decrypt(body: EncryptedIn):
    """AES-256-GCM decrypt demo."""
    try:
        return {"decrypted": decrypt_aes(body.encrypted)}
    except Exception as e:
        return {"error": str(e)}

@router.post("/hash")
async def demo_hash(body: TextIn):
    """SHA-256 hash demo."""
    return {"hash": sha256_hex(body.text), "input_length": len(body.text)}

@router.post("/record-hash")
async def demo_record_hash(body: RecordHashIn):
    """Composite record hash demo."""
    return {"record_hash": compute_record_hash(body.document)}

@router.post("/hash-password")
async def demo_hash_password(body: PasswordIn):
    """PBKDF2-HMAC-SHA256 hash demo (310,000 iterations)."""
    return {"stored_hash": hash_password(body.password), "algorithm": "PBKDF2-HMAC-SHA256", "iterations": 310000}

@router.post("/verify-password")
async def demo_verify_password(body: VerifyPasswordIn):
    """PBKDF2 verify demo."""
    return {"valid": verify_password(body.password, body.stored_hash)}

@router.post("/generate-otp")
async def demo_generate_otp():
    """Generate TOTP secret and provisioning URI."""
    plain, encrypted = generate_otp_secret_encrypted()
    uri = get_totp_uri(plain, "demo@example.com")
    return {"plain_secret": plain, "encrypted_secret": encrypted, "otp_uri": uri}

@router.post("/verify-otp")
async def demo_verify_otp(body: OTPVerifyIn):
    """Verify TOTP code against encrypted secret."""
    return {"valid": verify_totp(body.encrypted_secret, body.otp_code)}

@router.post("/tokenize")
async def demo_tokenize(body: TokenizeIn):
    """Payment tokenization demo (no DB storage)."""
    if not luhn_check(body.card_number):
        return {"error": "Invalid card number (Luhn check failed)"}
    token = generate_payment_token()
    last4 = body.card_number.replace(" ", "")[-4:]
    return {"token": token, "card_last4": last4, "card_brand": body.card_brand,
            "note": "Raw card number never stored in orders collection"}

@router.post("/luhn-check")
async def demo_luhn(body: LuhnIn):
    """Luhn algorithm card validation demo."""
    return {"card_number": f"****{body.card_number[-4:]}", "valid": luhn_check(body.card_number)}

@router.post("/fraud-predict")
async def demo_fraud_predict(body: FraudIn):
    """ML Isolation Forest fraud prediction demo."""
    features = extract_features(body.order, body.user_history)
    ml_result = predict_fraud_ml(features)
    return {"features": features, "ml_result": ml_result}
