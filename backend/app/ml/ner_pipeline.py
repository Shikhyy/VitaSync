from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field

from app.config import settings

logger = logging.getLogger(__name__)

# ICD-10 partial mapping for common conditions
ICD10_MAP: dict[str, str] = {
    "diabetes": "E11", "type 2 diabetes": "E11", "t2dm": "E11",
    "hypertension": "I10", "high blood pressure": "I10",
    "myocardial infarction": "I21", "heart attack": "I21",
    "chronic kidney disease": "N18", "ckd": "N18",
    "dyslipidaemia": "E78", "hyperlipidaemia": "E78",
    "hypothyroidism": "E03", "hyperthyroidism": "E05",
    "anaemia": "D64", "anemia": "D64",
    "asthma": "J45", "copd": "J44",
    "heart failure": "I50", "atrial fibrillation": "I48",
    "stroke": "I63", "tia": "G45",
    "pneumonia": "J18", "sepsis": "A41",
}

# LOINC codes for common lab tests
LOINC_MAP: dict[str, str] = {
    "hba1c": "4548-4", "haemoglobin a1c": "4548-4", "hemoglobin a1c": "4548-4",
    "creatinine": "2160-0", "serum creatinine": "2160-0",
    "glucose": "2345-7", "fasting glucose": "14771-0",
    "ldl": "18262-6", "ldl cholesterol": "18262-6",
    "hdl": "2085-9", "hdl cholesterol": "2085-9",
    "triglycerides": "2571-8",
    "haemoglobin": "718-7", "hemoglobin": "718-7",
    "wbc": "6690-2", "white blood cell count": "6690-2",
    "platelet": "777-3", "platelets": "777-3",
    "egfr": "33914-3", "estimated gfr": "33914-3",
    "tsh": "3016-3", "thyroid stimulating hormone": "3016-3",
    "alt": "1742-6", "ast": "1920-8",
    "systolic": "8480-6", "diastolic": "8462-4",
    "bmi": "39156-5",
}

# RxNorm codes for common drugs
RXNORM_MAP: dict[str, str] = {
    "metformin": "6809", "lisinopril": "29046", "amlodipine": "17767",
    "atorvastatin": "83367", "rosuvastatin": "301542", "simvastatin": "36567",
    "aspirin": "1191", "clopidogrel": "32968", "warfarin": "11289",
    "insulin": "5856", "levothyroxine": "10582", "omeprazole": "7646",
    "metoprolol": "6918", "losartan": "203160", "ramipril": "35208",
}

# Named entity regex patterns
_NER_PATTERNS = {
    "LAB_VALUE": re.compile(
        r"(\d+\.?\d*)\s*(mg/dL|mmol/L|g/dL|IU/L|U/L|%|mEq/L|ng/mL|pmol/L|µmol/L|mmHg|bpm|kg|cm|mL/min)",
        re.IGNORECASE,
    ),
    "DATE": re.compile(
        r"\b(\d{1,2}[-/\s]\w{3,9}[-/\s]\d{2,4}|\d{4}[-/]\d{2}[-/]\d{2})\b",
        re.IGNORECASE,
    ),
    "DOSAGE": re.compile(
        r"\b(\d+\.?\d*\s?(?:mg|mcg|µg|g|ml|mL|units?|IU))\b",
        re.IGNORECASE,
    ),
}


@dataclass
class NEREntity:
    """Single extracted medical entity."""
    entity_type: str
    text: str
    normalised_code: str | None = None
    numeric_value: float | None = None
    unit: str | None = None
    confidence: float = 0.9


@dataclass
class NERResult:
    """Full NER result for a document."""
    document_id: str
    entities: list[NEREntity] = field(default_factory=list)
    raw_text_length: int = 0

    @property
    def entity_count(self) -> int:
        return len(self.entities)


