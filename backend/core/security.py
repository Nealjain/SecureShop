from __future__ import annotations
import os, base64, hashlib, json, hmac, secrets, string
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from jose import jwt, JWTError
import pyotp
from dotenv import load_dotenv

# Load variables from .env into os.environ
load_dotenv()

# ── AES-256-GCM ─────────────────────────────────────────────

def get_aes_key() -> bytes:
    key_b64 = os.environ.get("AES_KEY_BASE64", "")
    if not key_b64 or key_b64 == "CHANGE_THIS_TO_RANDOM_32BYTE_BASE64_VALUE":
        key = AESGCM.generate_key(bit_length=256)
        encoded = base64.b64encode(key).decode()
        print(f"⚠️  GENERATED AES KEY (save to .env): {encoded}")
        os.environ["AES_KEY_BASE64"] = encoded
        return key
    return base64.b64decode(key_b64)

def encrypt_aes(plaintext: str) -> str:
    key = get_aes_key()
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return f"{iv.hex()}:{ciphertext.hex()}"

def decrypt_aes(encrypted: str) -> str:
    key = get_aes_key()
    aesgcm = AESGCM(key)
    iv_hex, ct_hex = encrypted.split(":", 1)
    return aesgcm.decrypt(bytes.fromhex(iv_hex), bytes.fromhex(ct_hex), None).decode("utf-8")

# ── PBKDF2-HMAC-SHA256 ───────────────────────────────────────

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=310000)
    key = kdf.derive(password.encode("utf-8"))
    return f"{salt.hex()}:{key.hex()}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        salt_hex, hash_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        stored_key = bytes.fromhex(hash_hex)
        kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=310000)
        new_key = kdf.derive(plain_password.encode("utf-8"))
        return hmac.compare_digest(new_key, stored_key)
    except Exception:
        return False

# ── SHA-256 ──────────────────────────────────────────────────

def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

def generate_order_integrity_hash(order: dict) -> str:
    canonical = json.dumps({
        "order_id":  str(order.get("_id", order.get("order_id", ""))),
        "user_id":   str(order["user_id"]),
        "items":     sorted(order["items"], key=lambda x: str(x["product_id"])),
        "total":     float(order["total"]),
        "timestamp": order["timestamp"].isoformat() if isinstance(order["timestamp"], datetime)
                     else str(order["timestamp"])
    }, sort_keys=True, separators=(",", ":"))
    return sha256_hex(canonical)

def verify_order_integrity_hash(order: dict, stored_hash: str) -> bool:
    return generate_order_integrity_hash(order) == stored_hash

def compute_device_fingerprint(user_agent: str, ip: str, accept_language: str = "") -> str:
    return sha256_hex(f"{user_agent}|{ip}|{accept_language}")

# ── COMPOSITE RECORD HASH ────────────────────────────────────

def compute_record_hash(document: dict) -> str:
    EXCLUDED = {"_id", "record_hash", "id", "_creationTime"}

    def normalize(v):
        if v is None: return "None"
        if isinstance(v, datetime): return v.isoformat()
        if isinstance(v, (dict, list)): return json.dumps(v, sort_keys=True, default=str, separators=(",", ":"))
        if isinstance(v, bytes): return v.hex()
        return str(v)

    parts = [f"{k}={normalize(v)}" for k, v in sorted(document.items()) if k not in EXCLUDED and v is not None]
    return sha256_hex("|".join(parts))

def verify_record_hash(document: dict) -> bool:
    stored = document.get("record_hash")
    if not stored:
        return False
    return hmac.compare_digest(compute_record_hash(document), stored)

# ── JWT ──────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", 60))

def create_access_token(data: dict, expires_minutes: int = None) -> str:
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes or JWT_EXPIRE_MINUTES)
    payload = {**data, "exp": expire, "iat": datetime.utcnow(), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

# ── OTP / TOTP ───────────────────────────────────────────────

def generate_otp_secret() -> str:
    return pyotp.random_base32()

def generate_otp_secret_encrypted() -> tuple:
    secret = generate_otp_secret()
    return secret, encrypt_aes(secret)

def get_totp_uri(secret: str, email: str, issuer: str = "SecureECommerce") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)

def get_current_totp(encrypted_secret: str) -> str:
    return pyotp.TOTP(decrypt_aes(encrypted_secret)).now()

def verify_totp(encrypted_secret: str, otp_code: str) -> bool:
    try:
        return pyotp.TOTP(decrypt_aes(encrypted_secret)).verify(otp_code, valid_window=1)
    except Exception:
        return False

# ── PAYMENT TOKENIZATION ─────────────────────────────────────

def generate_payment_token() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(16))

def mask_card_number(card_number: str) -> str:
    clean = card_number.replace(" ", "").replace("-", "")
    return f"****-****-****-{clean[-4:]}"
