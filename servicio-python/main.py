"""
Microservicio de USUARIOS
Lenguaje: Python | Framework: FastAPI | ORM: SQLAlchemy | BD: PostgreSQL

Endpoints:
  GET    /health           -> estado del servicio
  GET    /usuarios         -> lista todos los usuarios
  GET    /usuarios/{id}    -> un usuario (lo usa servicio-java para validar ordenes)
  POST   /usuarios         -> crea un usuario
  PUT    /usuarios/{id}    -> actualiza un usuario
  DELETE /usuarios/{id}    -> elimina un usuario
Documentacion automatica (Swagger): http://localhost:8001/docs
"""
from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine, esperar_base_de_datos, get_db

USUARIOS_INICIALES = [
    {"nombre": "Maria Gonzalez", "email": "maria@ujap.edu.ve", "telefono": "0414-1234567", "direccion": "Valencia, Carabobo"},
    {"nombre": "Carlos Perez", "email": "carlos@ujap.edu.ve", "telefono": "0424-7654321", "direccion": "Naguanagua, Carabobo"},
    {"nombre": "Ana Rodriguez", "email": "ana@ujap.edu.ve", "telefono": "0412-5558899", "direccion": "San Diego, Carabobo"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al arrancar: esperar la BD, crear tablas y cargar datos de ejemplo
    esperar_base_de_datos()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(models.Usuario).count() == 0:
            db.add_all([models.Usuario(**u) for u in USUARIOS_INICIALES])
            db.commit()
            print("[python] Usuarios de ejemplo creados")
    yield


app = FastAPI(title="Servicio de Usuarios (Python)", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def buscar_usuario(db: Session, usuario_id: int) -> models.Usuario:
    usuario = db.get(models.Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail=f"Usuario {usuario_id} no existe")
    return usuario


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "usuarios", "lenguaje": "Python", "bd": "PostgreSQL"}


@app.get("/usuarios", response_model=List[schemas.UsuarioRespuesta])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).order_by(models.Usuario.id).all()


@app.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return buscar_usuario(db, usuario_id)


@app.post("/usuarios", response_model=schemas.UsuarioRespuesta, status_code=201)
def crear_usuario(datos: schemas.UsuarioCrear, db: Session = Depends(get_db)):
    usuario = models.Usuario(**datos.model_dump())
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")
    db.refresh(usuario)
    return usuario


@app.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def actualizar_usuario(usuario_id: int, datos: schemas.UsuarioActualizar, db: Session = Depends(get_db)):
    usuario = buscar_usuario(db, usuario_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")
    db.refresh(usuario)
    return usuario


@app.delete("/usuarios/{usuario_id}", status_code=204)
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = buscar_usuario(db, usuario_id)
    db.delete(usuario)
    db.commit()
