import sys

with open('/Users/nealmanawat/Developer/E /secure-ecommerce/backend/core/database.py', 'r') as f:
    text = f.read()

import re
# Find the old enc_dec_block and replace it
# The old block starts at `def _encrypt_value(val):` and ends before `def _serialize`
# Let's just use regex to replace everything from `def _encrypt_value` up to `class InsertResult`

new_block = """
NON_ENCRYPTED_KEYS = {"_id", "record_hash", "_creationTime", "_table", "user_id", "product_id"}
BLIND_INDEX_KEYS = {"email", "token", "token_hash", "email_hash", "timestamp"}

def _encrypt_doc(doc: dict) -> dict:
    from core.security import sha256_hex, encrypt_aes
    import json
    res = {}
    packed_data = {}
    for k, v in doc.items():
        if k in NON_ENCRYPTED_KEYS or str(k).endswith("_hash"):
            res[k] = v
        else:
            if k in BLIND_INDEX_KEYS:
                res[f"{k}_hash"] = sha256_hex(str(v).lower())
            packed_data[k] = v

    # The requested constraint: "+" concatenation formatted string!
    parts = []
    for k, v in sorted(packed_data.items()):
        val_str = json.dumps(v, separators=(',', ':')) if not isinstance(v, str) else v
        parts.append(f"{k}={val_str}")
    payload = "+".join(parts)
    
    # Pack it entirely into the 'data' column
    res["data"] = encrypt_aes(payload)
    return res

def _decrypt_doc(doc: dict) -> dict:
    from core.security import decrypt_aes
    import json
    if not doc: return doc
    res = {}
    for k, v in doc.items():
        if k == "data":
            try:
                dec = decrypt_aes(v)
                for part in dec.split("+"):
                    if "=" in part:
                        pk, pv = part.split("=", 1)
                        try:
                            # if it starts with [ or { or number
                            res[pk] = json.loads(pv)
                        except Exception:
                            res[pk] = pv
            except Exception:
                pass
        elif k.endswith("_hash"):
            continue # drop index fields gracefully
        elif k in NON_ENCRYPTED_KEYS:
            res[k] = v
    return res

"""
# We will replace from `def _encrypt_value` to `def _decrypt_doc(doc: dict) -> dict: ... return res`
# Let's just do it manually with simple strings, avoiding regex issues since code is multiline.
start_idx = text.find('def _encrypt_value')
end_idx = text.find('def _serialize')

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_block + text[end_idx:]
else:
    print("Could not find the block to replace!")

with open('/Users/nealmanawat/Developer/E /secure-ecommerce/backend/core/database.py', 'w') as f:
    f.write(text)
