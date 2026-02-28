from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.case import Case
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
async def list_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).order_by(Case.created_at.desc()))
    return result.scalars().all()


@router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.delete("/cases/{case_id}", status_code=204)
async def delete_case(case_id: str, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    await db.delete(case)
    await db.commit()
