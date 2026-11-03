from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_login_and_create_flow():
    login = client.post("/api/v1/auth/login", json={"email": "admin@supplier.local", "password": "admin123"})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    supplier = client.post("/api/v1/suppliers", headers=headers, json={
        "name": "Global Suppliers",
        "contact_person": "A. Patel",
        "email": "hello@globalsuppliers.com",
        "phone": "1234567890",
        "is_active": True,
    })
    assert supplier.status_code == 201, supplier.text
    supplier_id = supplier.json()["id"]

    product = client.post("/api/v1/products", headers=headers, json={
        "sku": f"SKU-{uuid4().hex[:6].upper()}",
        "name": "Office Chair",
        "unit": "pcs",
        "reorder_level": 10,
        "is_active": True,
    })
    assert product.status_code == 201, product.text
    product_id = product.json()["id"]

    order = client.post("/api/v1/purchase-orders", headers=headers, json={
        "supplier_id": supplier_id,
        "order_date": "2025-01-01",
        "expected_delivery_date": "2025-01-10",
        "notes": "First batch",
        "line_items": [{"product_id": product_id, "quantity_ordered": 100, "unit_price": 20}]
    })
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]

    placed = client.post(f"/api/v1/purchase-orders/{order_id}/place", headers=headers)
    assert placed.status_code == 200, placed.text

    delivery = client.post(f"/api/v1/purchase-orders/{order_id}/deliveries", headers=headers, json={
        "line_item_id": order.json()["line_items"][0]["id"],
        "quantity_received": 40,
        "reference_number": "REF-001",
    })
    assert delivery.status_code == 201, delivery.text

    summary = client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["active_suppliers"] >= 1

def test_order_rules_and_invalid_dates():
    login = client.post("/api/v1/auth/login", json={"email": "admin@supplier.local", "password": "admin123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    supplier = client.post("/api/v1/suppliers", headers=headers, json={"name": "Bad Supplier", "email": "x@y.com"})
    product = client.post("/api/v1/products", headers=headers, json={"sku": f"TEST-{uuid4().hex[:6].upper()}", "name": "Laptop", "unit": "pcs"})
    bad_order = client.post("/api/v1/purchase-orders", headers=headers, json={
        "supplier_id": supplier.json()["id"],
        "order_date": "2025-02-20",
        "expected_delivery_date": "2025-02-10",
        "line_items": [{"product_id": product.json()["id"], "quantity_ordered": 5, "unit_price": 0}]
    })
    assert bad_order.status_code == 422
