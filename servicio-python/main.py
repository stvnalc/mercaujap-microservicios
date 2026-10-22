"""
Microservicio de USUARIOS y AUTENTICACION
Lenguaje: Python | Framework: FastAPI | ORM: SQLAlchemy | BD: PostgreSQL

Endpoints:
  GET    /health                 -> estado del servicio
  POST   /auth/login             -> inicia sesion (personal) y devuelve un token JWT
  GET    /auth/me                -> datos del usuario del token
  POST   /auth/cambiar-password  -> cambia la clave del usuario del token
  GET    /auth/verificar         -> lo usa el API Gateway (Nginx auth_request) en CADA peticion
  GET    /usuarios               -> lista (filtros ?q= ?rol= ?tipo=clientes|personal ?activo=)
  GET    /usuarios/{id}          -> un usuario (lo usa servicio-java para validar pedidos)
  POST   /usuarios               -> crea un usuario
  PUT    /usuarios/{id}          -> actualiza un usuario
  DELETE /usuarios/{id}          -> elimina (consulta a servicio-java si tiene pedidos)
Documentacion automatica (Swagger): http://localhost:8001/docs
"""
import json
import os
import urllib.error
import urllib.request
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional
from urllib.parse import quote

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine, esperar_base_de_datos, get_db
from seguridad import crear_token, hash_password, leer_token, verificar_password

ORDENES_URL = os.getenv("ORDENES_SERVICE_URL", "http://localhost:8003")

CLIENTES_INICIALES = [
    ("María González", "maria.gonzalez@gmail.com", "V-18456789", "0414-1234567", "Av. Bolívar Norte, Valencia, Carabobo"),
    ("Carlos Pérez", "carlos.perez@hotmail.com", "V-20123456", "0424-7654321", "Urb. La Granja, Naguanagua, Carabobo"),
    ("Ana Rodríguez", "ana.rodriguez@gmail.com", "V-22987654", "0412-5558899", "C.C. Sambil, San Diego, Carabobo"),
    ("José Martínez", "jose.martinez@outlook.com", "V-15678234", "0416-4401122", "Calle 137, Prebo, Valencia"),
    ("Valentina Castillo", "vale.castillo@gmail.com", "V-26543210", "0414-9087766", "Res. Los Mangos, Tocuyito, Carabobo"),
    ("Luis Fernández", "lfernandez@gmail.com", "V-17234567", "0424-3345566", "Av. Universidad, Bárbula, Naguanagua"),
    ("Gabriela Torres", "gabytorres@yahoo.com", "V-24876123", "0412-7712233", "Urb. El Viñedo, Valencia, Carabobo"),
    ("Daniel Suárez", "daniel.suarez@gmail.com", "E-84561230", "0414-2209988", "Puerto Cabello, Carabobo"),
    ("Camila Rojas", "camila.rojas@gmail.com", "V-27345678", "0416-6654433", "Los Guayos, Carabobo"),
    ("Tecnología Avanzada C.A.", "compras@tecavanzada.com", "J-409876543", "0241-8251100", "Zona Industrial Castillito, Valencia"),
    ("Andres Morales", "andres.morales@hotmail.com", "V-19876543", "0424-1187744", "Guacara, Carabobo"),
    ("Sofía Herrera", "sofia.herrera@gmail.com", "V-28123987", "0412-3398877", "Urb. Trigal Norte, Valencia, Carabobo"),
]

PERSONAL_INICIAL = [
    ("Andrea Salazar", "admin@mercaujap.com", "admin", "admin123"),
    ("Luis Herrera", "vendedor@mercaujap.com", "vendedor", "vendedor123"),
]


def cargar_datos_iniciales(db: Session) -> None:
    if db.query(models.Usuario).filter(models.Usuario.rol == "cliente").count() == 0:
        # Fechas de registro escalonadas en los ultimos meses para que los datos se vean reales
        ahora = datetime.now(timezone.utc)
        db.add_all(
            models.Usuario(nombre=n, email=e, documento=d, telefono=t, direccion=dir_, rol="cliente",
                           creado_en=ahora - timedelta(days=400 - i * 35))
            for i, (n, e, d, t, dir_) in enumerate(CLIENTES_INICIALES)
        )
        print("[python] Clientes de ejemplo creados")
    if db.query(models.Usuario).filter(models.Usuario.rol == "admin").count() == 0:
        for nombre, email, rol, clave in PERSONAL_INICIAL:
            if db.query(models.Usuario).filter(func.lower(models.Usuario.email) == email).first() is None:
                db.add(models.Usuario(nombre=nombre, email=email, rol=rol, password_hash=hash_password(clave)))
        print("[python] Cuentas del personal creadas (admin@mercaujap.com / admin123)")
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al arrancar: esperar la BD, crear/actualizar tablas y cargar datos de ejemplo
    esperar_base_de_datos()
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        for sentencia in models.MIGRACIONES:
            conn.execute(text(sentencia))
    with SessionLocal() as db:
        cargar_datos_iniciales(db)
    yield


