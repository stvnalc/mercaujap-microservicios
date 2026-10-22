"""Modelo (tabla) de la base de datos. SQLAlchemy crea la tabla 'usuarios'."""
from sqlalchemy import Column, DateTime, Integer, String, func

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    telefono = Column(String(30), nullable=True)
    direccion = Column(String(200), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
