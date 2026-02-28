from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.case import Case
from app.models.user import User
from app.schemas.case import CaseCreate, CaseResponse

router = APIRouter(tags=["cases"])


@router.post("/cases", response_model=CaseResponse, status_code=201)
async def create_case(body: CaseCreate, db: AsyncSession = Depends(get_db)):
    case = Case(name=body.name, description=body.description)
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.get("/cases", response_model=list[CaseResponse])
async def list_cases(include_archived: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(Case).order_by(Case.created_at.desc())
    if not include_archived:
        query = query.where(Case.archived_at.is_(None))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.delete("/cases/{case_id}", status_code=204)
async def delete_case(
    case_id: str,
    _user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    await db.delete(case)
    await db.commit()


@router.patch("/cases/{case_id}/archive", response_model=CaseResponse)
async def archive_case(
    case_id: str,
    _user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.archived_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(case)
    return case


@router.patch("/cases/{case_id}/unarchive", response_model=CaseResponse)
async def unarchive_case(
    case_id: str,
    _user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.archived_at = None
    await db.commit()
    await db.refresh(case)
    return case
