from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Any

import httpx
from fastapi import HTTPException, Request, status

from app.config import settings
from app.models.models import Consent

logger = logging.getLogger(__name__)

PAYMENT_HEADER_NAMES = ("PAYMENT-SIGNATURE", "X-PAYMENT")
PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED"
PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE"


def _usd_price(amount: float) -> str:
    """Format an x402 price string using USD notation."""
    value = Decimal(str(amount)).quantize(Decimal("0.01"))
    return f"${value}"


def build_payment_requirements(consent: Consent, resource: str) -> dict[str, Any]:
    """Build an x402 PaymentRequired envelope for a single patient query."""
    if not settings.x402_pay_to:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="x402 payment receiver is not configured",
        )

    amount = float(consent.price_per_query or 0.0)
    return {
        "x402Version": 2,
        "resource": resource,
        "description": "VitaSync paid patient-record query",
        "mimeType": "application/json",
        "accepts": [
            {
                "scheme": settings.x402_scheme,
                "network": settings.x402_network,
                "payTo": settings.x402_pay_to,
                "price": _usd_price(amount),
                "asset": settings.x402_asset_address or settings.x402_asset,
                "maxTimeoutSeconds": int(settings.x402_timeout_seconds),
            }
        ],
        "metadata": {
            "consentId": str(consent.id),
            "patientId": str(consent.patient_id),
            "doctorId": str(consent.doctor_id),
            "pricePerQuery": amount,
        },
    }


def encode_payment_requirements(requirements: dict[str, Any]) -> str:
    return json.dumps(requirements, separators=(",", ":"), sort_keys=True)


def _payment_header(request: Request) -> str | None:
    for name in PAYMENT_HEADER_NAMES:
        value = request.headers.get(name)
        if value:
            return value
    return None


async def require_x402_payment(
    request: Request,
    consent: Consent,
    resource: str,
) -> str | None:
    """Enforce x402 payment for a paid query when enabled.

    Returns an encoded settlement response to emit in PAYMENT-RESPONSE, or None
    when x402 is disabled or the approved consent has a zero price.
    """
    if not settings.x402_enabled or float(consent.price_per_query or 0.0) <= 0:
        return None

    requirements = build_payment_requirements(consent, resource)
    encoded_requirements = encode_payment_requirements(requirements)
    payment = _payment_header(request)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "message": "x402 payment required for this Qwen patient query",
                "paymentRequirements": requirements,
            },
            headers={
                PAYMENT_REQUIRED_HEADER: encoded_requirements,
                "X-PAYMENT-REQUIRED": encoded_requirements,
            },
        )

    if settings.x402_allow_unverified_payments:
        logger.warning("Accepting unverified x402 payment because X402_ALLOW_UNVERIFIED_PAYMENTS is enabled")
        return encode_payment_requirements({"accepted": True, "mode": "unverified", "payment": payment[:16]})

    if not settings.x402_facilitator_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="x402 facilitator is not configured",
        )

    verify_payload = {
        "payment": payment,
        "paymentPayload": payment,
        "paymentRequirements": requirements,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.x402_timeout_seconds) as client:
            verify = await client.post(_facilitator_url("/verify"), json=verify_payload)
            verify.raise_for_status()
            verify_body = verify.json()
            if not bool(verify_body.get("isValid", verify_body.get("valid", False))):
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "message": verify_body.get("invalidReason") or verify_body.get("reason") or "x402 payment verification failed",
                        "paymentRequirements": requirements,
                    },
                    headers={PAYMENT_REQUIRED_HEADER: encoded_requirements},
                )

            settle = await client.post(_facilitator_url("/settle"), json=verify_payload)
            settle.raise_for_status()
            settlement = settle.json()
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.warning("x402 facilitator request failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="x402 facilitator is unavailable",
        ) from e

    return encode_payment_requirements({
        "success": True,
        "network": settings.x402_network,
        "asset": settings.x402_asset,
        "settlement": settlement,
    })


def _facilitator_url(path: str) -> str:
    return settings.x402_facilitator_url.rstrip("/") + path
