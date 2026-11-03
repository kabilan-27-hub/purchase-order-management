from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.deliveries import router as deliveries_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.purchase_orders import router as purchase_orders_router
from app.api.v1.endpoints.reports import router as report_router
from app.api.v1.endpoints.suppliers import router as suppliers_router

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth_router)
api_v1.include_router(suppliers_router)
api_v1.include_router(products_router)
api_v1.include_router(purchase_orders_router)
api_v1.include_router(deliveries_router)
api_v1.include_router(dashboard_router)
api_v1.include_router(report_router)
