from __future__ import annotations
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Product, PurchaseOrder, PurchaseOrderLineItem, Supplier

def get_supplier_by_id(db: Session, supplier_id: UUID):
    return db.query(Supplier).filter(Supplier.id == supplier_id).first()

def get_product_by_id(db: Session, product_id: UUID):
    return db.query(Product).filter(Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(Product).filter(Product.sku == sku).first()

def get_purchase_order(db: Session, order_id: UUID):
    return db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()

def calculate_line_total(line_item: PurchaseOrderLineItem) -> Decimal:
    return (line_item.quantity_ordered * line_item.unit_price).quantize(Decimal("0.01"))

def get_order_total(order: PurchaseOrder) -> Decimal:
    total = Decimal("0")
    for line in order.line_items:
        total += calculate_line_total(line)
    return total.quantize(Decimal("0.01"))

def get_received_quantity_for_line(line_item: PurchaseOrderLineItem) -> Decimal:
    total = sum((event.quantity_received for event in line_item.delivery_events), Decimal("0"))
    return total.quantize(Decimal("0.01"))

def get_total_received_for_order(order: PurchaseOrder) -> Decimal:
    total = Decimal("0")
    for line in order.line_items:
        total += get_received_quantity_for_line(line)
    return total.quantize(Decimal("0.01"))
