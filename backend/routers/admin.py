from fastapi import APIRouter, Request, Depends
from core.database import get_db
from core.dependencies import require_admin
from core.security import verify_record_hash, compute_record_hash
from core.middleware import limiter
from services.integrity_service import run_full_integrity_report
from services.session_service import invalidate_all_user_sessions

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/promote")
async def promote_to_admin(request: Request, db=Depends(get_db)):
    """Bootstrap: promote admin@secureshop.com to admin role. One-time use."""
    user = await db.users.find_one({"email": "admin@secureshop.com"})
    if not user:
        return {"error": "admin@secureshop.com not found — register first"}
    if user.get("role") == "admin":
        return {"message": "Already admin"}
    merged = {k: v for k, v in user.items() if k not in ("_id", "_creationTime")}
    merged["role"] = "admin"
    merged["record_hash"] = compute_record_hash({k: v for k, v in merged.items() if k != "record_hash"})
    await db.users.update_one({"_id": user["_id"]}, {"$set": merged})
    return {"message": "admin@secureshop.com promoted to admin ✅"}


@router.get("/users")
@limiter.limit("30/minute")
async def list_users(request: Request, admin=Depends(require_admin), db=Depends(get_db)):
    """All users with record hash status."""
    cursor = db.users.find({})
    users = await cursor.to_list(length=None)
    return [{
        "id": u.get("_id", ""),
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "role": u.get("role", "customer"),
        "mfa_enabled": u.get("mfa_enabled", False),
        "failed_login_attempts": u.get("failed_login_attempts", 0),
        "created_at": u.get("created_at"),
        "last_login": u.get("last_login"),
        "integrity_status": "ok" if verify_record_hash(u) else "tampered"
    } for u in users]


@router.get("/orders")
@limiter.limit("30/minute")
async def list_all_orders(request: Request, admin=Depends(require_admin), db=Depends(get_db)):
    """All orders with fraud scores and integrity status."""
    cursor = db.orders.find({})
    orders = await cursor.to_list(length=None)
    return [{
        "id": o.get("_id", ""),
        "user_id": o.get("user_id", ""),
        "total": o.get("total", 0),
        "status": o.get("status", ""),
        "card_last4": o.get("card_last4"),
        "fraud_result": o.get("fraud_result"),
        "timestamp": o.get("timestamp"),
        "integrity_status": "ok" if verify_record_hash(o) else "tampered"
    } for o in orders]


@router.get("/audit-logs")
@limiter.limit("30/minute")
async def get_audit_logs(request: Request, limit: int = 100,
                          admin=Depends(require_admin), db=Depends(get_db)):
    """Full audit trail, most recent first."""
    cursor = db.audit_logs.find({})
    logs = await cursor.sort("timestamp", -1).limit(limit).to_list(length=None)
    return [{
        "id": l.get("_id", ""),
        "action": l.get("action", ""),
        "user_id": l.get("user_id"),
        "details": l.get("details", ""),
        "ip": l.get("ip"),
        "risk_level": l.get("risk_level", "low"),
        "timestamp": l.get("timestamp"),
        "integrity_status": "ok" if verify_record_hash(l) else "tampered"
    } for l in logs]


@router.get("/stats")
@limiter.limit("30/minute")
async def get_stats(request: Request, admin=Depends(require_admin), db=Depends(get_db)):
    """Dashboard counts."""
    return {
        "total_users":     await db.users.count_documents({}),
        "total_orders":    await db.orders.count_documents({}),
        "total_products":  await db.products.count_documents({}),
        "flagged_orders":  await db.orders.count_documents({"status": "flagged"}),
        "active_sessions": await db.sessions.count_documents({"is_active": True}),
        "audit_log_count": await db.audit_logs.count_documents({}),
    }


@router.get("/integrity-report")
@limiter.limit("5/minute")
async def integrity_report(request: Request, admin=Depends(require_admin), db=Depends(get_db)):
    """Scan ALL documents in ALL 6 collections for tamper detection."""
    return await run_full_integrity_report(db)


@router.delete("/sessions/{user_id}")
@limiter.limit("10/minute")
async def invalidate_user_sessions(request: Request, user_id: str,
                                    admin=Depends(require_admin), db=Depends(get_db)):
    """Force-invalidate all sessions for a user."""
    count = await invalidate_all_user_sessions(db, user_id)
    return {"message": f"Invalidated {count} sessions for user {user_id}"}


@router.get("/orders/{order_id}")
@limiter.limit("30/minute")
async def get_order_detail(request: Request, order_id: str,
                            admin=Depends(require_admin), db=Depends(get_db)):
    """Full order detail for admin."""
    o = await db.orders.find_one({"_id": order_id})
    if not o:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "id": o.get("_id", ""),
        "user_id": o.get("user_id", ""),
        "items": o.get("items", []),
        "total": o.get("total", 0),
        "status": o.get("status", ""),
        "card_last4": o.get("card_last4"),
        "card_brand": o.get("card_brand"),
        "payment_token": o.get("payment_token"),
        "address": o.get("address") or o.get("user_info"),
        "fraud_result": o.get("fraud_result"),
        "integrity_hash": o.get("integrity_hash"),
        "timestamp": o.get("timestamp"),
        "ip_address": o.get("ip_address"),
        "integrity_status": "ok" if verify_record_hash(o) else "tampered"
    }


@router.patch("/orders/{order_id}/status")
@limiter.limit("20/minute")
async def update_order_status(request: Request, order_id: str,
                               admin=Depends(require_admin), db=Depends(get_db)):
    """Update order status (confirm/flag/cancel)."""
    from fastapi import HTTPException
    from pydantic import BaseModel
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ("confirmed", "flagged", "cancelled", "shipped", "delivered"):
        raise HTTPException(status_code=400, detail="Invalid status")
    o = await db.orders.find_one({"_id": order_id})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    from core.security import compute_record_hash
    from services.audit_service import log_audit
    await db.orders.update_one({"_id": order_id}, {"$set": {"status": new_status}})
    await log_audit(db, "ORDER_STATUS_UPDATED", admin["user_id"],
                    f"Order {order_id} status → {new_status}", risk_level="low")
    return {"message": f"Order status updated to {new_status}", "order_id": order_id, "status": new_status}
