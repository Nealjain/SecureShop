# Secure E-Commerce Application
## CCS (Cryptography & Communication Security) — Review Presentation

**Shah & Anchor Kutchhi Engineering College, Mumbai**
Neal Jain (29) · Vedant Kale (31) · Zeal Gori (26) · Harsh Bhanushali (06)

---

## 1. Project Overview

A full-stack secure e-commerce platform demonstrating real-world application of cryptographic
algorithms and security protocols as required by the CCS curriculum.

**Stack:** FastAPI (Python 3.9) · Convex (serverless DB) · React + TypeScript + Tailwind CSS

---

## 2. Security Architecture — 8-Step Workflow

```
Step 1  REGISTER    → PBKDF2-HMAC-SHA256 (310,000 iter) + AES-256-GCM OTP secret + SHA-256 record hash
Step 2  LOGIN       → Password verify (constant-time) + device fingerprint + IP check + MFA challenge
Step 3  SESSION     → JWT HS256 (60 min) + 30 min inactivity timeout + hijack detection
Step 4  BROWSE      → SHA-256 record hash verified on every product read
Step 5  PAYMENT     → AES-256-GCM card encryption + Luhn validation + PCI DSS tokenization
Step 6  ORDER HASH  → SHA-256 canonical JSON integrity hash + composite record hash
Step 7  FRAUD       → Rule Engine + IP/Device check + Isolation Forest ML (8 features)
Step 8  STORE       → _record_hash on every document + audit log with risk level
```

---

## 3. Cryptographic Algorithms Implemented

### 3.1 AES-256-GCM (Symmetric Encryption)
- **Used for:** Payment card data, OTP secrets
- **Key size:** 256 bits
- **IV:** 12 bytes random per encryption
- **Auth tag:** 128 bits (GCM provides authenticated encryption)
- **Library:** Python `cryptography` — `AESGCM`

```python
def encrypt_aes(plaintext: str) -> str:
    key = get_aes_key()          # 32-byte key from env
    aesgcm = AESGCM(key)
    iv = os.urandom(12)          # fresh IV every time
    ciphertext = aesgcm.encrypt(iv, plaintext.encode(), None)
    return f"{iv.hex()}:{ciphertext.hex()}"
```

### 3.2 PBKDF2-HMAC-SHA256 (Password Hashing)
- **Standard:** NIST SP 800-132
- **Iterations:** 310,000 (OWASP 2023 minimum)
- **Salt:** 16 bytes random per user
- **Output:** 32-byte derived key
- **Comparison:** `hmac.compare_digest()` — constant-time, prevents timing attacks

```python
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=310000)
    key = kdf.derive(password.encode())
    return f"{salt.hex()}:{key.hex()}"
```

### 3.3 SHA-256 (Integrity Hashing)
Three distinct uses:

| Use | Input | Purpose |
|-----|-------|---------|
| Order integrity hash | Canonical JSON (id+user+items+total+ts) | Detect order tampering |
| Composite record hash | All document fields concatenated | Detect any field-level DB tampering |
| Device fingerprint | SHA-256(UA + IP + Accept-Language) | Session hijacking detection |

### 3.4 JWT HS256 (Session Tokens)
- **Algorithm:** HMAC-SHA256
- **Expiry:** 60 minutes (configurable)
- **Inactivity timeout:** 30 minutes (checked on every request)
- **Hijack detection:** Device fingerprint stored in session, compared on every request
- **Library:** `python-jose`

### 3.5 TOTP RFC 6238 (Multi-Factor Authentication)
- **Algorithm:** HMAC-SHA1 with 30-second time step
- **Code length:** 6 digits
- **Clock drift:** ±1 window tolerance
- **Secret storage:** AES-256-GCM encrypted in DB (never plain text)
- **Library:** `pyotp`

### 3.6 Payment Tokenization (PCI DSS)
- **Luhn algorithm:** Card number checksum validation
- **Tokenization:** 16-char cryptographically random token
- **Storage:** Full card AES-256-GCM encrypted in `token_vault` collection only
- **Orders collection:** Stores only `payment_token` + `card_last4` + `card_brand`

---

## 4. Fraud Detection Engine — 3 Layers

### Layer 1: Rule-Based Velocity Engine
| Rule | Threshold | Risk Points |
|------|-----------|-------------|
| Amount velocity | Order > 3× user average | +25 |
| Quantity velocity | Total items > 10 | +25 |
| Frequency velocity | ≥3 orders in 5 minutes | +25 |
| High-value threshold | Order > ₹50,000 | +25 |

### Layer 2: IP + Device Fingerprint Verification
- New IP: +20 risk points
- New device fingerprint: +20 risk points
- Both new (identity mismatch): +30 extra points

### Layer 3: ML Isolation Forest
- **Model:** `sklearn.ensemble.IsolationForest`
- **Estimators:** 200 trees
- **Contamination:** 10%
- **Features (8):** transaction_amount, hour_of_day, items_count, user_order_count_7d,
  avg_order_value_user, amount_vs_avg_ratio, is_high_value, orders_last_5min
