"""
Convex database client — single encrypted column architecture.

Every sensitive table (users, orders, sessions, token_vault, audit_logs) stores
ALL fields as a single AES-256-GCM encrypted `data` column. Nothing is readable
in the Convex dashboard without the AES key.

products → plain fields (public catalogue data, no encryption needed).

Lookup strategy for encrypted tables:
  - Fetch all rows, decrypt each, filter in Python.
  - For large tables (orders) filter by user_id is done after decrypt.
  - This is acceptable for a CCS demo with hundreds of records.
"""
from __future__ import annotations
import json, httpx
from datetime import datetime
from core.config import settings

CONVEX_URL = settings.CONVEX_URL
_client: httpx.AsyncClient = None

# Tables that use single encrypted `data` column
ENCRYPTED_TABLES = {"users", "orders", "sessions", "token_vault", "audit_logs"}


# ── Crypto ───────────────────────────────────────────────────

def _encrypt(payload: dict) -> str:
    """Serialize dict to JSON then AES-256-GCM encrypt. Returns iv_hex:ct_hex."""
    from core.security import encrypt_aes
    return encrypt_aes(json.dumps(payload, default=str, separators=(",", ":")))

def _decrypt(data: str) -> dict:
    """AES-256-GCM decrypt and JSON parse back to dict."""
    from core.security import decrypt_aes
    return json.loads(decrypt_aes(data))


# ── Serialization ────────────────────────────────────────────

def _clean(doc: dict) -> dict:
    """Drop _id, convert datetimes, drop None values."""
    result = {}
    for k, v in doc.items():
        if k == "_id": continue
        if v is None: continue
        if isinstance(v, datetime): result[k] = v.isoformat()
        elif isinstance(v, dict): result[k] = _clean(v)
        elif isinstance(v, list):
            result[k] = [_clean(i) if isinstance(i, dict)
                         else (i.isoformat() if isinstance(i, datetime) else i)
                         for i in v]
        else: result[k] = v
    return result


# ── Lifecycle ────────────────────────────────────────────────

async def connect_db():
    global _client
    _client = httpx.AsyncClient(base_url=CONVEX_URL, timeout=30.0)
    print("✅ Convex ready — AES-256-GCM single-column encryption active")
    try:
        await seed_if_empty()
    except Exception as e:
        print(f"⚠️  Seed skipped: {e}")

async def close_db():
    global _client
    if _client:
        await _client.aclose()

def get_db() -> "ConvexDB":
    return ConvexDB(_client)


# ── DB wrapper ───────────────────────────────────────────────

class ConvexDB:
    def __init__(self, client: httpx.AsyncClient):
        self._c = client

    def __getattr__(self, collection: str) -> "ConvexCollection":
        return ConvexCollection(self._c, collection)


