from fastapi import APIRouter, Request, Depends, HTTPException
from core.database import get_db
from core.dependencies import get_current_user
from core.security import compute_device_fingerprint
from core.middleware import limiter
from models.order import OrderCreate
from services.order_service import place_order, verify_order_integrity
from services.integrity_service import verify_document_on_read

router = APIRouter(prefix="/api/orders", tags=["orders"])

def get_client_info(request: Request):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    lang = request.headers.get("accept-language", "")
    return ip, compute_device_fingerprint(ua, ip, lang)

def serialize_order(o: dict) -> dict:
    return {
        "id": o.get("_id", ""),
        "user_id": o.get("user_id", ""),
        "items": o["items"],
        "total": o["total"],
        "status": o["status"],
        "payment_token": o.get("payment_token", ""),
        "card_last4": o.get("card_last4", ""),
        "integrity_hash": o.get("integrity_hash", ""),
        "fraud_result": o.get("fraud_result"),
        "created_at": o.get("timestamp"),
        "integrity_status": o.get("_integrity_status", "unknown")
    }

@router.post("")
@limiter.limit("10/minute")
async def create_order(request: Request, body: OrderCreate,
                        current_user=Depends(get_current_user), db=Depends(get_db)):
    """Place a new order — tokenize card, run fraud detection, store with hashes."""
    ip, device_fp = get_client_info(request)
    return await place_order(
        db, current_user["user_id"],
        [item.model_dump() for item in body.items],
        body.card_data.model_dump(),
        body.address.model_dump(),
        ip, device_fp
    )

@router.get("")
@limiter.limit("30/minute")
async def list_orders(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """List current user's orders with integrity check."""
    orders_cursor = db.orders.find({"user_id": current_user["user_id"]})
    orders = await orders_cursor.to_list(length=None)
    result = []
    for o in orders:
        o = await verify_document_on_read(o, "orders", db)
        result.append(serialize_order(o))
    return result

@router.get("/{order_id}")
@limiter.limit("30/minute")
async def get_order(request: Request, order_id: str,
                     current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get single order with both hash verifications."""
    try:
        o = await db.orders.find_one({"_id": order_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if o.get("user_id") != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    o = await verify_document_on_read(o, "orders", db)
    return serialize_order(o)

@router.get("/{order_id}/verify")
@limiter.limit("10/minute")
async def verify_order(request: Request, order_id: str,
                        current_user=Depends(get_current_user), db=Depends(get_db)):
    """Run full integrity verification on an order (both record hash + integrity hash)."""
    return await verify_order_integrity(db, order_id, current_user["user_id"])
