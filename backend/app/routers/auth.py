from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.rate_limit import limiter
from app.schemas.auth import (
    RegisterRequest, LoginRequest, AuthResponse, UserResponse, ChangePasswordRequest,
)
from app.services.auth import hash_password, verify_password, create_access_token
from app.services.security_logger import log_login_success, log_login_failure, log_account_locked

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=AuthResponse, status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # First user auto-promoted to superadmin
    user_count = await db.scalar(select(func.count()).select_from(User))
    role = "superadmin" if user_count == 0 else "user"

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    log_login_success(user.email, request.client.host if request.client else "unknown")

    token = create_access_token(user.id, user.role)
    return AuthResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
        force_password_change=False,
    )


@router.post("/auth/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        log_login_failure(body.email, client_ip, "user_not_found")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Check account lockout
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        log_login_failure(body.email, client_ip, "account_locked")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account temporarily locked")

    if not verify_password(body.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.max_failed_logins:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.lockout_duration_minutes)
            log_account_locked(body.email, client_ip)
        await db.commit()
        log_login_failure(body.email, client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.is_disabled:
        log_login_failure(body.email, client_ip, "account_disabled")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    # Reset lockout on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()

    log_login_success(body.email, client_ip)

    token = create_access_token(user.id, user.role)
    return AuthResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
        force_password_change=user.force_password_change,
    )


@router.get("/auth/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/auth/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(body.new_password)
    user.force_password_change = False
    await db.commit()
