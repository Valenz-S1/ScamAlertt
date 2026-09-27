import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Registro ──
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    age_range: str | None = None  # "18-30", "31-50", "51-65", "65+"


# ── Login ──
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ── Actualizar perfil ──
class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    age_range: str | None = None


# ── Cambio de contraseña ──
class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ── Respuesta (lo que se devuelve al frontend) ──
class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None
    age_range: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Token ──
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: uuid.UUID | None = None