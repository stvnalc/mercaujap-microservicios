FROM postgres:16-alpine

# Los scripts de esta carpeta se ejecutan solos la PRIMERA vez que arranca PostgreSQL
COPY init.sql /docker-entrypoint-initdb.d/init.sql
