import joblib
import numpy as np

_model = None
_scaler = None

def _load():
    global _model, _scaler
    if _model is None:
        _model = joblib.load("ml/fraud_model.pkl")
        _scaler = joblib.load("ml/scaler.pkl")

def predict_fraud_ml(features: dict) -> dict:
    _load()
    X = np.array([[
        features["transaction_amount"],
        features["hour_of_day"],
        features["items_count"],
        features["user_order_count_7d"],
        features["avg_order_value_user"],
        features["amount_vs_avg_ratio"],
        features["is_high_value"],
        features["orders_last_5min"],
    ]])
    X_scaled = _scaler.transform(X)
    decision_score = float(_model.decision_function(X_scaled)[0])
    ml_risk = float(1 / (1 + np.exp(decision_score * 2)))
    is_anomaly = bool(_model.predict(X_scaled)[0] == -1)
    return {
        "ml_risk_score":  round(ml_risk, 4),
        "decision_score": round(decision_score, 4),
        "is_anomaly":     is_anomaly,
    }
