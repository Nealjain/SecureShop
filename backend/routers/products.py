from fastapi import APIRouter, Request, Depends, HTTPException
from core.database import get_db
from core.dependencies import require_admin
from core.security import compute_record_hash, verify_record_hash
from core.middleware import limiter
from models.product import ProductCreate
from services.integrity_service import verify_document_on_read
from datetime import datetime

router = APIRouter(prefix="/api/products", tags=["products"])

def serialize_product(p: dict) -> dict:
    return {
        "id": p.get("_id", ""),
        "name": p["name"],
        "price": p["price"],
        "category": p["category"],
        "description": p["description"],
        "stock": p["stock"],
        "image": p.get("image", "📦"),
        "integrity_status": p.get("_integrity_status", "unknown")
    }

@router.get("")
@limiter.limit("100/minute")
async def list_products(request: Request, db=Depends(get_db)):
    """List all products with integrity verification."""
    products_cursor = db.products.find({})
    products = await products_cursor.to_list(length=None)
    result = []
    for p in products:
        # Inline hash check — no extra HTTP call per product
        p["_integrity_status"] = "ok" if verify_record_hash(p) else "tampered"
        result.append(serialize_product(p))
    return result

@router.get("/{product_id}")
@limiter.limit("100/minute")
async def get_product(request: Request, product_id: str, db=Depends(get_db)):
    """Get single product with integrity check."""
    try:
        p = await db.products.find_one({"_id": product_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p["_integrity_status"] = "ok" if verify_record_hash(p) else "tampered"
    return serialize_product(p)

@router.post("")
@limiter.limit("10/minute")
async def create_product(request: Request, body: ProductCreate,
                          admin=Depends(require_admin), db=Depends(get_db)):
    """Create product (admin only)."""
    doc = {**body.model_dump(), "created_at": datetime.utcnow()}
    doc["record_hash"] = compute_record_hash(doc)
    result = await db.products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_product(doc)

@router.put("/{product_id}")
@limiter.limit("10/minute")
async def update_product(request: Request, product_id: str, body: ProductCreate,
                          admin=Depends(require_admin), db=Depends(get_db)):
    """Update product and recompute record hash (admin only)."""
    existing = await db.products.find_one({"_id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = {**body.model_dump(), "created_at": existing.get("created_at", datetime.utcnow().isoformat())}
    update_data["record_hash"] = compute_record_hash(update_data)
    await db.products.update_one({"_id": product_id}, {"$set": update_data})
    update_data["_id"] = product_id
    return serialize_product(update_data)

@router.delete("/{product_id}")
@limiter.limit("5/minute")
async def delete_product(request: Request, product_id: str,
                          admin=Depends(require_admin), db=Depends(get_db)):
    """Delete product (admin only)."""
    result = await db.products.delete_one({"_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}
