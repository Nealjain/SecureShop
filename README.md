# Secure E-Commerce — CCS Project

Shah & Anchor Kutchhi Engineering College, Mumbai
Neal Jain (29) · Vedant Kale (31) · Zeal Gori (26) · Harsh Bhanushali (06)

## Quick Start

### 1. Convex (run once, keep running)
```bash
cd secure-ecommerce/convex
npm install
npx convex dev
```
Then in a second terminal, seed sample data:
```bash
cd secure-ecommerce/convex
npx convex run seed:seedAll
```

### 2. Backend
```bash
cd secure-ecommerce/backend
pip3 install -r requirements.txt
python3 -m uvicorn main:app --reload
# API docs: http://localhost:8000/docs
```

### 3. Frontend
```bash
cd secure-ecommerce/frontend
npm install
npm run dev
# UI: http://localhost:5173
```

## Demo Accounts
- `admin@secureshop.com` / `Admin@123` — admin role
- `neal@secureshop.com` / `Neal@123` — customer role

## Security Features
| Feature | Algorithm |
|---------|-----------|
| Password Hashing | PBKDF2-HMAC-SHA256, 310,000 iterations |
| Card Encryption | AES-256-GCM |
| OTP Secret Storage | AES-256-GCM |
| Session Tokens | JWT HS256, 60 min |
| Multi-Factor Auth | TOTP RFC 6238 |
| Fraud Detection | Isolation Forest + 4 velocity rules + IP/device |
| Tamper Detection | SHA-256 record hash on every document |
| Rate Limiting | slowapi per-IP |
| Payment | PCI DSS tokenization + Luhn validation |

See `PRESENTATION.md` for full technical documentation.
