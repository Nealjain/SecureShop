import asyncio
import os
from core.database import connect_db, close_db, get_db
from core.security import compute_record_hash

async def rehash():
    await connect_db()
    db = get_db()
    
    collections = ['users', 'products', 'orders', 'sessions', 'token_vault', 'audit_logs']
    for coll in collections:
        cursor = await getattr(db, coll).find({})
        items = await cursor.to_list(length=None)
        print(f"Migrating {coll}: {len(items)} items")
        for item in items:
            c_id = item.pop('_id')
            item.pop('_creationTime', None) # Let's ignore this from updates since it's managed by Convex
            
            new_hash = compute_record_hash(item)
            try:
                await getattr(db, coll)._mutation("update", {"id": c_id, "fields": {"record_hash": new_hash}})
            except Exception as e:
                print(f"Error updating {c_id} in {coll}: {e}")

    await close_db()
    print("Rehash completed successfully")

if __name__ == "__main__":
    asyncio.run(rehash())