- **Risk score:** Sigmoid inversion of decision function

### Combined Formula
```
combined_risk = (rule_risk × 0.40) + (identity_risk × 0.20) + (ml_risk × 0.40)
is_fraudulent = combined_risk > 0.55  OR  rule_flags ≥ 2
```

| Score | Risk Level |
|-------|-----------|
| > 0.75 | Critical |
| > 0.55 | High |
| > 0.30 | Medium |
| ≤ 0.30 | Low |

---

## 5. Database Integrity — Tamper Detection

Every document in every collection has `_record_hash` computed before insert:

```python
def compute_record_hash(document: dict) -> str:
    # 1. Exclude: _id, _record_hash
    # 2. Sort keys alphabetically
    # 3. Normalize values (datetime→ISO, dict/list→JSON, None→"None")
    # 4. Build: "key1=val1|key2=val2|..."
    # 5. SHA-256 hash
```

**Collections protected:** users · products · orders · sessions · token_vault · audit_logs

On every read: `verify_record_hash()` recomputes and compares with `hmac.compare_digest()`.
Tamper detected → `TAMPER_DETECTED` audit event logged at `critical` risk level.

---

## 6. Security Middleware

| Middleware | Implementation |
|-----------|---------------|
| Security Headers | HSTS, CSP, X-Frame-Options: DENY, X-XSS-Protection, Referrer-Policy |
| Rate Limiting | slowapi per-IP: login 5/min, register 3/min, products 100/min |
| CORS | Configured origins only, credentials allowed |
| Request Logging | Method + path + status + duration on every request |

---

## 7. RBAC — Role-Based Access Control

| Permission | admin | customer |
|-----------|-------|---------|
| users:read/write/delete | ✅ | ❌ |
| orders:read_all | ✅ | ❌ |
| orders:read_own | ✅ | ✅ |
| products:write/delete | ✅ | ❌ |
| audit_logs:read | ✅ | ❌ |
| integrity:run_report | ✅ | ❌ |
| token_vault:read | ✅ | own only |

---

## 8. API Endpoints Summary

### Auth (`/api/auth`)
| Endpoint | Rate Limit | Security |
|----------|-----------|---------|
| POST /register | 3/min | PBKDF2 hash + AES OTP + record hash |
| POST /login | 5/min | PBKDF2 verify + device FP + account lock |
| POST /verify-otp | 5/min | TOTP RFC 6238 verify |
| POST /logout | 20/min | Session invalidation |
| GET /me | 60/min | JWT + record hash verify |

### Orders (`/api/orders`)
| Endpoint | Security |
|----------|---------|
| POST / | Luhn + AES encrypt + fraud 3-layer + SHA-256 hashes |
| GET /{id}/verify | Dual hash verification (record + integrity) |

### Crypto Demo (`/api/crypto`)
11 demo endpoints for CCS presentation:
`/encrypt` · `/decrypt` · `/hash` · `/record-hash` · `/hash-password` ·
`/verify-password` · `/generate-otp` · `/verify-otp` · `/tokenize` · `/luhn-check` · `/fraud-predict`

---

## 9. CO Mapping

| CO | Security Goal | Implementation |
|----|--------------|---------------|
| CO1 | Secure authentication | PBKDF2 + TOTP + RBAC + account lockout |
| CO2 | Data confidentiality & integrity | AES-256-GCM + SHA-256 hashes + PCI DSS |
| CO3 | Secure communication | JWT + session management + security headers + rate limiting |
| CO4 | Fraud & tamper detection | Isolation Forest + rule engine + device FP + record hash |

---

## 10. Running the Project

### Backend
```bash
cd secure-ecommerce/backend
pip3 install -r requirements.txt
python3 -m uvicorn main:app --reload
# API docs: http://localhost:8000/docs
```

### Convex (keep running in background)
```bash
cd secure-ecommerce/convex
npx convex dev
# Then seed sample data:
npx convex run seed:seedAll
```

### Frontend
```bash
cd secure-ecommerce/frontend
npm install
npm run dev
# UI: http://localhost:5173
```

### Demo Accounts
| Email | Password | Role |
|-------|---------|------|
| admin@secureshop.com | Admin@123 | admin |
| neal@secureshop.com | Neal@123 | customer |

---

## 11. Key Files Reference

```
backend/core/security.py          ← ALL crypto functions (7 modules)
backend/services/fraud_service.py ← 3-layer fraud detection
backend/services/auth_service.py  ← register/login/MFA flow
backend/services/order_service.py ← payment + integrity + fraud pipeline
backend/ml/train_model.py         ← Isolation Forest training
backend/ml/predict.py             ← ML inference
convex/schema.ts                  ← Database schema (6 collections)
convex/seed.ts                    ← Sample data seeding
```

---

*Project built for CCS subject — Shah & Anchor Kutchhi Engineering College, Mumbai*
*All cryptographic implementations follow NIST, OWASP, and PCI DSS standards*