class MedicalNERPipeline:
    """BioBERT-based medical NER pipeline.

    In dev mode: uses regex + dictionary lookup to extract entities.
    In production: calls HuggingFace BioBERT model via transformers pipeline.

    Entity types extracted:
    - DISEASE: Medical conditions (ICD-10 normalised)
    - DRUG: Medications (RxNorm normalised)
    - LAB_TEST: Lab marker names (LOINC normalised)
    - LAB_VALUE: Numeric lab results with units
    - DOSAGE: Drug dosage specifications
    """

    def __init__(self) -> None:
        self._model = None
        if not settings.dev_mode and os.getenv("ENABLE_BIOBERT", "false").lower() == "true":
            self._load_model()

    def _load_model(self) -> None:
        """Load BioBERT NER model from HuggingFace.

        Model: d4data/biomedical-ner-all (fine-tuned on MedMentions)
        Requires: transformers, torch (or rocm torch on AMD)
        """
        try:
            from transformers import pipeline as hf_pipeline
            self._model = hf_pipeline(
                "ner",
                model="d4data/biomedical-ner-all",
                aggregation_strategy="simple",
                device=0,  # ROCm GPU 0
            )
            logger.info("BioBERT NER model loaded")
        except Exception as e:
            logger.error("Failed to load BioBERT: %s — falling back to rules", e)

    def extract(self, text: str, document_id: str) -> NERResult:
        """Extract medical entities from clinical text.

        Args:
            text: Raw text extracted from a medical document.
            document_id: Document UUID for entity linking.

        Returns:
            NERResult with all extracted entities.
        """
        result = NERResult(document_id=document_id, raw_text_length=len(text))

        if settings.dev_mode or self._model is None:
            result.entities = self._rule_based_extract(text)
        else:
            result.entities = self._biobert_extract(text)

        logger.info(
            "NER complete: doc=%s entities=%d",
            document_id, result.entity_count,
        )
        return result

    def _rule_based_extract(self, text: str) -> list[NEREntity]:
        """Rule-based extraction using regex + dictionary lookup."""
        entities: list[NEREntity] = []
        text_lower = text.lower()

        # Disease extraction
        for term, icd in ICD10_MAP.items():
            if term in text_lower:
                entities.append(NEREntity(
                    entity_type="DISEASE",
                    text=term.title(),
                    normalised_code=icd,
                    confidence=0.88,
                ))

        # Drug extraction
        for term, rxnorm in RXNORM_MAP.items():
            if term in text_lower:
                entities.append(NEREntity(
                    entity_type="DRUG",
                    text=term.title(),
                    normalised_code=rxnorm,
                    confidence=0.92,
                ))

        # Lab test extraction
        for term, loinc in LOINC_MAP.items():
            if term in text_lower:
                entities.append(NEREntity(
                    entity_type="LAB_TEST",
                    text=term.title(),
                    normalised_code=loinc,
                    confidence=0.90,
                ))

        # Lab value extraction (regex)
        for match in _NER_PATTERNS["LAB_VALUE"].finditer(text):
            try:
                value = float(match.group(1))
                unit = match.group(2)
                entities.append(NEREntity(
                    entity_type="LAB_VALUE",
                    text=match.group(0),
                    numeric_value=value,
                    unit=unit,
                    confidence=0.95,
                ))
            except ValueError:
                pass

        # Dosage extraction
        for match in _NER_PATTERNS["DOSAGE"].finditer(text):
            entities.append(NEREntity(
                entity_type="DOSAGE",
                text=match.group(0),
                confidence=0.93,
            ))

        return entities

    def _biobert_extract(self, text: str) -> list[NEREntity]:
        """Production BioBERT NER extraction."""
        raw_entities = self._model(text[:512])  # BioBERT max 512 tokens
        entities = []
        for ent in raw_entities:
            entity_type = ent.get("entity_group", "MISC").upper()
            word = ent.get("word", "").strip()
            score = ent.get("score", 0.5)

            norm_code = None
            word_lower = word.lower()
            if entity_type == "DISEASE":
                norm_code = ICD10_MAP.get(word_lower)
            elif entity_type in ("DRUG", "CHEMICAL"):
                norm_code = RXNORM_MAP.get(word_lower)
            elif entity_type in ("LAB", "TEST"):
                norm_code = LOINC_MAP.get(word_lower)

            entities.append(NEREntity(
                entity_type=entity_type,
                text=word,
                normalised_code=norm_code,
                confidence=float(score),
            ))
        return entities
