from core.database import _encrypt_doc, NON_ENCRYPTED_KEYS
print("NON_ENCRYPTED_KEYS:", NON_ENCRYPTED_KEYS)
print("Result:", _encrypt_doc({"name": "Test", "record_hash": "abcd"}))
