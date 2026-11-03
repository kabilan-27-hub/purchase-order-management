from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Product, PurchaseOrder, Supplier
from app.repositories.crud import get_total_received_for_order
from app.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    active_suppliers = db.query(Supplier).filter(Supplier.is_active == True).count()
    active_products = db.query(Product).filter(Product.is_active == True).count()
    open_purchase_orders = db.query(PurchaseOrder).filter(PurchaseOrder.status.notin_(["CANCELLED", "RECEIVED", "DRAFT"])).count()
    overdue = db.query(PurchaseOrder).filter(PurchaseOrder.status.notin_(["CANCELLED", "RECEIVED", "DRAFT"]), PurchaseOrder.expected_delivery_date.isnot(None), PurchaseOrder.expected_delivery_date < date.today()).count()
    due_soon = db.query(PurchaseOrder).filter(PurchaseOrder.expected_delivery_date.isnot(None), PurchaseOrder.expected_delivery_date <= date.today() + timedelta(days=7), PurchaseOrder.status != "CANCELLED").count()
    partially_received = db.query(PurchaseOrder).filter(PurchaseOrder.status == "PARTIALLY_RECEIVED").count()
    return DashboardSummary(
        active_suppliers=active_suppliers,
        active_products=active_products,
        open_purchase_orders=open_purchase_orders,
        overdue_orders=overdue,
        deliveries_due_in_7_days=due_soon,
        partially_received_orders=partially_received,
    )

@router.get("/overdue")
def get_overdue_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result = []
    today = date.today()
    for order in db.query(PurchaseOrder).filter(PurchaseOrder.status.notin_(["CANCELLED", "RECEIVED", "DRAFT"]), PurchaseOrder.expected_delivery_date.isnot(None), PurchaseOrder.expected_delivery_date < today).all():
        ordered = sum((line.quantity_ordered for line in order.line_items), Decimal("0"))
        received = get_total_received_for_order(order)
        result.append({
            "order_number": order.order_number,
            "supplier": order.supplier.name,
            "expected_delivery_date": order.expected_delivery_date,
            "days_overdue": (today - order.expected_delivery_date).days,
            "ordered_quantity": ordered,
            "received_quantity": received,
            "remaining_quantity": ordered - received,
            "status": order.status,
        })
    return result

@router.get("/upcoming")
def get_upcoming_deliveries(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    today = date.today()
    result = []
    for order in db.query(PurchaseOrder).filter(PurchaseOrder.expected_delivery_date.isnot(None), PurchaseOrder.status != "CANCELLED", PurchaseOrder.expected_delivery_date >= today, PurchaseOrder.expected_delivery_date <= today + timedelta(days=7)).all():
        ordered = sum((line.quantity_ordered for line in order.line_items), Decimal("0"))
        received = get_total_received_for_order(order)
        result.append({
            "order_number": order.order_number,
            "supplier": order.supplier.name,
            "expected_delivery_date": order.expected_delivery_date,
            "remaining_quantity": ordered - received,
        })
    return result

@router.get("/recent-orders")
def get_recent_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result = []
    for order in db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).limit(10).all():
        result.append({
            "order_number": order.order_number,
            "supplier": order.supplier.name,
            "order_date": order.order_date,
            "status": order.status,
            "order_total": sum((line.quantity_ordered * line.unit_price for line in order.line_items), Decimal("0")),
        })
    return result
