"""Esquemas Pydantic: validan el JSON que entra y definen el JSON que sale."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    telefono: Optional[str] = Field(default=None, max_length=30)
    direccion: Optional[str] = Field(default=None, max_length=200)


class UsuarioCrear(UsuarioBase):
    pass


class UsuarioActualizar(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(default=None, max_length=30)
    direccion: Optional[str] = Field(default=None, max_length=200)


class UsuarioRespuesta(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    creado_en: datetime
