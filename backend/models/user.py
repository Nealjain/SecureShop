from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    mfa_enabled: bool
    created_at: datetime
    integrity_status: Optional[str] = None

class OTPVerify(BaseModel):
    partial_token: str
    otp_code: str

class EnableMFA(BaseModel):
    otp_code: str