app = FastAPI(title="Servicio de Usuarios y Autenticacion", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], expose_headers=["X-Total-Count"]
)


CAMPOS = {"nombre": "Nombre", "email": "Correo", "documento": "Documento", "telefono": "Teléfono",
          "direccion": "Dirección", "rol": "Rol", "password": "Contraseña", "nueva": "Nueva contraseña",
          "actual": "Contraseña actual", "activo": "Activo"}


@app.exception_handler(RequestValidationError)
async def errores_de_validacion(request: Request, exc: RequestValidationError):
    """Traduce los errores de validacion de Pydantic a mensajes claros en espanol."""
    mensajes = []
    for err in exc.errors():
        campo = CAMPOS.get(str(err["loc"][-1]), str(err["loc"][-1])) if len(err["loc"]) > 1 else "Datos"
        tipo, ctx = err["type"], err.get("ctx") or {}
        if tipo == "missing":
            texto = "es obligatorio"
        elif tipo == "string_too_short":
            texto = f"debe tener al menos {ctx.get('min_length')} caracteres"
        elif tipo == "string_too_long":
            texto = f"admite máximo {ctx.get('max_length')} caracteres"
        elif tipo == "value_error" and "email" in err["msg"].lower():
            texto = "no es un correo válido"
        elif tipo == "value_error":
            texto = str(ctx.get("error", err["msg"]))
            campo = "" if campo == "Datos" else campo
        elif tipo == "literal_error":
            texto = f"debe ser uno de: {ctx.get('expected')}"
        else:
            texto = "tiene un valor inválido"
        mensajes.append(f"{campo}: {texto}" if campo else texto)
    return JSONResponse(status_code=422, content={"detail": "; ".join(mensajes)})


# ---------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------
def buscar_usuario(db: Session, usuario_id: int) -> models.Usuario:
    usuario = db.get(models.Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail=f"El usuario {usuario_id} no existe")
    return usuario


def email_en_uso(db: Session, email: str, excepto_id: Optional[int] = None) -> bool:
    consulta = db.query(models.Usuario).filter(func.lower(models.Usuario.email) == email.lower())
    if excepto_id is not None:
        consulta = consulta.filter(models.Usuario.id != excepto_id)
    return db.query(consulta.exists()).scalar()


def usuario_del_token(authorization: Optional[str], db: Session) -> models.Usuario:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Debes iniciar sesión")
    datos = leer_token(authorization.split(" ", 1)[1].strip())
    if datos is None:
        raise HTTPException(status_code=401, detail="Tu sesión expiró. Vuelve a iniciar sesión")
    usuario = db.get(models.Usuario, int(datos["sub"]))
    if usuario is None or not usuario.activo or usuario.rol not in models.ROLES_PERSONAL:
        raise HTTPException(status_code=401, detail="Tu cuenta ya no tiene acceso al sistema")
    return usuario


def exigir_admin_si_personal(rol_actual: Optional[str], *roles_afectados: Optional[str]) -> None:
    """Solo un admin puede crear, editar o eliminar cuentas del personal.
    rol_actual viene del API Gateway (cabecera X-Usuario-Rol). Si la peticion no paso por el
    gateway (llamada interna entre servicios o Swagger) no hay cabecera y se permite."""
    if rol_actual and rol_actual != "admin" and any(r in models.ROLES_PERSONAL for r in roles_afectados if r):
        raise HTTPException(status_code=403, detail="Solo un administrador puede gestionar cuentas del personal")


def contar_pedidos(usuario_id: int) -> int:
    """COMUNICACION ENTRE SERVICIOS: pregunta a servicio-java cuantos pedidos tiene el usuario."""
    try:
        with urllib.request.urlopen(f"{ORDENES_URL}/ordenes?usuarioId={usuario_id}", timeout=4) as resp:
            return len(json.load(resp))
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise HTTPException(status_code=503, detail="No se pudo verificar el historial de pedidos. Intenta de nuevo")


# ---------------------------------------------------------------------
# Salud
# ---------------------------------------------------------------------
@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "servicio": "usuarios", "lenguaje": "Python", "bd": "PostgreSQL"}


