from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
import uuid

from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    PasswordChange,
    UserOut,
    Token,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


# ── REGISTRO ──
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Verificar que el email no exista
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )

    user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        age_range=user_in.age_range,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── LOGIN ──
@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


# ── PERFIL (obtener datos del usuario actual) ──
@router.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


# ── ACTUALIZAR PERFIL ──
@router.put("/profile", response_model=UserOut)
def update_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Cambio de email (validando que no esté en uso)
    if user_in.email and user_in.email != current_user.email:
        dup = db.query(User).filter(User.email == user_in.email).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ese email ya está en uso por otra cuenta",
            )
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.phone is not None:
        current_user.phone = user_in.phone
    if user_in.age_range is not None:
        current_user.age_range = user_in.age_range

    db.commit()
    db.refresh(current_user)
    return current_user


# ── SUBIR FOTO DE PERFIL ──
AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

_ALLOWED_IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@router.post("/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_IMG:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WEBP.")

    ext = _ALLOWED_IMG[file.content_type]
    filename = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(AVATAR_DIR, filename)

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    # Borrar avatar anterior si era local
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/avatars/"):
        old = os.path.join(AVATAR_DIR, os.path.basename(current_user.avatar_url))
        if os.path.exists(old):
            os.remove(old)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


# ── CAMBIO DE CONTRASEÑA ──
@router.put("/change-password")
def change_password(
    password_in: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(password_in.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta",
        )
    current_user.password_hash = hash_password(password_in.new_password)
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}
