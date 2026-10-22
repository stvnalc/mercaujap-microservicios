-- Se ejecuta UNA sola vez, la primera vez que arranca el contenedor de PostgreSQL.
-- Patron "una base de datos por microservicio": cada servicio es dueno de sus datos.
CREATE DATABASE usuarios_db;   -- servicio-python (SQLAlchemy)
CREATE DATABASE ordenes_db;    -- servicio-java   (Spring Data JPA)
CREATE DATABASE reportes_db;   -- servicio-go     (GORM)
