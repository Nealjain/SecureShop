from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class OrderItem(BaseModel):
    product_id: str
    qty: int
    price: float

class CardData(BaseModel):
    card_number: str
    cvv: str
    expiry: str
    card_brand: Optional[str] = "Unknown"

class Address(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = ""
    city: str
    state: str
    pincode: str

class OrderCreate(BaseModel):
    items: List[OrderItem]
    card_data: CardData
    address: Address

class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: List[Dict[str, Any]]
    total: float
    status: str
    payment_token: str
    card_last4: str
    integrity_hash: str
    fraud_result: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    integrity_status: Optional[str] = None
