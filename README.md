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

## Deployment (Vercel)

The project is structured as a monorepo and is **Vercel-ready**. The root `vercel.json` coordinates the frontend build and the Python backend functions.

### 1. Push to GitHub
If you haven't already:
```bash
git add .
git commit -m "initial vercel setup"
git push origin main
```

### 2. Import to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Select the repository.
3. Keep the **Root Directory** as the repository root (not `frontend` or `backend`).
4. Vercel will automatically detect the root `vercel.json`.

### 3. Add Environment Variables
In the Vercel UI, add:
- `CONVEX_URL`: The URL of your production Convex instance.
- `CONVEX_SITE_URL`: The Site URL of your production Convex instance.
- `JWT_SECRET_KEY`: A random secure string for JWT tokens.
- `AES_KEY_BASE64`: A base64 encoded AES key for card encryption.
- `CORS_ORIGINS`: `https://YOUR_VERCEL_DOMAIN.vercel.app`

### 4. Deploy
Vercel will build the Vite frontend and deploy the Python backend as serverless functions.
For the **Convex** backend, ensure you run `npx convex deploy` (or `npx convex dev` for preview) to set up your production database.

---
See `PRESENTATION.md` for full technical documentation.