# ---------------------------------------------------------------------
# Autenticacion
# ---------------------------------------------------------------------
@app.post("/auth/login", response_model=schemas.LoginRespuesta)
def login(datos: schemas.LoginEntrada, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(func.lower(models.Usuario.email) == datos.email.lower()).first()
    if usuario is None or not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if usuario.rol not in models.ROLES_PERSONAL:
        raise HTTPException(status_code=403, detail="Esta cuenta no tiene acceso al panel")
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Tu cuenta está desactivada. Contacta a un administrador")
    usuario.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
    db.refresh(usuario)
    token, expira = crear_token(usuario.id, usuario.rol)
    return {"token": token, "expira_en": expira, "usuario": usuario}


@app.get("/auth/me", response_model=schemas.UsuarioRespuesta)
def yo(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    return usuario_del_token(authorization, db)


@app.post("/auth/cambiar-password", status_code=204)
def cambiar_password(
    datos: schemas.CambiarPassword, authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)
):
    usuario = usuario_del_token(authorization, db)
    if not verificar_password(datos.actual, usuario.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    usuario.password_hash = hash_password(datos.nueva)
    db.commit()


@app.get("/auth/verificar", include_in_schema=False)
def verificar(
    response: Response,
    authorization: Optional[str] = Header(default=None),
    x_original_method: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """El API Gateway llama aqui ANTES de reenviar cada peticion a /api/...
    200 = adelante (y devuelve quien es el usuario en cabeceras), 401 = sin sesion, 403 = sin permiso."""
    usuario = usuario_del_token(authorization, db)
    if (x_original_method or "").upper() == "DELETE" and usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede eliminar registros")
    response.headers["X-Usuario-Id"] = str(usuario.id)
    response.headers["X-Usuario-Rol"] = usuario.rol
    response.headers["X-Usuario-Nombre"] = quote(usuario.nombre)  # %-codificado (acentos, n)
    return {"ok": True}


# ---------------------------------------------------------------------
# Usuarios (clientes y personal)
# ---------------------------------------------------------------------
@app.get("/usuarios", response_model=List[schemas.UsuarioRespuesta])
def listar_usuarios(
    response: Response,
    q: Optional[str] = Query(default=None, max_length=100),
    rol: Optional[schemas.Rol] = None,
    tipo: Optional[Literal["clientes", "personal"]] = None,
    activo: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(models.Usuario)
    if q:
        patron = f"%{q.strip()}%"
        consulta = consulta.filter(
            or_(
                models.Usuario.nombre.ilike(patron),
                models.Usuario.email.ilike(patron),
                models.Usuario.documento.ilike(patron),
                models.Usuario.telefono.ilike(patron),
            )
        )
    if rol:
        consulta = consulta.filter(models.Usuario.rol == rol)
    if tipo == "clientes":
        consulta = consulta.filter(models.Usuario.rol == "cliente")
    elif tipo == "personal":
        consulta = consulta.filter(models.Usuario.rol.in_(models.ROLES_PERSONAL))
    if activo is not None:
        consulta = consulta.filter(models.Usuario.activo == activo)
    usuarios = consulta.order_by(models.Usuario.id).all()
    response.headers["X-Total-Count"] = str(len(usuarios))
    return usuarios


@app.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return buscar_usuario(db, usuario_id)


@app.post("/usuarios", response_model=schemas.UsuarioRespuesta, status_code=201)
def crear_usuario(
    datos: schemas.UsuarioCrear,
    x_usuario_rol: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    exigir_admin_si_personal(x_usuario_rol, datos.rol)
    if email_en_uso(db, datos.email):
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")
    campos = datos.model_dump(exclude={"password"})
    usuario = models.Usuario(**campos)
    if datos.password and datos.rol != "cliente":
        usuario.password_hash = hash_password(datos.password)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")
    db.refresh(usuario)
    return usuario


@app.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def actualizar_usuario(
    usuario_id: int,
    datos: schemas.UsuarioActualizar,
    x_usuario_id: Optional[str] = Header(default=None),
    x_usuario_rol: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    usuario = buscar_usuario(db, usuario_id)
    cambios = datos.model_dump(exclude_unset=True)
    exigir_admin_si_personal(x_usuario_rol, usuario.rol, cambios.get("rol"))

    es_uno_mismo = x_usuario_id is not None and x_usuario_id == str(usuario_id)
    if es_uno_mismo and (cambios.get("activo") is False or cambios.get("rol", usuario.rol) != usuario.rol):
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta ni cambiar tu rol")
    if "email" in cambios and email_en_uso(db, cambios["email"], excepto_id=usuario_id):
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

    nueva_clave = cambios.pop("password", None)
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)
    if usuario.rol == "cliente":
        usuario.password_hash = None
    elif nueva_clave:
        usuario.password_hash = hash_password(nueva_clave)
    elif not usuario.password_hash:
        raise HTTPException(status_code=400, detail="Asigna una contraseña para la cuenta del personal")
    db.commit()
    db.refresh(usuario)
    return usuario


@app.delete("/usuarios/{usuario_id}", status_code=204)
def eliminar_usuario(
    usuario_id: int,
    x_usuario_id: Optional[str] = Header(default=None),
    x_usuario_rol: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    usuario = buscar_usuario(db, usuario_id)
    exigir_admin_si_personal(x_usuario_rol, usuario.rol)
    if x_usuario_id == str(usuario_id):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    if usuario.rol == "admin" and db.query(models.Usuario).filter(models.Usuario.rol == "admin").count() <= 1:
        raise HTTPException(status_code=400, detail="Debe quedar al menos un administrador")
    if usuario.rol == "cliente":
        pedidos = contar_pedidos(usuario_id)
        if pedidos:
            raise HTTPException(
                status_code=409,
                detail=f"El cliente tiene {pedidos} pedido(s) registrados. Desactívalo en lugar de eliminarlo",
            )
    db.delete(usuario)
    db.commit()
