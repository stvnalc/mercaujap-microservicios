"""Modelo (tabla) de la base de datos. SQLAlchemy crea la tabla 'usuarios'."""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, func, true

from database import Base

# Roles del sistema:
#   cliente  -> compra en la tienda (no inicia sesion en el panel)
#   vendedor -> personal: gestiona pedidos, clientes y productos (no puede eliminar)
#   admin    -> personal con todos los permisos
ROLES = ("cliente", "vendedor", "admin")
ROLES_PERSONAL = ("vendedor", "admin")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    documento = Column(String(20), nullable=True)  # cedula o RIF, ej: V-12345678
    telefono = Column(String(30), nullable=True)
    direccion = Column(String(200), nullable=True)
    rol = Column(String(20), nullable=False, default="cliente", server_default="cliente")
    activo = Column(Boolean, nullable=False, default=True, server_default=true())
    password_hash = Column(String(255), nullable=True)  # solo el personal tiene clave
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# Si la tabla ya existia de una version anterior, create_all() NO agrega columnas nuevas.
# Estas sentencias son idempotentes (IF NOT EXISTS) y se ejecutan al arrancar.
MIGRACIONES = [
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS documento VARCHAR(20)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente'",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ DEFAULT now()",
]
