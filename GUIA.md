# 📘 Guía para entender MercaUJAP (desde cero)

Esta guía es para quien sabe poco de programación (o solo lo básico) y necesita **entender, ejecutar y explicar** el proyecto. Léela en orden; cada sección se apoya en la anterior.

**Índice**

1. [¿Qué hace el sistema? (en palabras simples)](#1-qué-hace-el-sistema-en-palabras-simples)
2. [Conceptos que necesitas saber](#2-conceptos-que-necesitas-saber)
3. [Cómo ejecutarlo paso a paso](#3-cómo-ejecutarlo-paso-a-paso)
4. [Recorrido por la aplicación (guion para la demo)](#4-recorrido-por-la-aplicación-guion-para-la-demo)
5. [El viaje de una orden: qué pasa por dentro](#5-el-viaje-de-una-orden-qué-pasa-por-dentro)
6. [Archivo por archivo](#6-archivo-por-archivo)
7. [docker-compose.yml explicado](#7-docker-composeyml-explicado)
8. [El API Gateway (Nginx) explicado](#8-el-api-gateway-nginx-explicado)
9. [Ver los datos dentro de las bases de datos](#9-ver-los-datos-dentro-de-las-bases-de-datos)
10. [Preguntas que te puede hacer la profesora](#10-preguntas-que-te-puede-hacer-la-profesora)
11. [Problemas comunes y cómo resolverlos](#11-problemas-comunes-y-cómo-resolverlos)
12. [Glosario rápido](#12-glosario-rápido)

---

## 1. ¿Qué hace el sistema? (en palabras simples)

MercaUJAP es el sistema de una **tienda de tecnología**. Permite:

- Registrar **clientes**.
- Tener un **catálogo de productos** con su precio y cuántas unidades hay (stock).
- Hacer **órdenes de compra** (un cliente compra uno o varios productos).
- Ver **estadísticas**: cuánto se ha vendido, qué se vende más, quién compra más, qué productos se están acabando.

### La analogía del restaurante 🍽️

En vez de tener **un solo programa gigante** que hace todo (eso se llama *monolito*), el sistema está dividido en **4 programas pequeños** llamados **microservicios**. Cada uno hace **una sola cosa** y está escrito en un lenguaje diferente:

| En el restaurante... | En MercaUJAP | Lenguaje |
|---|---|---|
| El que lleva la lista de clientes | **Servicio de Usuarios** | 🐍 Python |
| El que maneja el almacén / despensa | **Servicio de Productos** | 🟩 Node.js |
| El mesero que toma el pedido | **Servicio de Órdenes** | ☕ Java |
| El contador que saca las cuentas | **Servicio de Reportes** | 🐹 Go |
| El recepcionista de la puerta, que te manda a la mesa correcta | **API Gateway** | Nginx |
| El menú que ve el cliente | **Frontend** (la página web) | HTML/CSS/JS |

Cuando el **mesero (Java)** toma un pedido, le pregunta a la **lista de clientes (Python)** si ese cliente existe, y le pregunta al **almacén (Node)** cuánto cuesta cada cosa y si hay suficiente. Si todo está bien, el almacén descuenta lo vendido y el pedido se anota. Eso es la **comunicación entre microservicios**.

---

## 2. Conceptos que necesitas saber

### 🌐 API y endpoint
Una **API** es la forma en que un programa le ofrece servicios a otros programas por internet. Cada "puerta" de la API se llama **endpoint**: una dirección (URL) + un método.

Ejemplo: `GET http://localhost/api/productos` significa *"dame la lista de productos"*.

### 📨 Métodos HTTP (los verbos)

| Método | Para qué | Ejemplo en el proyecto |
|---|---|---|
| `GET` | Leer / consultar | `GET /api/usuarios` → lista de usuarios |
| `POST` | Crear algo nuevo | `POST /api/ordenes` → crea una orden |
| `PUT` | Reemplazar / editar | `PUT /api/productos/{id}` → edita un producto |
| `PATCH` | Cambiar una parte | `PATCH /api/ordenes/{id}/estado` → cambia solo el estado |
| `DELETE` | Borrar | `DELETE /api/usuarios/3` → borra al usuario 3 |

Esto es lo que se conoce como **CRUD** (Create, Read, Update, Delete).

### 📄 JSON
Es el formato de texto en el que los servicios se mandan datos. Se ve así:

```json
{ "id": 1, "nombre": "Maria Gonzalez", "email": "maria@ujap.edu.ve" }
```

### 🔢 Códigos de respuesta
- `200` OK · `201` Creado · `204` Borrado (sin contenido)
- `400` Datos malos · `404` No existe · `409` Conflicto (ej: no hay stock)
- `500` Error del servidor · `503` Servicio no disponible

### 🧱 Microservicio
Un programa pequeño e independiente con **su propia base de datos** que hace una sola tarea. Ventajas: si uno se cae los demás siguen, cada uno puede usar el lenguaje que mejor le quede, y se pueden actualizar por separado.

### 🐳 Docker: imagen y contenedor
- **Imagen**: una "receta congelada" con el programa y **todo lo que necesita** (Python, librerías, etc.). Se crea con un `Dockerfile`.
- **Contenedor**: una imagen **ejecutándose**. Es como una mini-computadora aislada.

Por eso **no necesitas instalar Python, Java, Node ni Go** en tu computadora: cada contenedor ya los trae.

### 🎼 Docker Compose
Un archivo (`docker-compose.yml`) que describe **todos** los contenedores del sistema y cómo se conectan. Con un solo comando (`docker compose up --build`) se crean y arrancan los 8 contenedores.

### 🗄️ Bases de datos SQL vs NoSQL

| | SQL (PostgreSQL) | NoSQL (MongoDB) |
|---|---|---|
| Cómo guarda | **Tablas** con filas y columnas fijas | **Documentos** JSON flexibles |
| Ejemplo | Tabla `usuarios` con columnas id, nombre, email | Colección `productos` con documentos `{nombre, precio, ...}` |
| Lo usan | Python, Java y Go | Node |

### 🔁 ORM
Un **ORM** es una librería que te deja trabajar con la base de datos usando **clases/objetos** de tu lenguaje en vez de escribir SQL a mano. Ejemplo: en vez de `SELECT * FROM ordenes`, en Java se escribe `repo.findAll()`.

| Servicio | ORM |
|---|---|
| Python | SQLAlchemy |
| Java | Spring Data JPA (Hibernate) |
| Go | GORM |
| Node | Mongoose (para MongoDB se le dice *ODM*) |

### 🔐 Variables de entorno (`.env`)
Contraseñas y configuraciones **no se escriben dentro del código**: se ponen en un archivo `.env` que **no se sube a GitHub** (por eso está en `.gitignore`). En el repositorio está `.env.example` como plantilla.

### 🚪 API Gateway
Una **puerta de entrada única**. En vez de que el navegador tenga que saber que Python está en el puerto 8001, Node en 8002, etc., todo entra por `http://localhost` (puerto 80) y **Nginx** reparte cada petición al servicio correcto según la ruta (`/api/usuarios`, `/api/productos`...).

---

## 3. Cómo ejecutarlo paso a paso

### Paso 1: instalar Docker Desktop
- Descárgalo de https://www.docker.com/products/docker-desktop/
- **Windows**: durante la instalación deja marcada la opción **WSL 2**. Puede pedir reiniciar.
- Ábrelo y espera a que diga *"Engine running"* (la ballenita en verde).

### Paso 2: descargar el proyecto
Opción A (con Git):
```bash
git clone https://github.com/stvnalc/mercaujap-microservicios.git
cd mercaujap-microservicios
```
Opción B (sin Git): en GitHub pulsa **Code → Download ZIP**, descomprímelo y abre una terminal dentro de esa carpeta.

> 💡 En Windows: abre la carpeta en el Explorador, escribe `cmd` en la barra de direcciones y pulsa Enter. Se abre una terminal ya ubicada ahí.

### Paso 3: (opcional) crear el `.env`
```bash
cp .env.example .env        # Mac / Linux / Git Bash
copy .env.example .env      # Windows (cmd)
```
Si te lo saltas no pasa nada: `docker-compose.yml` ya trae los mismos valores por defecto.

### Paso 4: levantar todo
```bash
docker compose up --build
```
- La **primera vez** tarda entre 3 y 10 minutos (descarga imágenes y compila Java y Go). Las siguientes veces es mucho más rápido.
- Vas a ver muchos mensajes de colores: son los logs de cada contenedor. Es normal.
- Está listo cuando ves líneas como `gateway-1 | ... start worker processes`.

Para verificar, en **otra** terminal:
```bash
docker compose ps
```
Todos los servicios deben decir `Up` y los que tienen healthcheck `(healthy)`.

### Paso 5: abrir la aplicación
👉 **http://localhost**

### Paso 6: apagar
- En la terminal donde corre: `Ctrl + C`
- O en otra terminal: `docker compose down`
- Para **borrar todos los datos** y empezar de cero: `docker compose down -v`

---

## 4. Recorrido por la aplicación (guion para la demo)

Este es un orden recomendado para **mostrarle el proyecto a la profesora** en 5 minutos:

1. **Mostrar la terminal** con `docker compose ps`: los 8 contenedores corriendo (2 bases de datos, 4 microservicios, frontend y gateway).
2. Abrir **http://localhost** → sección **Inicio**.
   - Abajo a la izquierda está el **estado de los servicios** (puntos verdes = vivos). Lo consulta el frontend cada 10 segundos por `/api/health/...`.
   - La tarjeta **Arquitectura** muestra el diagrama.
3. Ir a **Usuarios** (Python + PostgreSQL): crear un usuario nuevo. Intentar crear otro con el **mismo email** → error *"Ya existe un usuario con ese email"* (validación).
4. Ir a **Productos** (Node + MongoDB): crear o editar un producto. Fijarse en el **stock**.
5. Ir a **Órdenes** (Java):
   - Elegir un cliente, agregar 2 productos al carrito y pulsar **Crear orden**.
   - Volver a **Productos**: el **stock bajó**. ➜ *Java le pidió a Node que lo descontara* (comunicación entre microservicios).
   - Intentar comprar **más unidades de las que hay** → error *"Stock insuficiente"*.
   - Cambiar el estado de una orden a **CANCELADA** → el stock **regresa**.
6. Ir a **Inicio**: las estadísticas cambiaron. ➜ *Go consultó a Python, Node y Java al mismo tiempo para calcularlas.*
7. Ir a **Reportes** → **Generar y guardar reporte**: Go guarda una "foto" en PostgreSQL. Pulsar **Ver** para ver el JSON completo.
8. (Extra) Abrir **http://localhost:8001/docs**: documentación automática de la API de Python (Swagger). Se puede probar cada endpoint desde ahí.
9. (Extra) Demostrar tolerancia a fallos: `docker compose stop servicio-node` → en Inicio aparece el aviso *"No respondieron: productos (Node)"* y el punto se pone rojo, pero el resto sigue funcionando. Luego `docker compose start servicio-node`.

---

## 5. El viaje de una orden: qué pasa por dentro

Cuando pulsas **"Crear orden"** pasa esto:

```
 Navegador                Gateway           Java (órdenes)        Python (usuarios)    Node (productos)
    │  POST /api/ordenes     │                    │                      │                   │
    │──────────────────────► │  POST /ordenes     │                      │                   │
    │                        │──────────────────► │ GET /usuarios/1      │                   │
    │                        │                    │────────────────────► │  ¿existe? ✔       │
    │                        │                    │ ◄────────────────────│                   │
    │                        │                    │ GET /productos/abc   │                   │
    │                        │                    │────────────────────────────────────────► │ precio, stock
    │                        │                    │ ◄────────────────────────────────────────│
    │                        │                    │ PATCH /productos/abc/stock {-2}          │
    │                        │                    │────────────────────────────────────────► │ stock - 2
    │                        │                    │ ◄────────────────────────────────────────│
    │                        │                    │ INSERT en PostgreSQL (ordenes_db)        │
    │   201 Created + JSON   │ ◄──────────────────│                      │                   │
    │ ◄──────────────────────│                    │                      │                   │
```

1. El **frontend** (`frontend/app.js`) hace `fetch('/api/ordenes', { method: 'POST', body: {...} })`.
2. El **gateway** (`nginx/nginx.conf`) ve que la ruta empieza con `/api/ordenes` y la manda a `servicio-java:8080/ordenes`.
3. **Java** (`OrdenController.java` → `OrdenService.crear`):
   1. Llama a **Python** para validar el usuario (`ServiciosClient.obtenerUsuario`).
   2. Llama a **Node** para cada producto: precio y stock (`obtenerProducto`).
   3. Calcula subtotales y total. **El precio lo pone el servidor**, no el navegador (así nadie puede hacer trampa cambiando el precio).
   4. Le pide a **Node** descontar el stock (`ajustarStock`). Si falla a la mitad, **devuelve** lo que ya había descontado (*compensación*).
   5. Guarda la orden en **PostgreSQL** con JPA (`repo.save(orden)`).
4. La respuesta vuelve por el mismo camino hasta el navegador, que muestra *"Orden #1 creada"*.

> ¿Cómo sabe Java dónde está Python? En Docker Compose, **cada servicio se puede llamar por su nombre**: `http://servicio-python:8000`. Esa URL se le pasa a Java con la variable de entorno `USUARIOS_SERVICE_URL`.

---

## 6. Archivo por archivo

### 🐍 `servicio-python/` (Usuarios · FastAPI · SQLAlchemy · PostgreSQL)

| Archivo | Qué hace |
|---|---|
| `main.py` | Crea la app FastAPI y define los endpoints (`@app.get("/usuarios")`, `@app.post(...)`, etc.). Al arrancar crea la tabla y 3 usuarios de ejemplo. |
| `database.py` | Conexión a PostgreSQL con SQLAlchemy. Lee `DATABASE_URL` de las variables de entorno. |
| `models.py` | La clase `Usuario` = la tabla `usuarios` (columnas id, nombre, email...). |
| `schemas.py` | Reglas de validación con Pydantic (el email debe ser válido, el nombre mínimo 2 letras...). |
| `requirements.txt` | Librerías de Python que se instalan. |
| `Dockerfile` | Receta: parte de `python:3.12-slim`, instala librerías y ejecuta `uvicorn main:app`. |

Fragmento clave:
```python
@app.get("/usuarios")
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()     # SQLAlchemy genera: SELECT * FROM usuarios
```

### 🟩 `servicio-node/` (Productos · Express · Mongoose · MongoDB)

| Archivo | Qué hace |
|---|---|
| `index.js` | Servidor Express con los endpoints de productos. Conecta a MongoDB y carga 8 productos de ejemplo. |
| `producto.model.js` | El "esquema" de un producto (nombre, precio, stock, categoría, icono). |
| `package.json` | Librerías de Node (express, mongoose, cors, dotenv). |
| `Dockerfile` | Parte de `node:20-alpine`, instala con `npm ci` y ejecuta `node index.js`. |

Fragmento clave (descontar stock sin que dos compras simultáneas lo dejen negativo):
```js
// Solo actualiza si stock >= cantidad pedida. Es una operación ATÓMICA en MongoDB.
Producto.findOneAndUpdate({ _id: id, stock: { $gte: 2 } }, { $inc: { stock: -2 } })
```

### ☕ `servicio-java/` (Órdenes · Spring Boot · JPA · PostgreSQL)

Ruta: `src/main/java/com/ujap/ordenes/`

| Archivo | Qué hace |
|---|---|
| `OrdenesApplication.java` | Punto de arranque de Spring Boot. |
| `model/Orden.java`, `model/OrdenItem.java` | Entidades JPA (`@Entity`) = tablas `ordenes` y `orden_items`. Una orden tiene muchos items (`@OneToMany`). |
| `model/EstadoOrden.java` | Los estados posibles: PENDIENTE, PAGADA, ENVIADA, ENTREGADA, CANCELADA. |
| `repository/OrdenRepository.java` | Interfaz que extiende `JpaRepository`: Spring genera solo `findAll`, `save`, `deleteById`... |
| `controller/OrdenController.java` | Endpoints REST (`@GetMapping`, `@PostMapping`...). |
| `service/OrdenService.java` | **La lógica de negocio**: validar, calcular el total, descontar stock, compensar si falla. |
| `client/ServiciosClient.java` | **Comunicación con Python y Node** usando `RestClient` (peticiones HTTP). |
| `dto/*.java` | Forma del JSON que recibe (con validaciones `@NotNull`, `@Min`). |
| `exception/*.java` | Convierte los errores en JSON bonito: `{ "error": "Stock insuficiente..." }`. |
| `resources/application.properties` | Configuración: URL de la BD, usuario, contraseña, URLs de los otros servicios (todas desde variables de entorno). |
| `pom.xml` | Dependencias de Maven (Spring Web, Spring Data JPA, driver de PostgreSQL). |
| `Dockerfile` | **Dos etapas**: 1) compila con Maven, 2) copia solo el `.jar` a una imagen liviana con Java 21. |

### 🐹 `servicio-go/` (Reportes · Gin · GORM · PostgreSQL)

| Archivo | Qué hace |
|---|---|
| `main.go` | Arranque, conexión a PostgreSQL con GORM (`AutoMigrate` crea la tabla) y rutas de Gin. |
| `clientes.go` | **Llama a Python, Node y Java AL MISMO TIEMPO** usando *goroutines* (`go consultar(...)`) y `sync.WaitGroup`. |
| `reportes.go` | Calcula las estadísticas: ventas totales, ticket promedio, top productos, top clientes, ventas por categoría, stock bajo. |
| `modelos.go` | Structs: `Reporte` (tabla en PostgreSQL) y las estructuras de los JSON que llegan de los otros servicios. |
| `go.mod` / `go.sum` | Dependencias (gin, gorm, driver postgres, godotenv). |
| `Dockerfile` | Dos etapas: compila el binario y lo copia a una imagen `alpine` mínima (~20 MB). |

Fragmento clave (concurrencia en Go):
```go
wg.Add(3)
go consultar("usuarios (Python)", cfg.UsuariosURL+"/usuarios", &datos.Usuarios)
go consultar("productos (Node)", cfg.ProductosURL+"/productos", &datos.Productos)
go consultar("ordenes (Java)",   cfg.OrdenesURL+"/ordenes",     &datos.Ordenes)
wg.Wait()   // espera a que terminen las 3
```
Si uno de los servicios no responde, el reporte **igual se genera** y avisa cuál faltó.

### 🖥️ `frontend/`

| Archivo | Qué hace |
|---|---|
| `index.html` | La estructura de la página: menú lateral y 5 secciones. |
| `style.css` | Los estilos (colores, tarjetas, tablas, versión para celular). |
| `app.js` | La lógica: llama a la API con `fetch`, dibuja tablas/tarjetas, maneja el carrito. |
| `nginx.conf` | Nginx sirve los archivos y reenvía `/api/` al gateway (por si entras por el puerto 3000). |
| `Dockerfile` | Copia los archivos a una imagen de Nginx. |

### Otros archivos de la raíz

| Archivo | Qué hace |
|---|---|
| `docker-compose.yml` | Orquesta los 8 contenedores (ver sección 7). |
| `nginx/nginx.conf` + `nginx/Dockerfile` | Configuración del API Gateway (ver sección 8) y su imagen (`nginx:alpine` + la configuración). |
| `database/init.sql` + `database/Dockerfile` | Crea las 3 bases de datos en PostgreSQL la primera vez. La imagen es `postgres:16-alpine` + este script. |
| `.env.example` | Plantilla de variables de entorno. |
| `.gitignore` | Archivos que Git no sube (`.env`, `node_modules`, `target`...). |

---

## 7. `docker-compose.yml` explicado

Fragmento de un servicio:

```yaml
servicio-java:
  build: ./servicio-java            # construye la imagen con el Dockerfile de esa carpeta
  environment:                      # variables de entorno que recibe el programa
    DATABASE_URL: jdbc:postgresql://postgres:5432/ordenes_db
    DB_USER: ${DB_USER:-admin}      # toma DB_USER del .env; si no existe usa "admin"
    USUARIOS_SERVICE_URL: http://servicio-python:8000
  ports: ["8003:8080"]              # puerto de TU PC : puerto DENTRO del contenedor
  depends_on:
    postgres:
      condition: service_healthy    # no arranca hasta que PostgreSQL esté LISTO
  networks: [backend, frontend]     # redes a las que se conecta
  healthcheck:                      # cómo saber si está vivo
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
```

| Concepto | Para qué sirve en este proyecto |
|---|---|
| **networks** | `backend` = red interna (bases de datos + servicios). `frontend` = red del frontend y el gateway. Las bases de datos **solo** están en `backend`, así que no se pueden alcanzar desde fuera. |
| **healthcheck** | Cada servicio expone `/health`. Postgres usa `pg_isready` y Mongo usa `mongosh ping`. |
| **depends_on + service_healthy** | Evita que Python/Java/Go arranquen antes de que PostgreSQL esté listo, y que el gateway arranque antes que los servicios. |
| **volumes** | `pgdata` y `mongodata` guardan los datos. Si haces `docker compose down` **no se pierden**. Con `down -v` sí se borran. |
| **restart: unless-stopped** | Si un contenedor se cae, Docker lo vuelve a levantar. |

---

## 8. El API Gateway (Nginx) explicado

Archivo `nginx/nginx.conf`:

```nginx
upstream python_svc { zone python_svc 64k; server servicio-python:8000 resolve; }   # "python_svc" = dónde está Python

location /api/usuarios {
  proxy_pass http://python_svc/usuarios;   # /api/usuarios/5  →  servicio-python:8000/usuarios/5
}
```

Tabla de rutas:

| El navegador pide... | Nginx lo manda a... |
|---|---|
| `http://localhost/` | `frontend:80` (la página web) |
| `http://localhost/api/usuarios...` | `servicio-python:8000/usuarios...` |
| `http://localhost/api/productos...` | `servicio-node:3000/productos...` |
| `http://localhost/api/ordenes...` | `servicio-java:8080/ordenes...` |
| `http://localhost/api/reportes...` | `servicio-go:8080/reportes...` |
| `http://localhost/api/health/python` (node, java, go) | `/health` de cada servicio |

`servicio-python` es el **nombre del contenedor** en `docker-compose.yml`; el DNS interno de Docker lo traduce a una IP. La palabra `resolve` hace que Nginx vuelva a buscar esa IP si el contenedor se reinicia.

Ventajas: el frontend no necesita saber los puertos de cada servicio, no hay problemas de CORS (todo es el mismo origen) y si un servicio está caído Nginx responde un JSON claro (`503`).

Para ver por dónde pasa cada petición:
```bash
docker compose logs -f gateway
# 172.18.0.1 "GET /api/productos HTTP/1.1" -> 172.18.0.5:3000  [200] 0.004 s
```

---

## 9. Ver los datos dentro de las bases de datos

**PostgreSQL** (usuarios, órdenes y reportes):
```bash
docker compose exec postgres psql -U admin -d usuarios_db -c "SELECT * FROM usuarios;"
docker compose exec postgres psql -U admin -d ordenes_db  -c "SELECT * FROM ordenes;"
docker compose exec postgres psql -U admin -d ordenes_db  -c "SELECT * FROM orden_items;"
docker compose exec postgres psql -U admin -d reportes_db -c "SELECT id, created_at, total_ventas FROM reportes;"
```

**MongoDB** (productos):
```bash
docker compose exec mongodb mongosh productos_db --eval "db.productos.find().pretty()"
```

---

## 10. Preguntas que te puede hacer la profesora

**¿Por qué microservicios y no un solo programa?**
Cada servicio es independiente: se puede desarrollar, desplegar y escalar por separado, cada uno usa el lenguaje que más le conviene, y si uno falla los demás siguen funcionando (se puede demostrar apagando Node).

**¿Cómo se comunican los microservicios?**
Por **HTTP con JSON** (REST), usando el **nombre del servicio** como dirección dentro de la red de Docker (`http://servicio-node:3000`). Java usa `RestClient`, Go usa `net/http`.

**¿Por qué cada servicio tiene su propia base de datos?**
Es el patrón *database per service*: ningún servicio toca los datos de otro directamente; si los necesita, **se los pide por la API**. Por eso la orden guarda solo el `usuarioId` y el `productoId`.

**¿Por qué MongoDB para productos?**
Los productos son documentos con campos flexibles (descripción, icono, categoría...). En un catálogo es común agregar atributos nuevos sin cambiar un esquema rígido.

**¿Qué pasa si en una orden falla el segundo producto?**
Java ya descontó el stock del primero, así que lo **devuelve** (compensación). No hay transacción entre bases de datos distintas, así que se deshace manualmente. Esto es una versión simple del patrón **Saga**.

**¿Qué pasa si dos personas compran el último producto al mismo tiempo?**
Node descuenta el stock con una operación **atómica** de MongoDB (`findOneAndUpdate` con la condición `stock >= cantidad`). Solo una de las dos lo logra; la otra recibe `409 Stock insuficiente`.

**¿Qué hace el healthcheck?**
Docker ejecuta un comando cada 5 segundos para saber si el servicio está vivo. Con `depends_on: condition: service_healthy` un servicio espera a que su dependencia esté **lista** (no solo arrancada).

**¿Para qué sirven los volúmenes?**
Para que los datos de las bases de datos **sobrevivan** cuando se apagan los contenedores.

**¿Por qué el `.env` no está en GitHub?**
Porque tiene credenciales. Se sube un `.env.example` como plantilla. Además el compose trae valores por defecto para que el sistema levante igual.

**¿Qué es el ORM en cada servicio?**
Python → SQLAlchemy, Java → Spring Data JPA (Hibernate), Go → GORM, Node → Mongoose. Todos crean las tablas/colecciones automáticamente desde las clases/structs.

**¿Qué ventaja tiene el API Gateway?**
Un único punto de entrada (puerto 80), el frontend no conoce los puertos internos, se evita CORS y es un lugar central para logs, seguridad o balanceo de carga.

**¿Por qué los Dockerfile de Java y Go tienen dos `FROM`?**
Es un *multi-stage build*: la primera etapa tiene las herramientas para compilar (pesadas) y la segunda solo lo necesario para ejecutar. La imagen final queda mucho más liviana.

---

## 11. Problemas comunes y cómo resolverlos

| Problema | Solución |
|---|---|
| `Cannot connect to the Docker daemon` / `docker: command not found` | Abre **Docker Desktop** y espera a que esté en verde. |
| `port is already allocated` / `bind: address already in use` en el **puerto 80** | Otro programa usa el puerto 80 (en Windows suele ser IIS o Skype). En `docker-compose.yml`, servicio `gateway`, cambia `"80:80"` por `"8080:80"` y entra a http://localhost:8080 |
| Lo mismo con 3000, 8001... 8004 | Cambia el número de la **izquierda** en `ports` de ese servicio. |
| La página carga pero sale "No se pudo cargar..." | Algún servicio todavía está arrancando (Java tarda ~30 s). Espera y recarga. Revisa con `docker compose ps`. |
| Cambié el código y no se ve el cambio | Vuelve a ejecutar con `--build`: `docker compose up --build` |
| Quiero empezar con la base de datos limpia | `docker compose down -v` y luego `docker compose up --build` |
| Windows: error con WSL 2 | Ejecuta `wsl --update` en PowerShell como administrador y reinicia. |
| Se queda mucho tiempo en `servicio-java` compilando | Es normal la primera vez (Maven descarga dependencias). |

Ver logs de un servicio específico:
```bash
docker compose logs -f servicio-java
```

---

## 12. Glosario rápido

| Término | Significado |
|---|---|
| **Backend** | La parte que corre en el servidor (los microservicios y las bases de datos). |
| **Frontend** | Lo que ve el usuario en el navegador. |
| **REST** | Estilo de API con URLs + métodos HTTP + JSON. |
| **Endpoint** | Una URL concreta de la API (ej: `GET /productos`). |
| **CRUD** | Crear, Leer, Actualizar, Borrar. |
| **ORM / ODM** | Librería que traduce objetos del código a tablas (ORM) o documentos (ODM). |
| **Contenedor** | Programa empaquetado con todo lo que necesita, corriendo aislado. |
| **Imagen** | Plantilla a partir de la cual se crea un contenedor. |
| **Dockerfile** | Receta para construir una imagen. |
| **Volumen** | Carpeta persistente para que los datos no se pierdan. |
| **Reverse proxy** | Servidor que recibe peticiones y las reenvía a otros (eso hace Nginx). |
| **Healthcheck** | Prueba periódica para saber si un servicio está vivo. |
| **Goroutine** | Tarea ligera de Go que corre en paralelo. |
| **Swagger / OpenAPI** | Documentación interactiva de una API (FastAPI la genera sola en `/docs`). |
| **CORS** | Regla del navegador que bloquea llamadas a otros dominios/puertos salvo que el servidor lo permita. |
