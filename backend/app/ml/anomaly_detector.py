from __future__ import annotations

import logging
from typing import Any

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """XGBoost-based lab anomaly detector.

    Classifies individual lab results as normal or anomalous.
    Trained on MIMIC-III extracted lab time-series.

    In dev mode: returns rule-based mock scores.
    In production: loads pre-trained XGBoost model from /models/lab_anomaly_xgb.json.
    """

    # Lab reference ranges: (low, high)
    _REFERENCE_RANGES: dict[str, tuple[float, float]] = {
        "hba1c": (4.0, 5.6),
        "creatinine": (0.6, 1.2),
        "ldl": (0.0, 3.0),
        "systolic_bp": (90.0, 120.0),
        "glucose_fasting": (70.0, 99.0),
        "hemoglobin": (12.0, 17.5),
        "wbc": (4.0, 11.0),
        "platelets": (150.0, 400.0),
    }

    def __init__(self) -> None:
        self._model: Any | None = None
        if not settings.dev_mode:
            self._load_model()

    def _load_model(self) -> None:
        """Load XGBoost model from disk.

        Expected path: /models/lab_anomaly_xgb.json
        Train script: backend/scripts/train_anomaly_detector.py
        """
        try:
            import xgboost as xgb
            self._model = xgb.XGBClassifier()
            self._model.load_model("/models/lab_anomaly_xgb.json")
            logger.info("Anomaly detector model loaded")
        except Exception as e:
            logger.error("Failed to load anomaly model: %s", e)
            raise

    def score(
        self,
        lab_name: str,
        value: float,
        patient_history: list[float] | None = None,
    ) -> float:
        """Score a single lab result for anomaly probability.

        Args:
            lab_name: Normalised lab marker name (e.g. 'hba1c').
            value: Current measurement value.
            patient_history: Previous measurements for this marker (optional).
                Used for trend analysis. If None, reference ranges only.

        Returns:
            Anomaly probability in [0.0, 1.0].
            Threshold: settings.alert_threshold (default 0.65).
        """
        if settings.dev_mode or self._model is None:
            return self._rule_based_score(lab_name, value, patient_history)
        return self._ml_score(lab_name, value, patient_history)

    def _rule_based_score(
        self,
        lab_name: str,
        value: float,
        history: list[float] | None = None,
    ) -> float:
        """Rule-based fallback for local development.

        Uses Z-score against reference range midpoint + trend direction.
        """
        lab_key = lab_name.lower().replace(" ", "_")
        ref = self._REFERENCE_RANGES.get(lab_key)
        if ref is None:
            return 0.1  # Unknown lab: low default score

        low, high = ref
        mid = (low + high) / 2
        spread = (high - low) / 2 or 1.0
        z_score = abs(value - mid) / spread

        base_score = min(z_score / 3.0, 0.9)

        # Trend penalty: if value is moving away from range over history
        if history and len(history) >= 2:
            trend = value - history[-1]
            is_worsening = (value > high and trend > 0) or (value < low and trend < 0)
            if is_worsening:
                base_score = min(base_score + 0.15, 0.95)

        return round(base_score, 3)

    def _ml_score(
        self,
        lab_name: str,
        value: float,
        history: list[float] | None = None,
    ) -> float:
        """XGBoost inference for production.

        Feature vector: [value, reference_low, reference_high, z_score,
                         history_mean, history_std, trend_slope]
        """
        lab_key = lab_name.lower().replace(" ", "_")
        ref = self._REFERENCE_RANGES.get(lab_key, (0, 1))
        low, high = ref
        mid = (low + high) / 2
        spread = max((high - low) / 2, 0.01)

        hist_arr = np.array(history or [value])
        features = np.array([[
            value,
            low, high,
            (value - mid) / spread,
            float(np.mean(hist_arr)),
            float(np.std(hist_arr)) if len(hist_arr) > 1 else 0.0,
            float(hist_arr[-1] - hist_arr[0]) if len(hist_arr) > 1 else 0.0,
        ]])
        prob = self._model.predict_proba(features)[0][1]
        return round(float(prob), 3)
