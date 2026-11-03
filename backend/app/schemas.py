from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1)
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if value is not None and value != "":
            if "@" not in value:
                raise ValueError("invalid email format")
        return value

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierOut(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    unit: str = Field(..., min_length=1)
    reorder_level: Optional[Decimal] = Decimal("0")
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    sku: Optional[str] = None
    name: Optional[str] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None
    reorder_level: Optional[Decimal] = None

class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime

class LineItemCreate(BaseModel):
    product_id: UUID
    quantity_ordered: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)

class LineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    product_id: UUID
    quantity_ordered: Decimal
    unit_price: Decimal
    product_name: Optional[str] = None
    product_sku: Optional[str] = None

class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    order_date: date
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    line_items: list[LineItemCreate] = []

    @field_validator("expected_delivery_date")
    @classmethod
    def validate_date(cls, value, info):
        if value is not None and info.data.get("order_date") and value < info.data["order_date"]:
            raise ValueError("expected delivery date cannot precede order date")
        return value

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[UUID] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    line_items: Optional[list[LineItemCreate]] = None

class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    order_number: str
    supplier_id: UUID
    supplier_name: Optional[str] = None
    order_date: date
    expected_delivery_date: Optional[date]
    status: str
    notes: Optional[str]
    line_items: list[LineItemOut] = []
    order_total: Decimal = Decimal("0")
    created_at: datetime
    updated_at: datetime

class DeliveryEventCreate(BaseModel):
    line_item_id: UUID
    quantity_received: Decimal = Field(..., gt=0)
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class DeliveryEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    line_item_id: UUID
    quantity_received: Decimal
    received_at: datetime
    reference_number: Optional[str]
    notes: Optional[str]
    created_at: datetime

class DashboardSummary(BaseModel):
    active_suppliers: int
    active_products: int
    open_purchase_orders: int
    overdue_orders: int
    deliveries_due_in_7_days: int
    partially_received_orders: int

class DashboardOverdue(BaseModel):
    order_number: str
    supplier: str
    expected_delivery_date: date
    days_overdue: int
    ordered_quantity: Decimal
    received_quantity: Decimal
    remaining_quantity: Decimal
    status: str

class DashboardUpcoming(BaseModel):
    order_number: str
    supplier: str
    expected_delivery_date: date
    remaining_quantity: Decimal

class RecentOrder(BaseModel):
    order_number: str
    supplier: str
    order_date: date
    status: str
    order_total: Decimal

class SupplierPerformance(BaseModel):
    supplier_id: UUID
    supplier_name: str
    reliability_percentage: Optional[float] = None
    eligible_order_count: int
    on_time_count: int
    late_count: int
    status: str = "OK"

class MessageResponse(BaseModel):
    message: str
