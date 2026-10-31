import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

def evaluate_enterprise_model():
    np.random.seed(42)
    samples_per_class = 1250

    # Class 0: HEALTHY CROPS (Green)
    c0_ndvi = np.random.normal(0.68, 0.07, samples_per_class).clip(0.42, 0.95)
    c0_ndre = np.random.normal(0.48, 0.07, samples_per_class).clip(0.30, 0.80)
    c0_evi  = np.random.normal(0.55, 0.08, samples_per_class).clip(0.35, 0.88)
    c0_savi = np.random.normal(0.50, 0.07, samples_per_class).clip(0.32, 0.82)
    c0_ndbi = np.random.normal(-0.25, 0.04, samples_per_class).clip(-0.50, -0.10)
    c0_area = np.random.uniform(0.5, 50.0, samples_per_class)
    X0 = np.column_stack([c0_ndvi, c0_ndre, c0_evi, c0_savi, c0_ndbi, c0_area])
    y0 = np.zeros(samples_per_class, dtype=int)

    # Class 1: MODERATE CROPS (Yellow)
    c1_ndvi = np.random.normal(0.34, 0.04, samples_per_class).clip(0.25, 0.41)
    c1_ndre = np.random.normal(0.22, 0.04, samples_per_class).clip(0.15, 0.29)
    c1_evi  = np.random.normal(0.28, 0.04, samples_per_class).clip(0.20, 0.34)
    c1_savi = np.random.normal(0.26, 0.04, samples_per_class).clip(0.18, 0.31)
    c1_ndbi = np.random.normal(-0.15, 0.04, samples_per_class).clip(-0.35, -0.05)
    c1_area = np.random.uniform(0.5, 50.0, samples_per_class)
    X1 = np.column_stack([c1_ndvi, c1_ndre, c1_evi, c1_savi, c1_ndbi, c1_area])
    y1 = np.ones(samples_per_class, dtype=int)

    # Class 2: DAMAGED / STRESSED CROPS (Red)
    c2_ndvi = np.random.normal(0.18, 0.03, samples_per_class).clip(0.12, 0.24)
    c2_ndre = np.random.normal(0.08, 0.03, samples_per_class).clip(0.02, 0.14)
    c2_evi  = np.random.normal(0.14, 0.03, samples_per_class).clip(0.05, 0.19)
    c2_savi = np.random.normal(0.12, 0.03, samples_per_class).clip(0.04, 0.17)
    c2_ndbi = np.random.normal(-0.05, 0.04, samples_per_class).clip(-0.20, 0.04)
    c2_area = np.random.uniform(0.5, 50.0, samples_per_class)
    X2 = np.column_stack([c2_ndvi, c2_ndre, c2_evi, c2_savi, c2_ndbi, c2_area])
    y2 = np.full(samples_per_class, 2, dtype=int)

    # Class 3: NON-AGRICULTURAL STRUCTURE (Building Roof / House / Paved Concrete)
    c3_ndvi = np.random.normal(0.08, 0.02, samples_per_class).clip(-0.10, 0.11)
    c3_ndre = np.random.normal(0.04, 0.02, samples_per_class).clip(-0.05, 0.07)
    c3_evi  = np.random.normal(0.06, 0.02, samples_per_class).clip(-0.05, 0.09)
    c3_savi = np.random.normal(0.05, 0.02, samples_per_class).clip(-0.05, 0.08)
    c3_ndbi = np.random.normal(0.18, 0.05, samples_per_class).clip(0.05, 0.45)
    c3_area = np.random.uniform(0.05, 10.0, samples_per_class)
    X3 = np.column_stack([c3_ndvi, c3_ndre, c3_evi, c3_savi, c3_ndbi, c3_area])
    y3 = np.full(samples_per_class, 3, dtype=int)

    X = np.vstack([X0, X1, X2, X3])
    y = np.concatenate([y0, y1, y2, y3])

    # 80-20 Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_split=3,
            class_weight='balanced',
            random_state=42
        ))
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    class_names = ["HEALTHY_CROPS", "MODERATE_CROP_GROWTH", "DAMAGED_STRESSED_CROPS", "NON_AGRICULTURAL_STRUCTURE"]
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred)

    print("=== MODEL ACCURACY EVALUATION REPORT ===")
    print(f"Overall Classification Accuracy: {acc * 100.0:.2f}%\n")
    print("Class-Wise Evaluation Metrics:")
    for idx, cname in enumerate(class_names):
        print(f"  [{cname}] -> Precision: {precision[idx]*100:.2f}%, Recall: {recall[idx]*100:.2f}%, F1-Score: {f1[idx]*100:.2f}%")

    print("\nConfusion Matrix (4x4):")
    print(cm)

if __name__ == "__main__":
    evaluate_enterprise_model()
