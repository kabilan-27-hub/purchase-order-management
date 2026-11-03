from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import User

app = FastAPI(title="Supplier & Purchase Order Management System", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_v1)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@supplier.local").first()
        if existing is None:
            db.add(User(
                email="admin@supplier.local",
                full_name="System Administrator",
                password_hash=hash_password("admin123"),
                is_active=True,
            ))
            db.commit()
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "ok"}
