from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Product, PurchaseOrder, PurchaseOrderLineItem, Supplier
from app.repositories.crud import get_order_total, get_purchase_order
from app.schemas import PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderUpdate

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])

def to_order_response(order: PurchaseOrder) -> PurchaseOrderOut:
    line_items = []
    for line in order.line_items:
        line_items.append({
            "id": line.id,
            "product_id": line.product_id,
            "quantity_ordered": line.quantity_ordered,
            "unit_price": line.unit_price,
            "product_name": line.product.name,
            "product_sku": line.product.sku,
        })
    return PurchaseOrderOut(
        id=order.id,
        order_number=order.order_number,
        supplier_id=order.supplier_id,
        supplier_name=order.supplier.name,
        order_date=order.order_date,
        expected_delivery_date=order.expected_delivery_date,
        status=order.status,
        notes=order.notes,
        line_items=line_items,
        order_total=get_order_total(order),
        created_at=order.created_at,
        updated_at=order.updated_at,
    )

@router.get("", response_model=list[PurchaseOrderOut])
def list_purchase_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return [to_order_response(order) for order in db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()]

@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(payload: PurchaseOrderCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if payload.expected_delivery_date and payload.expected_delivery_date < payload.order_date:
        raise HTTPException(status_code=400, detail="Expected delivery date cannot be before order date")
    if not payload.line_items:
        raise HTTPException(status_code=400, detail="Order must contain at least one line item")
    order = PurchaseOrder(
        order_number=f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6].upper()}",
        supplier_id=payload.supplier_id,
        order_date=payload.order_date,
        expected_delivery_date=payload.expected_delivery_date,
        notes=payload.notes,
        status="DRAFT",
    )
    db.add(order); db.flush()
    for item in payload.line_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if item.quantity_ordered <= 0:
            raise HTTPException(status_code=400, detail="Ordered quantity must be greater than zero")
        if item.unit_price < 0:
            raise HTTPException(status_code=400, detail="Unit price cannot be negative")
        db.add(PurchaseOrderLineItem(
            purchase_order_id=order.id,
            product_id=item.product_id,
            quantity_ordered=item.quantity_ordered,
            unit_price=item.unit_price,
        ))
    db.commit(); db.refresh(order)
    return to_order_response(order)

@router.get("/{order_id}", response_model=PurchaseOrderOut)
def get_purchase_order_detail(order_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return to_order_response(order)

@router.patch("/{order_id}", response_model=PurchaseOrderOut)
def update_purchase_order(order_id: UUID, payload: PurchaseOrderUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft orders can be edited")
    if payload.supplier_id is not None:
        order.supplier_id = payload.supplier_id
    if payload.order_date is not None:
        order.order_date = payload.order_date
    if payload.expected_delivery_date is not None:
        if payload.expected_delivery_date < order.order_date:
            raise HTTPException(status_code=400, detail="Expected delivery date cannot be before order date")
        order.expected_delivery_date = payload.expected_delivery_date
    if payload.notes is not None:
        order.notes = payload.notes
    if payload.line_items is not None:
        for line in list(order.line_items):
            db.delete(line)
        for item in payload.line_items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            db.add(PurchaseOrderLineItem(
                purchase_order_id=order.id,
                product_id=item.product_id,
                quantity_ordered=item.quantity_ordered,
                unit_price=item.unit_price,
            ))
    db.commit(); db.refresh(order)
    return to_order_response(order)

@router.post("/{order_id}/place", response_model=PurchaseOrderOut)
def place_order(order_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft orders can be placed")
    order.status = "ORDERED"
    db.commit(); db.refresh(order)
    return to_order_response(order)

@router.post("/{order_id}/cancel", response_model=PurchaseOrderOut)
def cancel_order(order_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status == "RECEIVED":
        raise HTTPException(status_code=400, detail="A fully received order cannot be cancelled")
    order.status = "CANCELLED"
    db.commit(); db.refresh(order)
    return to_order_response(order)
