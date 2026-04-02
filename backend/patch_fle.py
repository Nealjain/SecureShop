import sys

with open('core/database.py', 'r') as f:
    text = f.read()

enc_dec_block = """
def _encrypt_value(val):
    from core.security import encrypt_aes
    import json
    if val is None: return None
    if isinstance(val, (int, float)): payload = f"NUM:{val}"
    elif isinstance(val, bool): payload = f"BOOL:{val}"
    elif isinstance(val, (dict, list)): payload = f"JSON:{json.dumps(val)}"
    else: payload = f"STR:{val}"
    return encrypt_aes(payload)

def _decrypt_value(val):
    from core.security import decrypt_aes
    import json
    if not isinstance(val, str) or ":" not in val: return val
    try:
        dec = decrypt_aes(val)
        if dec.startswith("NUM:"): return float(dec[4:]) if "." in dec else int(dec[4:])
        if dec.startswith("BOOL:"): return dec[5:] == "True"
        if dec.startswith("JSON:"): return json.loads(dec[5:])
        if dec.startswith("STR:"): return dec[4:]
        return dec
    except Exception:
        return val

NON_ENCRYPTED_KEYS = {"_id", "record_hash", "_creationTime", "user_id", "product_id"}
BLIND_INDEX_KEYS = {"email", "token"}

def _encrypt_doc(doc: dict) -> dict:
    from core.security import sha256_hex
    res = {}
    for k, v in doc.items():
        if k in NON_ENCRYPTED_KEYS or str(k).endswith("_hash"):
            res[k] = v
        else:
            if k in BLIND_INDEX_KEYS:
                res[f"{k}_hash"] = sha256_hex(str(v).lower())
            res[k] = _encrypt_value(v)
    return res

def _decrypt_doc(doc: dict) -> dict:
    if not doc: return doc
    res = {}
    for k, v in doc.items():
        if k.endswith("_hash") and k[:-5] in BLIND_INDEX_KEYS:
            continue
        if k in NON_ENCRYPTED_KEYS:
            res[k] = v
        else:
            res[k] = _decrypt_value(v)
    return res
"""

# inject at the top function
text = text.replace("def _serialize(doc: dict) -> dict:", enc_dec_block + "\n\ndef _serialize(doc: dict) -> dict:")

# Patch queries
text = text.replace('return await self._query("getByEmail", {"email": filter["email"]})', 
'''from core.security import sha256_hex
            result = await self._query("getByEmail", {"email_hash": sha256_hex(filter["email"].lower())})
            return _decrypt_doc(result)''')

text = text.replace('result = await self._query("getByToken", {"token": filter["token"]})',
'''from core.security import sha256_hex
            result = await self._query("getByToken", {"token_hash": sha256_hex(filter["token"].lower())})''')

text = text.replace('if result and "is_active" in filter and result.get("is_active") != filter["is_active"]:',
'''if result and "is_active" in filter and _decrypt_doc(result).get("is_active") != filter["is_active"]:''')

text = text.replace('return result', 'return _decrypt_doc(result)')

text = text.replace('return await self._query("getById", {"id": filter["_id"]})', 
'''result = await self._query("getById", {"id": filter["_id"]})
            return _decrypt_doc(result)''')

text = text.replace('clean = _serialize(doc)', 'clean = _encrypt_doc(_serialize(doc))')

text = text.replace('await self._mutation("update", {"id": doc["_id"], "fields": _serialize(fields)})',
'await self._mutation("update", {"id": doc["_id"], "fields": _encrypt_doc(_serialize(fields))})')

text = text.replace('results = await col._query("list", args)',
'''results = await col._query("list", args)
        if results:
            results = [_decrypt_doc(r) for r in results]''')

text = text.replace('results = await col._query("listByUser", {"user_id": str(uid)})',
'''results = await col._query("listByUser", {"user_id": str(uid)})
            if results:
                results = [_decrypt_doc(r) for r in results]''')

with open('core/database.py', 'w') as f:
    f.write(text)

print("FLE applied.")
