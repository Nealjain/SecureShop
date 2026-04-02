from __future__ import annotations
import json
from datetime import datetime
from core.security import (encrypt_aes, decrypt_aes, generate_payment_token,
                            compute_record_hash, verify_record_hash)

def luhn_check(card_number: str) -> bool:
    digits = [int(d) for d in card_number.replace(" ", "").replace("-", "") if d.isdigit()]
    digits.reverse()
    total = sum(
        d if i % 2 == 0 else (d * 2 - 9 if d * 2 > 9 else d * 2)
        for i, d in enumerate(digits)
    )
    return total % 10 == 0

async def tokenize_card(db, user_id: str, card_number: str, cvv: str,
                        expiry: str, card_brand: str = "Unknown") -> dict:
    if not luhn_check(card_number):
        raise ValueError("Invalid card number (Luhn check failed)")

    token = generate_payment_token()
    card_last4 = card_number.replace(" ", "").replace("-", "")[-4:]
    card_data = json.dumps({"card_number": card_number, "cvv": cvv,
                            "expiry": expiry, "brand": card_brand})
    encrypted_card = encrypt_aes(card_data)

    vault_entry = {
        "user_id":        user_id,
        "token":          token,
        "encrypted_card": encrypted_card,
        "card_last4":     card_last4,
        "card_brand":     card_brand,
        "expiry":         expiry,
        "created_at":     datetime.utcnow().isoformat(),
    }
    vault_entry["record_hash"] = compute_record_hash(vault_entry)
    await db.token_vault.insert_one(vault_entry)
    return {"token": token, "card_last4": card_last4, "card_brand": card_brand}

async def detokenize_card(db, token: str) -> dict:
    entry = await db.token_vault.find_one({"token": token})
    if not entry:
        raise ValueError("Token not found")
    if not verify_record_hash(entry):
        raise PermissionError("Vault record tamper detected — aborting detokenization")
    return json.loads(decrypt_aes(entry["encrypted_card"]))
