"""Conexion a PostgreSQL usando SQLAlchemy (ORM de Python)."""
import os
import time

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Lee el archivo .env si existe (util para correr el servicio sin Docker)
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://admin:supersecreta@localhost:5432/usuarios_db"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def esperar_base_de_datos(intentos: int = 30) -> None:
    """Reintenta la conexion por si PostgreSQL todavia esta arrancando."""
    for i in range(1, intentos + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception as e:  # noqa: BLE001
            print(f"[python] Esperando PostgreSQL ({i}/{intentos}): {e}")
            time.sleep(2)
    raise RuntimeError("No se pudo conectar a PostgreSQL")


def get_db():
    """Dependencia de FastAPI: abre una sesion por peticion y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
