from __future__ import annotations
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import DeliveryEvent, PurchaseOrder, PurchaseOrderLineItem
from app.repositories.crud import get_purchase_order
from app.schemas import DeliveryEventCreate, DeliveryEventOut

router = APIRouter(prefix="/purchase-orders", tags=["deliveries"])

def sync_order_status(order: PurchaseOrder, db: Session):
    if order.status == "CANCELLED":
        return
    total_ordered = sum((line.quantity_ordered for line in order.line_items), Decimal("0"))
    total_received = sum((sum((evt.quantity_received for evt in line.delivery_events), Decimal("0")) for line in order.line_items), Decimal("0"))
    if total_received <= 0:
        order.status = "ORDERED"
    elif total_received >= total_ordered:
        order.status = "RECEIVED"
    else:
        order.status = "PARTIALLY_RECEIVED"
    db.commit()

@router.get("/{order_id}/deliveries", response_model=list[DeliveryEventOut])
def list_deliveries_for_order(order_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    items = []
    for line in order.line_items:
        for event in line.delivery_events:
            items.append({
                "id": event.id,
                "line_item_id": event.purchase_order_line_item_id,
                "quantity_received": event.quantity_received,
                "received_at": event.received_at,
                "reference_number": event.reference_number,
                "notes": event.notes,
                "created_at": event.created_at,
            })
    return items

@router.post("/{order_id}/deliveries", response_model=DeliveryEventOut, status_code=status.HTTP_201_CREATED)
def create_delivery(order_id: UUID, payload: DeliveryEventCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status in {"DRAFT", "CANCELLED"}:
        raise HTTPException(status_code=400, detail="Cannot record delivery for draft or cancelled orders")
    line_item = db.query(PurchaseOrderLineItem).filter(PurchaseOrderLineItem.id == payload.line_item_id).first()
    if not line_item or line_item.purchase_order_id != order.id:
        raise HTTPException(status_code=400, detail="Invalid line item for this order")
    if payload.quantity_received <= 0:
        raise HTTPException(status_code=400, detail="Received quantity must be positive")
    received_to_date = sum((event.quantity_received for event in line_item.delivery_events), Decimal("0"))
    if received_to_date + payload.quantity_received > line_item.quantity_ordered:
        raise HTTPException(status_code=400, detail="Total received quantity cannot exceed ordered quantity")
    event = DeliveryEvent(
        purchase_order_line_item_id=payload.line_item_id,
        quantity_received=payload.quantity_received,
        reference_number=payload.reference_number,
        notes=payload.notes,
    )
    db.add(event); db.commit(); db.refresh(event)
    sync_order_status(order, db)
    return {
        "id": event.id,
        "line_item_id": event.purchase_order_line_item_id,
        "quantity_received": event.quantity_received,
        "received_at": event.received_at,
        "reference_number": event.reference_number,
        "notes": event.notes,
        "created_at": event.created_at,
    }

@router.get("/deliveries", response_model=list[DeliveryEventOut])
def list_all_deliveries(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    events = db.query(DeliveryEvent).order_by(DeliveryEvent.received_at.desc()).all()
    return [{
        "id": event.id,
        "line_item_id": event.purchase_order_line_item_id,
        "quantity_received": event.quantity_received,
        "received_at": event.received_at,
        "reference_number": event.reference_number,
        "notes": event.notes,
        "created_at": event.created_at,
    } for event in events]

@router.get("/deliveries/{delivery_id}", response_model=DeliveryEventOut)
def get_delivery(delivery_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    event = db.query(DeliveryEvent).filter(DeliveryEvent.id == delivery_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return {
        "id": event.id,
        "line_item_id": event.purchase_order_line_item_id,
        "quantity_received": event.quantity_received,
        "received_at": event.received_at,
        "reference_number": event.reference_number,
        "notes": event.notes,
        "created_at": event.created_at,
    }
