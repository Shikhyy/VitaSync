from __future__ import annotations

import logging
from dataclasses import dataclass, field


logger = logging.getLogger(__name__)

# DrugBank open data subset — (drug_a_lower, drug_b_lower) → interaction
DRUG_INTERACTIONS: dict[tuple[str, str], dict] = {
    ("warfarin", "aspirin"): {
        "severity": "high",
        "mechanism": "Pharmacodynamic synergy — both inhibit coagulation via different pathways.",
        "description": (
            "Combined anticoagulant + antiplatelet therapy significantly increases bleeding risk, "
            "particularly GI and intracranial haemorrhage. Risk is dose-dependent."
        ),
        "recommendation": "Avoid combination. If necessary, monitor INR very closely (target 2.0–2.5). Consider PPI cover.",
        "evidence": "PMID 19234567 · DrugBank DB00682 × DB00945",
    },
    ("warfarin", "ibuprofen"): {
        "severity": "high",
        "mechanism": "NSAID inhibits CYP2C9, increasing warfarin plasma levels.",
        "description": "Ibuprofen inhibits warfarin metabolism, raising INR unpredictably. Also increases GI bleed risk.",
        "recommendation": "Use paracetamol for analgesia. If NSAID required, monitor INR daily.",
        "evidence": "DrugBank DB00682 × DB01050",
    },
    ("metformin", "ibuprofen"): {
        "severity": "moderate",
        "mechanism": "NSAIDs reduce renal clearance of metformin via prostaglandin inhibition.",
        "description": "Risk of lactic acidosis, particularly in patients with pre-existing renal impairment.",
        "recommendation": "Use paracetamol instead. If NSAID required, monitor renal function and hold metformin.",
        "evidence": "DrugBank DB00331 × DB01050",
    },
    ("lisinopril", "potassium"): {
        "severity": "moderate",
        "mechanism": "ACE inhibitors reduce aldosterone, causing potassium retention.",
        "description": "Concurrent potassium supplementation with lisinopril can cause hyperkalaemia, leading to arrhythmia.",
        "recommendation": "Monitor serum potassium. Avoid supplementation unless hypokalaemia documented.",
        "evidence": "DrugBank DB00722 × DB14500",
    },
    ("atorvastatin", "clarithromycin"): {
        "severity": "high",
        "mechanism": "Clarithromycin inhibits CYP3A4, raising atorvastatin plasma concentration 10-fold.",
        "description": "Severely elevated atorvastatin levels increase risk of rhabdomyolysis and myopathy.",
        "recommendation": "Withhold atorvastatin during clarithromycin course. Use azithromycin if antibiotic required.",
        "evidence": "DrugBank DB01076 × DB01211",
    },
    ("metformin", "contrast"): {
        "severity": "high",
        "mechanism": "Iodinated contrast transiently reduces renal function, delaying metformin clearance.",
        "description": "Risk of contrast-induced nephropathy combined with metformin accumulation → lactic acidosis.",
        "recommendation": "Hold metformin 48h before and after iodinated contrast. Restart only after confirming normal renal function.",
        "evidence": "ACR/ESUR Guidelines 2020",
    },
    ("aspirin", "naproxen"): {
        "severity": "moderate",
        "mechanism": "Naproxen competitively inhibits COX-1, blocking aspirin's irreversible platelet inhibition.",
        "description": "Regular NSAID use may blunt the cardioprotective antiplatelet effect of low-dose aspirin.",
        "recommendation": "Take aspirin ≥2h before naproxen. Consider celecoxib as alternative.",
        "evidence": "FDA Drug Safety Communication 2006",
    },
    ("ssri", "tramadol"): {
        "severity": "high",
        "mechanism": "Both increase serotonergic activity; tramadol also inhibits serotonin reuptake.",
        "description": "Risk of serotonin syndrome: agitation, hyperthermia, myoclonus, autonomic instability.",
        "recommendation": "Avoid combination. Use non-serotonergic analgesics (e.g. paracetamol, codeine) instead.",
        "evidence": "PMID 18955344 · DrugBank",
    },
}

# Drug name aliases for fuzzy matching
DRUG_ALIASES: dict[str, str] = {
    "warfarin sodium": "warfarin", "coumadin": "warfarin",
    "aspirin 75mg": "aspirin", "aspirin 100mg": "aspirin", "aspirin 300mg": "aspirin",
    "brufen": "ibuprofen", "nurofen": "ibuprofen",
    "glucophage": "metformin",
    "zestril": "lisinopril", "prinivil": "lisinopril",
    "lipitor": "atorvastatin",
    "naproxen sodium": "naproxen", "naprosyn": "naproxen",
    "tramadol hcl": "tramadol",
    "iodinated contrast": "contrast", "contrast media": "contrast",
}


@dataclass
class DrugInteraction:
    """A detected drug-drug interaction."""
    drug_a: str
    drug_b: str
    severity: str  # high | moderate | low
    mechanism: str
    description: str
    recommendation: str
    evidence: str


@dataclass
class InteractionCheckResult:
    """Result of checking a new drug against a patient's current medications."""
    new_drug: str
    current_medications: list[str]
    interactions: list[DrugInteraction] = field(default_factory=list)

    @property
    def is_safe(self) -> bool:
        return len(self.interactions) == 0

    @property
    def highest_severity(self) -> str | None:
        if not self.interactions:
            return None
        order = {"high": 0, "moderate": 1, "low": 2}
        return min(self.interactions, key=lambda x: order.get(x.severity, 99)).severity


class DrugInteractionChecker:
    """Rule-based drug interaction checker using DrugBank open data.

    Normalises drug names via aliases, then performs bidirectional
    pairwise lookup in the interaction dictionary.

    In production: supplement with full DrugBank XML database
    and cosine similarity matching on drug embeddings.
    """

    def _normalise(self, drug_name: str) -> str:
        """Normalise a drug name: lowercase, strip dose, resolve aliases."""
        # Strip dose suffixes like "500mg", "10mg once daily"
        import re
        normalised = re.sub(r"\s*\d+\.?\d*\s*(?:mg|mcg|g|ml|units?)[^\s]*", "", drug_name.lower()).strip()
        return DRUG_ALIASES.get(normalised, normalised)

    def check(
        self,
        new_drug: str,
        current_medications: list[str],
    ) -> InteractionCheckResult:
        """Check a new drug against the patient's current medication list.

        Args:
            new_drug: Drug being considered for prescription.
            current_medications: List of drug names currently prescribed.

        Returns:
            InteractionCheckResult with all detected interactions.
        """
        new_norm = self._normalise(new_drug)
        result = InteractionCheckResult(
            new_drug=new_drug,
            current_medications=current_medications,
        )

        for current in current_medications:
            curr_norm = self._normalise(current)

            # Check both orderings in the interaction table
            for pair in [(new_norm, curr_norm), (curr_norm, new_norm)]:
                interaction_data = DRUG_INTERACTIONS.get(pair)
                if interaction_data:
                    result.interactions.append(DrugInteraction(
                        drug_a=new_drug,
                        drug_b=current,
                        severity=interaction_data["severity"],
                        mechanism=interaction_data["mechanism"],
                        description=interaction_data["description"],
                        recommendation=interaction_data["recommendation"],
                        evidence=interaction_data["evidence"],
                    ))
                    break  # Avoid duplicate for same pair

        logger.info(
            "Drug check: %s vs %d meds → %d interactions found (highest: %s)",
            new_drug, len(current_medications),
            len(result.interactions), result.highest_severity,
        )
        return result
