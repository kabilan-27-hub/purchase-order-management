from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Supplier
from app.schemas import SupplierCreate, SupplierOut, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

@router.get("", response_model=list[SupplierOut])
def list_suppliers(
    search: str | None = Query(default=None),
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Supplier)
    if search:
        query = query.filter(or_(Supplier.name.ilike(f"%{search}%"), Supplier.email.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    return query.order_by(Supplier.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier

@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: UUID, payload: SupplierUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(supplier, field, value)
    db.commit(); db.refresh(supplier)
    return supplier

@router.post("/{supplier_id}/deactivate", response_model=SupplierOut)
def deactivate_supplier(supplier_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    supplier.is_active = False
    db.commit(); db.refresh(supplier)
    return supplier

@router.post("/{supplier_id}/activate", response_model=SupplierOut)
def activate_supplier(supplier_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    supplier.is_active = True
    db.commit(); db.refresh(supplier)
    return supplier
