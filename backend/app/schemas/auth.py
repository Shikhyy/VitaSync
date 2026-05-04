from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)
    full_name: str = Field(..., min_length=1, max_length=200)
    role: UserRole
    institution: str | None = None
    licence_number: str | None = None
    wallet_address: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    institution: str | None = None
    licence_number: str | None = None
    wallet_address: str | None = None
    created_at: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
