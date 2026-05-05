from __future__ import annotations

import logging
from typing import Any

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class RiskPredictor:
    """Gradient Boosting disease risk predictor.

    Predicts 3-year risk for Diabetes, Cardiovascular Disease, and CKD.
    Models trained on Framingham-derived features + MIMIC-III cohort.

    In dev mode: returns fixed mock risk scores.
    In production: loads pre-trained GBM models from /models/.
    """

    def __init__(self) -> None:
        self._diabetes_model: Any | None = None
        self._cvd_model: Any | None = None
        self._ckd_model: Any | None = None
        if not settings.dev_mode:
            self._load_models()

    def _load_models(self) -> None:
        """Load all three risk models from /models/."""
        from sklearn.ensemble import GradientBoostingClassifier
        import pickle

        model_paths = {
            "_diabetes_model": "/models/diabetes_gbm.pkl",
            "_cvd_model": "/models/cvd_gbm.pkl",
            "_ckd_model": "/models/ckd_gbm.pkl",
        }
        for attr, path in model_paths.items():
            with open(path, "rb") as f:
                setattr(self, attr, pickle.load(f))
        logger.info("Risk predictor models loaded (diabetes, CVD, CKD)")

    def predict(self, features: dict[str, float]) -> dict[str, float]:
        """Predict risk scores for all three conditions.

        Args:
            features: Dict of clinical features:
                - age: Patient age in years
                - bmi: Body mass index
                - hba1c: Latest HbA1c %
                - systolic_bp: Latest systolic BP mmHg
                - ldl: LDL cholesterol mmol/L
                - creatinine: Serum creatinine mg/dL
                - fasting_glucose: Fasting glucose mg/dL
                - smoking: 1 if current smoker, 0 otherwise
                - family_history_diabetes: 1 if yes
                - family_history_cvd: 1 if yes

        Returns:
            Dict with 'diabetes', 'cardiovascular', 'ckd' risk scores in [0, 1].
        """
        if settings.dev_mode:
            return self._mock_predict(features)
        return self._ml_predict(features)

    def get_risk_summary(self, patient_id: str) -> dict:
        """Get a summarised risk context dict for LLM prompt injection.

        Args:
            patient_id: Patient UUID. In production, fetches features from DB.

        Returns:
            Dict with diabetes, cardiovascular, ckd scores and alert_count.
        """
        # In production: fetch latest lab values from DB by patient_id
        mock_features = {
            "age": 47, "bmi": 27.4, "hba1c": 7.2, "systolic_bp": 128,
            "ldl": 2.4, "creatinine": 0.9, "fasting_glucose": 126,
            "smoking": 0, "family_history_diabetes": 1, "family_history_cvd": 0,
        }
        scores = self.predict(mock_features)
        return {**scores, "alert_count": 1 if scores.get("diabetes", 0) > 0.3 else 0}

    def _mock_predict(self, features: dict[str, float]) -> dict[str, float]:
        """Return plausible risk scores for development mode."""
        hba1c = features.get("hba1c", 5.5)
        bp = features.get("systolic_bp", 120)
        creatinine = features.get("creatinine", 0.9)
        return {
            "diabetes": min(max((hba1c - 5.0) / 4.0, 0.05), 0.95),
            "cardiovascular": min(max((bp - 110) / 60.0, 0.05), 0.95),
            "ckd": min(max((creatinine - 0.6) / 2.0, 0.03), 0.95),
        }

    def _ml_predict(self, features: dict[str, float]) -> dict[str, float]:
        """Production GBM inference.

        Feature order must match training data.
        """
        feature_order = [
            "age", "bmi", "hba1c", "systolic_bp", "ldl",
            "creatinine", "fasting_glucose", "smoking",
            "family_history_diabetes", "family_history_cvd",
        ]
        X = np.array([[features.get(f, 0.0) for f in feature_order]])
        return {
            "diabetes": round(float(self._diabetes_model.predict_proba(X)[0][1]), 3),
            "cardiovascular": round(float(self._cvd_model.predict_proba(X)[0][1]), 3),
            "ckd": round(float(self._ckd_model.predict_proba(X)[0][1]), 3),
        }
