from __future__ import annotations
from datetime import datetime
from fastapi import HTTPException
from core.security import (generate_order_integrity_hash, verify_order_integrity_hash,
                            compute_record_hash, verify_record_hash)
from services.token_vault_service import tokenize_card
from services.fraud_service import detect_fraud_full
from services.audit_service import log_audit

async def place_order(db, user_id: str, items: list, card_data: dict, user_info: dict,
                      ip: str, device_fp: str) -> dict:
    # Validate products and compute total
    order_items = []
    total = 0.0
    for item in items:
        product = await db.products.find_one({"_id": item["product_id"]})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")
        if product["stock"] < item["qty"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        line_total = product["price"] * item["qty"]
        total += line_total
        order_items.append({
            "product_id": item["product_id"],
            "name": product["name"],
            "price": product["price"],
            "qty": item["qty"],
            "line_total": line_total
        })

    # Step 5 — Tokenize card
    try:
        vault_result = await tokenize_card(
            db, user_id,
            card_data["card_number"], card_data["cvv"],
            card_data["expiry"], card_data.get("card_brand", "Unknown")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Step 6 — Build order document
    now = datetime.utcnow()
    order_doc = {
        "user_id":       user_id,
        "items":         order_items,
        "total":         total,
        "payment_token": vault_result["token"],
        "card_last4":    vault_result["card_last4"],
        "card_brand":    vault_result["card_brand"],
        "user_info":     user_info,
        "status":        "pending",
        "timestamp":     now.isoformat(),
        "ip_address":    ip,
        "device_fp":     device_fp,
    }

    # Integrity hash (canonical order hash)
    order_doc["integrity_hash"] = generate_order_integrity_hash({
        **order_doc, "user_id": user_id, "order_id": "pending"
    })

    # Step 7 — Fraud detection
    user = await db.users.find_one({"_id": user_id})
    user_history_cursor = db.orders.find({"user_id": user_id})
    user_history = await user_history_cursor.to_list(length=100)

    fraud_result = await detect_fraud_full(
        order={"total": total, "items": order_items},
        user_history=user_history,
        current_ip=ip,
        current_device=device_fp,
        user_known_ips=user.get("known_ips", []),
        user_known_devices=user.get("known_devices", [])
    )

    order_doc["status"] = "flagged" if fraud_result["is_fraudulent"] else "confirmed"
    order_doc["fraud_result"] = fraud_result

    # Step 8 — Compute record hash and store
    order_doc["record_hash"] = compute_record_hash(order_doc)
    result = await db.orders.insert_one(order_doc)
    order_id = result.inserted_id

    # Recompute integrity hash with real order_id
    final_integrity_hash = generate_order_integrity_hash({
        **order_doc, "user_id": user_id, "order_id": order_id
    })
    order_doc["integrity_hash"] = final_integrity_hash
    order_doc["record_hash"] = compute_record_hash({k: v for k, v in order_doc.items()})
    await db.orders.update_one({"_id": order_id}, {
        "$set": {"integrity_hash": final_integrity_hash, "record_hash": order_doc["record_hash"]}
    })

    # Reduce stock
    for item in items:
        product = await db.products.find_one({"_id": item["product_id"]})
        if product:
            await db.products.update_one(
                {"_id": item["product_id"]},
                {"$inc": {"stock": -item["qty"]}}
            )

    action = "ORDER_FLAGGED" if fraud_result["is_fraudulent"] else "ORDER_PLACED"
    risk = "high" if fraud_result["is_fraudulent"] else "low"
    await log_audit(db, action, user_id,
                    f"Order {order_id} | Total: ₹{total:.0f} | Risk: {fraud_result['risk_level']}",
                    ip=ip, device_fp=device_fp, risk_level=risk)

    return {
        "order_id":       order_id,
        "integrity_hash": final_integrity_hash,
        "fraud_result":   fraud_result,
        "payment_token":  vault_result["token"],
        "card_last4":     vault_result["card_last4"],
        "status":         order_doc["status"],
        "total":          total,
    }

async def verify_order_integrity(db, order_id: str, user_id: str) -> dict:
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    record_hash_valid = verify_record_hash(order)
    integrity_hash_valid = verify_order_integrity_hash(
        {**order, "user_id": user_id, "order_id": order_id},
        order.get("integrity_hash", "")
    )
    overall = "VALID" if (record_hash_valid and integrity_hash_valid) else "TAMPERED"
    return {
        "order_id":            order_id,
        "record_hash_valid":   record_hash_valid,
        "integrity_hash_valid": integrity_hash_valid,
        "overall_status":      overall,
    }
