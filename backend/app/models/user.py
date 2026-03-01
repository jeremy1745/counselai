import uuid
from datetime import datetime

from sqlalchemy import Boolean, Integer, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    force_password_change: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
