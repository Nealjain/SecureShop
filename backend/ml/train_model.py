import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib, os

def generate_training_data(n_normal=500, n_anomalous=50):
    np.random.seed(42)
    normal = pd.DataFrame({
        "transaction_amount":   np.random.normal(2000, 800, n_normal).clip(100, 15000),
        "hour_of_day":          np.random.randint(8, 22, n_normal),
        "items_count":          np.random.randint(1, 6, n_normal),
        "user_order_count_7d":  np.random.randint(0, 5, n_normal),
        "avg_order_value_user": np.random.normal(1800, 600, n_normal).clip(100, 10000),
        "amount_vs_avg_ratio":  np.random.normal(1.1, 0.3, n_normal).clip(0.1, 3.0),
        "is_high_value":        np.zeros(n_normal),
        "orders_last_5min":     np.zeros(n_normal),
    })
    anomalous = pd.DataFrame({
        "transaction_amount":   np.random.uniform(60000, 200000, n_anomalous),
        "hour_of_day":          np.random.choice([1, 2, 3, 4, 23], n_anomalous),
        "items_count":          np.random.randint(12, 25, n_anomalous),
        "user_order_count_7d":  np.random.randint(10, 30, n_anomalous),
        "avg_order_value_user": np.random.normal(1500, 400, n_anomalous).clip(100, 5000),
        "amount_vs_avg_ratio":  np.random.uniform(5.0, 20.0, n_anomalous),
        "is_high_value":        np.ones(n_anomalous),
        "orders_last_5min":     np.random.randint(3, 8, n_anomalous),
    })
    return pd.concat([normal, anomalous], ignore_index=True)

def train():
    df = generate_training_data()
    X = df.values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = IsolationForest(n_estimators=200, contamination=0.1, random_state=42, n_jobs=-1)
    model.fit(X_scaled)
    os.makedirs("ml", exist_ok=True)
    joblib.dump(model, "ml/fraud_model.pkl")
    joblib.dump(scaler, "ml/scaler.pkl")
    print("✅ ML model trained and saved")

if __name__ == "__main__":
    train()
