from datetime import datetime

def _parse_ts(ts) -> datetime:
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts)
        except Exception:
            pass
    return datetime.utcnow()

def extract_features(order: dict, user_history: list) -> dict:
    """Extract 8 numerical features for ML model input."""
    now = datetime.utcnow()
    total_qty = sum(i["qty"] for i in order["items"])
    avg_val = (sum(o["total"] for o in user_history) / len(user_history)) if user_history else 0

    orders_7d = sum(
        1 for o in user_history
        if (now - _parse_ts(o.get("timestamp", now))).days <= 7
    )
    orders_5min = sum(
        1 for o in user_history
        if (now - _parse_ts(o.get("timestamp", now))).total_seconds() <= 300
    )
    return {
        "transaction_amount":   float(order["total"]),
        "hour_of_day":          int(now.hour),
        "items_count":          int(total_qty),
        "user_order_count_7d":  int(orders_7d),
        "avg_order_value_user": float(avg_val),
        "amount_vs_avg_ratio":  float(order["total"] / avg_val) if avg_val > 0 else 1.0,
        "is_high_value":        float(order["total"] > 50000),
        "orders_last_5min":     int(orders_5min),
    }