class ConvexCollection:
    def __init__(self, client: httpx.AsyncClient, collection: str):
        self._c = client
        self._col = collection
        self._encrypted = collection in ENCRYPTED_TABLES

    # ── Convex HTTP ──────────────────────────────────────────

    async def _q(self, fn: str, args: dict = {}):
        r = await self._c.post("/api/query", json={
            "path": f"{self._col}:{fn}", "args": args, "format": "json"
        })
        d = r.json()
        if d.get("status") == "error":
            raise RuntimeError(f"[{self._col}:{fn}] {d.get('errorMessage')}")
        return d["value"]

    async def _m(self, fn: str, args: dict = {}):
        r = await self._c.post("/api/mutation", json={
            "path": f"{self._col}:{fn}", "args": args, "format": "json"
        })
        d = r.json()
        if d.get("status") == "error":
            raise RuntimeError(f"[{self._col}:{fn}] {d.get('errorMessage')}")
        return d["value"]

    # ── Decrypt helper ───────────────────────────────────────

    def _dec(self, row: dict) -> dict:
        """Decrypt a Convex row — merge _id back in, decrypt data field."""
        if not self._encrypted or not row:
            return row
        try:
            payload = _decrypt(row["data"])
            payload["_id"] = row["_id"]
            return payload
        except Exception:
            return {"_id": row["_id"], "_decrypt_error": True}

    # ── Public API ───────────────────────────────────────────

    async def find_one(self, filter: dict):
        rows = await self._q("list", {})
        if not rows:
            return None
        for row in rows:
            doc = self._dec(row)
            if _matches(doc, filter):
                return doc
        return None

    def find(self, filter: dict) -> "ConvexCursor":
        return ConvexCursor(self._c, self._col, filter, self._encrypted)

    async def insert_one(self, doc: dict) -> "InsertResult":
        cleaned = _clean(doc)
        if self._encrypted:
            inserted_id = await self._m("create", {"data": _encrypt(cleaned)})
        else:
            inserted_id = await self._m("create", cleaned)
        return InsertResult(inserted_id)

    async def update_one(self, filter: dict, update: dict):
        doc = await self.find_one(filter)
        if not doc:
            return
        doc_id = doc["_id"]

        set_fields = dict(update.get("$set", {}))
        for k, v in update.get("$inc", {}).items():
            set_fields[k] = (doc.get(k) or 0) + v
        if not set_fields:
            return

        if self._encrypted:
            # Merge into full doc, re-encrypt, recompute record_hash
            merged = {k: v for k, v in doc.items() if k not in ("_id", "_creationTime")}
            merged.update(set_fields)
            # Always recompute record_hash on the merged doc
            from core.security import compute_record_hash
            merged_for_hash = {k: v for k, v in merged.items() if k != "record_hash"}
            merged["record_hash"] = compute_record_hash(merged_for_hash)
            await self._m("update", {"id": doc_id, "data": _encrypt(_clean(merged))})
        else:
            await self._m("update", {"id": doc_id, "fields": _clean(set_fields)})

    async def update_many(self, filter: dict, update: dict):
        rows = await self._q("list", {})
        count = 0
        for row in (rows or []):
            doc = self._dec(row)
            if _matches(doc, filter):
                set_fields = dict(update.get("$set", {}))
                merged = {k: v for k, v in doc.items() if k not in ("_id", "_creationTime")}
                merged.update(set_fields)
                await self._m("update", {"id": doc["_id"], "data": _encrypt(_clean(merged))})
                count += 1
        return UpdateResult(count)

    async def delete_one(self, filter: dict) -> "DeleteResult":
        doc = await self.find_one(filter)
        if doc:
            await self._m("remove", {"id": doc["_id"]})
            return DeleteResult(1)
        return DeleteResult(0)

    async def count_documents(self, filter: dict) -> int:
        if not filter:
            return await self._q("count", {})
        # For filtered counts, decrypt and count
        rows = await self._q("list", {})
        if not rows:
            return 0
        return sum(1 for r in rows if _matches(self._dec(r), filter))

    async def create_index(self, *args, **kwargs):
        pass  # Indexes defined in schema.ts


def _matches(doc: dict, filter: dict) -> bool:
    """Check if a decrypted doc matches a filter dict."""
    for k, v in filter.items():
        if doc.get(k) != v:
            return False
    return True


class ConvexCursor:
    def __init__(self, client, collection, filter, encrypted):
        self._c = client
        self._col = collection
        self._filter = filter
        self._encrypted = encrypted
        self._sort_field = None
        self._sort_dir = 1
        self._limit_val = None

    def sort(self, field, direction):
        self._sort_field = field
        self._sort_dir = direction
        return self

    def limit(self, n):
        self._limit_val = n
        return self

    async def to_list(self, length=None) -> list:
        col = ConvexCollection(self._c, self._col)
        rows = await col._q("list", {})
        if not rows:
            return []

        results = []
        for row in rows:
            doc = col._dec(row)
            if _matches(doc, self._filter):
                results.append(doc)

        if self._sort_field:
            results.sort(key=lambda x: x.get(self._sort_field, ""),
                         reverse=(self._sort_dir == -1))

        cap = length or self._limit_val
        return results[:cap] if cap else results


class InsertResult:
    def __init__(self, i): self.inserted_id = i

class UpdateResult:
    def __init__(self, c): self.modified_count = c

class DeleteResult:
    def __init__(self, c): self.deleted_count = c


# ── Seeding ──────────────────────────────────────────────────

async def seed_if_empty():
    from core.security import hash_password, compute_record_hash, generate_otp_secret_encrypted

    db = get_db()
    if await db.users.count_documents({}) == 0:
        for name, email, password, role in [
            ("Admin User", "admin@secureshop.com", "Admin@123", "admin"),
            ("Neal Jain",  "neal@secureshop.com",  "Neal@123",  "customer"),
        ]:
            _, enc_secret = generate_otp_secret_encrypted()
            doc = {
                "name": name, "email": email,
                "password_hash": hash_password(password),
                "role": role, "mfa_enabled": False,
                "otp_secret_encrypted": enc_secret,
                "failed_login_attempts": 0,
                "known_ips": [], "known_devices": [],
                "created_at": datetime.utcnow().isoformat(),
            }
            doc["record_hash"] = compute_record_hash(doc)
            await db.users.insert_one(doc)
        print("✅ Users seeded — all fields AES-256-GCM encrypted in Convex")
