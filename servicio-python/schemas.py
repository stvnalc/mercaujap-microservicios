"""Esquemas Pydantic: validan el JSON que entra y definen el JSON que sale."""
import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Rol = Literal["cliente", "vendedor", "admin"]

# Cedula / RIF venezolano: V-12345678, E-1234567, J-123456789, G-..., P-...
PATRON_DOCUMENTO = re.compile(r"^([VEJPG])-?(\d{5,9})$")


def normalizar_documento(valor: Optional[str]) -> Optional[str]:
    if valor is None or not valor.strip():
        return None
    m = PATRON_DOCUMENTO.match(valor.strip().upper().replace(".", "").replace(" ", ""))
    if not m:
        raise ValueError("Formato inválido. Ejemplos: V-12345678, E-8456123, J-409876543")
    return f"{m.group(1)}-{m.group(2)}"


def limpiar_texto(valor: Optional[str]) -> Optional[str]:
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    documento: Optional[str] = Field(default=None, max_length=20)
    telefono: Optional[str] = Field(default=None, max_length=30)
    direccion: Optional[str] = Field(default=None, max_length=200)

    @field_validator("documento")
    @classmethod
    def _documento(cls, v):
        return normalizar_documento(v)

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v):
        v = limpiar_texto(v)
        if v is None or len(v) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return v

    @field_validator("telefono", "direccion")
    @classmethod
    def _texto(cls, v):
        return limpiar_texto(v)


class UsuarioCrear(UsuarioBase):
    rol: Rol = "cliente"
    activo: bool = True
    password: Optional[str] = Field(default=None, min_length=6, max_length=72)

    @model_validator(mode="after")
    def _personal_con_clave(self):
        if self.rol != "cliente" and not self.password:
            raise ValueError("Las cuentas del personal necesitan una contraseña (mínimo 6 caracteres)")
        return self


class UsuarioActualizar(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    documento: Optional[str] = Field(default=None, max_length=20)
    telefono: Optional[str] = Field(default=None, max_length=30)
    direccion: Optional[str] = Field(default=None, max_length=200)
    rol: Optional[Rol] = None
    activo: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=72)

    @field_validator("documento")
    @classmethod
    def _documento(cls, v):
        return normalizar_documento(v)

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v):
        v = limpiar_texto(v)
        if v is None or len(v) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return v

    @field_validator("telefono", "direccion")
    @classmethod
    def _texto(cls, v):
        return limpiar_texto(v)


class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    documento: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    rol: str
    activo: bool
    creado_en: Optional[datetime] = None
    ultimo_acceso: Optional[datetime] = None


class LoginEntrada(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class LoginRespuesta(BaseModel):
    token: str
    expira_en: datetime
    usuario: UsuarioRespuesta


class CambiarPassword(BaseModel):
    actual: str = Field(min_length=1, max_length=72)
    nueva: str = Field(min_length=6, max_length=72)
