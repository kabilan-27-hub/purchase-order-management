from __future__ import annotations
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import PurchaseOrder, Supplier
from app.schemas import SupplierPerformance

router = APIRouter(prefix="", tags=["reports"])

@router.get("/suppliers/{supplier_id}/performance", response_model=SupplierPerformance)
def get_supplier_performance(supplier_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    eligible = []
    for order in db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == supplier_id).all():
        if order.status in {"CANCELLED", "DRAFT"}:
            continue
        if order.expected_delivery_date is None:
            continue
        if order.status == "RECEIVED":
            eligible.append(order)
    on_time = 0
    late = 0
    for order in eligible:
        total_ordered = sum((line.quantity_ordered for line in order.line_items), Decimal("0"))
        total_received = sum((sum((evt.quantity_received for evt in line.delivery_events), Decimal("0")) for line in order.line_items), Decimal("0"))
        if total_ordered == total_received and order.expected_delivery_date >= order.order_date:
            on_time += 1
        else:
            late += 1
    reliability = round((on_time / len(eligible) * 100), 2) if eligible else None
    return SupplierPerformance(
        supplier_id=supplier.id,
        supplier_name=supplier.name,
        reliability_percentage=reliability,
        eligible_order_count=len(eligible),
        on_time_count=on_time,
        late_count=late,
        status="Not enough data" if reliability is None else "OK",
    )

@router.get("/reports/supplier-performance", response_model=list[SupplierPerformance])
def list_supplier_performance(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return [get_supplier_performance(supplier.id, db, current_user) for supplier in db.query(Supplier).all()]
