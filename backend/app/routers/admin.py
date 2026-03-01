from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.user import User
from app.schemas.auth import UserResponse
from app.services.security_logger import log_admin_action

router = APIRouter(tags=["admin"])


@router.get("/admin/users", response_model=list[UserResponse])
async def list_users(
    _admin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.patch("/admin/users/{user_id}/disable", response_model=UserResponse)
async def disable_user(
    user_id: str,
    admin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_disabled = True
    await db.commit()
    await db.refresh(user)
    log_admin_action(admin.email, "disable_user", user_id)
    return user


@router.patch("/admin/users/{user_id}/enable", response_model=UserResponse)
async def enable_user(
    user_id: str,
    admin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_disabled = False
    await db.commit()
    await db.refresh(user)
    log_admin_action(admin.email, "enable_user", user_id)
    return user


@router.patch("/admin/users/{user_id}/force-password-change", response_model=UserResponse)
async def force_password_change(
    user_id: str,
    admin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot force password change on your own account")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.force_password_change = True
    await db.commit()
    await db.refresh(user)
    log_admin_action(admin.email, "force_password_change", user_id)
    return user
