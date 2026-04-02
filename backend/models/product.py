from pydantic import BaseModel
from typing import Optional

class ProductCreate(BaseModel):
    name: str
    price: float
    category: str
    description: str
    stock: int
    image: Optional[str] = "📦"

class ProductResponse(BaseModel):
    id: str
    name: str
    price: float
    category: str
    description: str
    stock: int
    image: Optional[str]
    integrity_status: Optional[str] = None
