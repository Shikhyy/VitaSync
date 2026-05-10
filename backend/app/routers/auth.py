from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.models.models import User
from app.schemas.auth import (
    Token,
    TokenData,
    UserCreate,
    UserResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def _hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against the stored bcrypt hash."""
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token.

    Args:
        data: Payload data to encode.
        expires_delta: Token lifetime. Defaults to settings value.

    Returns:
        Signed JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def _user_to_dict(user: User) -> dict:
    """Convert a DB user row into the dict shape consumed by existing routers."""
    return {
        "id": str(user.id),
        "email": user.email,
        "password_hash": user.password_hash,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "full_name": user.full_name,
        "institution": user.institution,
        "licence_number": user.licence_number,
        "wallet_address": user.wallet_address,
        "created_at": user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat(),
    }


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dependency: validate JWT and return the current user.

    Args:
        token: Bearer token from Authorization header.

    Returns:
        User dict from the user store.

    Raises:
        HTTPException 401: If token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(token_data.user_id)
    except ValueError:
        raise credentials_exception

    user = await db.get(User, user_uuid)
    if user is None:
        raise credentials_exception
    return _user_to_dict(user)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register a new patient or doctor account.

    Args:
        user_in: Registration payload with email, password, and role.

    Returns:
        Created user object (without password).

    Raises:
        HTTPException 409: If email is already registered.
    """
    existing = await db.scalar(select(User).where(User.email == user_in.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        email=user_in.email,
        password_hash=_hash_password(user_in.password),
        role=user_in.role.value,
        full_name=user_in.full_name,
        institution=user_in.institution,
        licence_number=user_in.licence_number,
        wallet_address=user_in.wallet_address,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    logger.info("New user registered: role=%s id=%s", user_in.role, user.id)
    return UserResponse(**{k: v for k, v in _user_to_dict(user).items() if k != "password_hash"})


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Authenticate user and return a JWT access token.

    Args:
        form_data: OAuth2 form with username (email) and password.

    Returns:
        Token response with access_token and token_type.

    Raises:
        HTTPException 401: If credentials are incorrect.
    """
    user = await db.scalar(select(User).where(User.email == form_data.username))
    if not user or not _verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = _create_access_token({"sub": str(user.id), "role": role})
    logger.info("User logged in: id=%s", user.id)
    return Token(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    """Return the currently authenticated user's profile.

    Args:
        current_user: Injected by get_current_user dependency.

    Returns:
        Current user's profile.
    """
    return UserResponse(**{k: v for k, v in current_user.items() if k != "password_hash"})
