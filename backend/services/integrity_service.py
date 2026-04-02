from __future__ import annotations
from core.security import verify_record_hash
from services.audit_service import log_audit

async def verify_document_on_read(document: dict, collection_name: str, db) -> dict:
    if "record_hash" not in document:
        document["_integrity_status"] = "missing_hash"
        return document
    if verify_record_hash(document):
        document["_integrity_status"] = "ok"
    else:
        document["_integrity_status"] = "tampered"
        await log_audit(db, "TAMPER_DETECTED", None,
            f"Collection: {collection_name} | Doc ID: {document.get('_id')} | Hash mismatch",
            risk_level="critical")
    return document

async def run_full_integrity_report(db) -> dict:
    """Scan all documents in all 6 Convex collections."""
    report = {"total_documents": 0, "total_tampered": 0, "collections": {}}

    collection_fetchers = {
        "users":       lambda: db.users.find({}),
        "products":    lambda: db.products.find({}),
        "orders":      lambda: db.orders.find({}),
        "sessions":    lambda: db.sessions.find({}),
        "token_vault": lambda: db.token_vault.find({}),
        "audit_logs":  lambda: db.audit_logs.find({}),
    }

    for coll_name, fetcher in collection_fetchers.items():
        try:
            cursor = fetcher()
            docs = await cursor.to_list(length=None)
            tampered_ids = [str(d.get("_id", "?")) for d in docs if not verify_record_hash(d)]
            report["collections"][coll_name] = {
                "total": len(docs),
                "tampered": len(tampered_ids),
                "tampered_ids": tampered_ids,
                "status": "CLEAN" if not tampered_ids else "COMPROMISED"
            }
            report["total_documents"] += len(docs)
            report["total_tampered"] += len(tampered_ids)
        except Exception as e:
            report["collections"][coll_name] = {"error": str(e), "status": "ERROR"}

    report["overall_status"] = "CLEAN" if report["total_tampered"] == 0 else "COMPROMISED"
    return report
