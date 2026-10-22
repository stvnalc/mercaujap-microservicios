"""Contrasenas (hash PBKDF2) y tokens de sesion (JWT)."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "mercaujap-clave-de-desarrollo-cambiar-en-produccion")
JWT_ALGORITMO = "HS256"
HORAS_SESION = int(os.getenv("JWT_HORAS", "8"))
ITERACIONES = 240_000


def hash_password(password: str) -> str:
    """Nunca se guarda la clave en texto plano: se guarda sal + hash."""
    sal = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), sal.encode(), ITERACIONES).hex()
    return f"pbkdf2_sha256${ITERACIONES}${sal}${digest}"


def verificar_password(password: str, guardado: str | None) -> bool:
    if not guardado:
        return False
    try:
        _, iteraciones, sal, digest = guardado.split("$")
    except ValueError:
        return False
    calculado = hashlib.pbkdf2_hmac("sha256", password.encode(), sal.encode(), int(iteraciones)).hex()
    return hmac.compare_digest(calculado, digest)  # comparacion en tiempo constante


def crear_token(usuario_id: int, rol: str) -> tuple[str, datetime]:
    expira = datetime.now(timezone.utc) + timedelta(hours=HORAS_SESION)
    payload = {"sub": str(usuario_id), "rol": rol, "exp": expira, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITMO), expira


def leer_token(token: str) -> dict | None:
    """Devuelve el contenido del token, o None si es invalido o expiro."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITMO])
    except jwt.PyJWTError:
        return None
