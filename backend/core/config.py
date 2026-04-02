from __future__ import annotations
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    CONVEX_URL: str = "https://acoustic-clownfish-225.convex.cloud"
    CONVEX_SITE_URL: str = "https://acoustic-clownfish-225.convex.site"
    JWT_SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    SESSION_TIMEOUT_MINUTES: int = 30
    AES_KEY_BASE64: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,https://secureshop-neal.vercel.app,https://secure-shop-lake.vercel.app"
    ML_MODEL_PATH: str = "ml/fraud_model.pkl"
    ML_SCALER_PATH: str = "ml/scaler.pkl"
    OTP_ISSUER: str = "SecureECommerce"
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCK_MINUTES: int = 15

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
