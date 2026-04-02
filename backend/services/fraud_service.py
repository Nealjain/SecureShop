from datetime import datetime, timedelta
from ml.predict import predict_fraud_ml
from ml.features import extract_features

def rule_engine(order: dict, user_history: list) -> dict:
    flags = []
    now = datetime.utcnow()

    if user_history:
        avg_order = sum(o["total"] for o in user_history) / len(user_history)
        if avg_order > 0 and order["total"] > avg_order * 3:
            flags.append(f"VELOCITY_AMOUNT: Order ₹{order['total']:.0f} is 3× above avg ₹{avg_order:.0f}")

    total_qty = sum(item["qty"] for item in order["items"])
    if total_qty > 10:
        flags.append(f"VELOCITY_QUANTITY: {total_qty} items ordered (threshold: 10)")

    five_min_ago = now - timedelta(minutes=5)
    recent = []
    for o in user_history:
        ts = o.get("timestamp")
        if ts:
            try:
                order_time = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
                if order_time >= five_min_ago:
                    recent.append(o)
            except Exception:
                pass
    if len(recent) >= 3:
        flags.append(f"VELOCITY_FREQUENCY: {len(recent)} orders in last 5 minutes")

    if order["total"] > 50000:
        flags.append(f"HIGH_VALUE: Transaction ₹{order['total']:.0f} exceeds ₹50,000 threshold")

    return {"flags": flags, "rule_risk_score": min(100, len(flags) * 25)}

def verify_identity_signals(current_ip: str, current_device: str,
                             user_known_ips: list, user_known_devices: list) -> dict:
    flags = []
    ip_known = current_ip in user_known_ips if user_known_ips else True
    device_known = current_device in user_known_devices if user_known_devices else True

    if not ip_known:
        flags.append(f"NEW_IP: Request from unrecognized IP {current_ip[:10]}***")
    if not device_known:
        flags.append("NEW_DEVICE: Request from unrecognized device fingerprint")
    if not ip_known and not device_known:
        flags.append("IDENTITY_MISMATCH: Both IP and device are new — high risk")

    identity_risk = 0
    if not ip_known: identity_risk += 20
    if not device_known: identity_risk += 20
    if not ip_known and not device_known: identity_risk += 30

    return {"flags": flags, "identity_risk_score": min(100, identity_risk)}

async def detect_fraud_full(order: dict, user_history: list,
                             current_ip: str, current_device: str,
                             user_known_ips: list, user_known_devices: list) -> dict:
    rule_result = rule_engine(order, user_history)
    identity_result = verify_identity_signals(current_ip, current_device,
                                              user_known_ips, user_known_devices)
    features = extract_features(order, user_history)
    ml_result = predict_fraud_ml(features)

    all_flags = rule_result["flags"] + identity_result["flags"]
    if ml_result["is_anomaly"]:
        all_flags.append(f"ML_ANOMALY: Isolation Forest score={ml_result['ml_risk_score']:.3f}")

    rule_risk_norm = rule_result["rule_risk_score"] / 100.0
    identity_norm  = identity_result["identity_risk_score"] / 100.0
    ml_risk        = ml_result["ml_risk_score"]
    combined_risk  = (rule_risk_norm * 0.40) + (identity_norm * 0.20) + (ml_risk * 0.40)
    is_fraudulent  = combined_risk > 0.55 or len(rule_result["flags"]) >= 2

    return {
        "is_fraudulent":       is_fraudulent,
        "flags":               all_flags,
        "rule_risk_score":     rule_result["rule_risk_score"],
        "identity_risk_score": identity_result["identity_risk_score"],
        "ml_risk_score":       round(ml_risk, 4),
        "combined_risk_score": round(combined_risk, 4),
        "risk_level":          "critical" if combined_risk > 0.75
                               else "high" if combined_risk > 0.55
                               else "medium" if combined_risk > 0.30
                               else "low"
    }
