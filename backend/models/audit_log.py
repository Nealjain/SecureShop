from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogEntry(BaseModel):
    action: str
    user_id: Optional[str]
    details: str
    ip: Optional[str] = None
    device_fp: Optional[str] = None
    risk_level: str = "low"
    timestamp: datetime
