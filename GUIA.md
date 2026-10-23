# 📘 Guía para entender MercaUJAP (desde cero)

Esta guía es para quien sabe poco de programación (o solo lo básico) y necesita **entender, ejecutar y explicar** el proyecto. Léela en orden, porque cada sección se apoya en la anterior.

**Integrantes:** Steven Alcalá · Jorge Fattal · Eyleen Berrio · Ricardo Elbazi

**Índice**

1. [¿Qué hace el sistema? (en palabras simples)](#1-qué-hace-el-sistema-en-palabras-simples)
2. [Conceptos que necesitas saber](#2-conceptos-que-necesitas-saber)
3. [Cómo ejecutarlo paso a paso](#3-cómo-ejecutarlo-paso-a-paso)
4. [Guion para la demo (5–7 minutos)](#4-guion-para-la-demo-57-minutos)
5. [El viaje de un pedido: qué pasa por dentro](#5-el-viaje-de-un-pedido-qué-pasa-por-dentro)
6. [Inicio de sesión y permisos: cómo funciona](#6-inicio-de-sesión-y-permisos-cómo-funciona)
7. [Archivo por archivo](#7-archivo-por-archivo)
8. [docker-compose.yml explicado](#8-docker-composeyml-explicado)
9. [El API Gateway (Nginx) explicado](#9-el-api-gateway-nginx-explicado)
10. [Ver los datos dentro de las bases de datos](#10-ver-los-datos-dentro-de-las-bases-de-datos)
11. [Preguntas que te puede hacer la profesora](#11-preguntas-que-te-puede-hacer-la-profesora)
12. [Problemas comunes y cómo resolverlos](#12-problemas-comunes-y-cómo-resolverlos)
13. [Glosario rápido](#13-glosario-rápido)

---

## 1. ¿Qué hace el sistema? (en palabras simples)

MercaUJAP es el **panel de gestión de una tienda de tecnología**: lo que usa el personal (administradores y vendedores) para:

- Registrar **pedidos** de los clientes y llevarlos de *pendiente* a *pagado*, *enviado* y *entregado* (o cancelarlos). Al pagar se guarda el **banco** y **solo el número de referencia**; al despachar, la **empresa de envío** (MRW, Zoom, Tealca…) y el **número de guía**, cada dato en su propio campo.
- Trabajar **en equipo y en tiempo real**: si un compañero hace un cambio, tu pantalla se actualiza sola (sin recargar la página) y te avisa quién lo hizo.
- Controlar el **catálogo**: precios, costos, cuánto se gana con cada producto (margen) y cuántas unidades hay (stock).
- Ver el **historial de inventario**: cada unidad que entra o sale queda anotada con su motivo (*kardex*).
- Gestionar **clientes** y su historial de compras.
- Ver un **panel con indicadores** (ventas, ganancia, productos más vendidos, etc.) y generar **reportes** descargables en Excel.

### La analogía del restaurante 🍽️

En vez de tener **un solo programa gigante** que hace todo (eso se llama *monolito*), el sistema está dividido en **4 programas pequeños** llamados **microservicios**. Cada uno hace **una sola cosa**, está escrito en un lenguaje diferente y tiene **su propia base de datos**:

| En el restaurante... | En MercaUJAP | Lenguaje |
|---|---|---|
| La recepción: lista de clientes y control de quién es empleado | **Clientes y autenticación** | 🐍 Python |
| El almacén, con su libreta de entradas y salidas | **Catálogo e inventario** | 🟩 Node.js |
| El mesero que toma y sigue cada pedido | **Pedidos** | ☕ Java |
| El contador que saca las cuentas | **Reportes** | 🐹 Go |
| El portero que revisa tu carnet y te manda a la mesa correcta | **API Gateway** | Nginx |
| El menú y la pantalla que ve el personal | **Frontend** (la página web) | React + shadcn/ui |

Cuando el **mesero (Java)** toma un pedido, le pregunta a la **recepción (Python)** si ese cliente existe, y le pregunta al **almacén (Node)** cuánto cuesta cada cosa y si hay suficiente. Si todo está bien, el almacén descuenta lo vendido y lo anota en su libreta. Eso es la **comunicación entre microservicios**.

---

## 2. Conceptos que necesitas saber

### 🌐 API y endpoint
Una **API** es la forma en que un programa le ofrece servicios a otros programas por la red. Cada "puerta" de la API se llama **endpoint**: una dirección (URL) + un método.

Ejemplo: `GET http://localhost:8080/api/productos` significa *"dame la lista de productos"*.

### 📨 Métodos HTTP (los verbos)

| Método | Para qué | Ejemplo en el proyecto |
|---|---|---|
| `GET` | Leer / consultar | `GET /api/usuarios` → lista de clientes |
| `POST` | Crear algo nuevo | `POST /api/ordenes` → crea un pedido |
| `PUT` | Editar | `PUT /api/productos/{id}` → edita un producto |
| `PATCH` | Cambiar una parte | `PATCH /api/ordenes/{id}/estado` → cambia solo el estado |
| `DELETE` | Borrar | `DELETE /api/usuarios/3` → borra al usuario 3 |

Esto es lo que se conoce como **CRUD** (Create, Read, Update, Delete).

### 📄 JSON
Es el formato de texto en el que los servicios se mandan datos:

```json
{ "id": 1, "nombre": "María González", "email": "maria.gonzalez@gmail.com", "rol": "cliente" }
```

### 🔢 Códigos de respuesta
- `200` OK · `201` Creado · `204` Borrado (sin contenido)
- `400` Datos malos · `401` No iniciaste sesión · `403` No tienes permiso · `404` No existe · `409` Conflicto (ej: no hay stock) · `422` Datos inválidos · `429` Demasiados intentos
- `500` Error del servidor · `503` Servicio no disponible

### 🧱 Microservicio
Un programa pequeño e independiente con **su propia base de datos** que hace una sola tarea. Ventajas: si uno se cae los demás siguen, cada uno puede usar el lenguaje que mejor le quede, y se pueden actualizar por separado.

### 🐳 Docker: imagen y contenedor
- **Imagen**: una "receta congelada" con el programa y **todo lo que necesita** (Python, librerías, etc.). Se crea con un `Dockerfile`.
- **Contenedor**: una imagen **ejecutándose**. Es como una mini computadora aislada.

Por eso **no necesitas instalar Python, Java, Node ni Go** en tu computadora: cada contenedor ya los trae.

### 🎼 Docker Compose
Un archivo (`docker-compose.yml`) que describe **todos** los contenedores del sistema y cómo se conectan. Con un solo comando (`docker compose up --build`) se crean y arrancan los 8 contenedores.

### 🗄️ Bases de datos SQL vs NoSQL

| | SQL (PostgreSQL) | NoSQL (MongoDB) |
|---|---|---|
| Cómo guarda | **Tablas** con filas y columnas fijas | **Documentos** JSON flexibles |
| Ejemplo | Tabla `ordenes` con columnas id, código, total… | Colección `productos` con documentos `{ sku, nombre, precio, stock… }` |
| Lo usan | Python, Java y Go | Node |

### 🔁 ORM
Un **ORM** es una librería que te deja trabajar con la base de datos usando **clases u objetos** de tu lenguaje en vez de escribir SQL a mano. Ejemplo: en vez de `SELECT * FROM ordenes`, en Java se escribe `repo.findAll()`.

| Servicio | ORM |
|---|---|
| Python | SQLAlchemy |
| Java | Spring Data JPA (Hibernate) |
| Go | GORM |
| Node | Mongoose (para MongoDB se le dice *ODM*) |

### 🔑 Token JWT (inicio de sesión)
Cuando inicias sesión, Python te entrega un **token**: un texto largo **firmado** que dice "esta persona es Andrea, administradora, válido por 8 horas". El navegador lo envía en cada petición (`Authorization: Bearer <token>`). Como está firmado con una clave secreta, nadie puede falsificarlo ni cambiarle el rol.

### 🔐 Variables de entorno (`.env`)
Contraseñas y configuraciones **no se escriben dentro del código**: se ponen en un archivo `.env` que **no se sube a GitHub** (por eso está en `.gitignore`). En el repositorio está `.env.example` como plantilla.

### 🚪 API Gateway y el puerto único
Una **puerta de entrada única**. Todo entra por **un solo puerto**, `http://localhost:8080`, y **Nginx** reparte cada petición al servicio correcto según la ruta (`/api/usuarios` → Python en el puerto 8000, `/api/productos` → Node en el 3000…). Los demás contenedores **no abren puertos** en tu PC: solo se puede llegar a ellos a través del gateway. Además **revisa el token** antes de dejar pasar cada petición.

### ⚡ WebSocket (tiempo real)
Normalmente el navegador **pregunta** y el servidor **responde** (HTTP). Con un **WebSocket** la conexión queda **abierta** y el servidor puede **avisarle** al navegador cuando algo cambia, sin que el navegador pregunte. Así, si Luis registra un pago, la pantalla de Andrea se actualiza sola al instante. Es lo mismo que usan los chats.

### ⚛️ React y shadcn/ui
- **React** es una librería para construir interfaces con **componentes**: piezas reutilizables como `<Button>`, `<Card>` o `<TablaDatos>`.
- **Tailwind CSS** permite dar estilo con clases cortas en el mismo HTML (`p-4` = padding, `rounded-lg` = bordes redondeados).
- **shadcn/ui** es una colección de componentes ya diseñados (botones, tablas, diálogos, menús, gráficos) que se **copian dentro del proyecto** (`frontend/src/components/ui/`), así que se pueden leer y modificar.
- **Vite** convierte todo eso en archivos HTML/CSS/JS normales. Eso ocurre dentro de Docker al construir la imagen del frontend.

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

### Paso 3: levantar todo
```bash
docker compose up --build
```
- La **primera vez** tarda entre 3 y 10 minutos (descarga imágenes y compila Java, Go y React). Las siguientes veces es mucho más rápido.
- Vas a ver muchos mensajes de colores: son los logs de cada contenedor. Es normal.
- Cuando aparezca `[java] Datos demo: 84 pedidos de ejemplo creados`, ya está todo listo.

> El `.env` es **opcional**: si no lo creas, `docker-compose.yml` usa los mismos valores por defecto. Si quieres cambiarlos: `cp .env.example .env` (Mac/Linux) o `copy .env.example .env` (Windows).

Para verificar, en **otra** terminal:
```bash
docker compose ps
```
Todos los servicios deben decir `Up` y los que tienen healthcheck `(healthy)`.

### Paso 4: abrir la aplicación e iniciar sesión
👉 **http://localhost:8080**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@mercaujap.com` | `admin123` |
| Vendedor | `vendedor@mercaujap.com` | `vendedor123` |

En la pantalla de inicio hay un recuadro **"Cuentas de demostración"**: al hacer clic en una se llenan los campos solos.

### Paso 5: apagar
- En la terminal donde corre: `Ctrl + C`
- O en otra terminal: `docker compose down`
- Para **borrar todos los datos** y volver a los datos de ejemplo: `docker compose down -v`

---

## 4. Guion para la demo (5–7 minutos)

Orden recomendado para **mostrarle el proyecto a la profesora**:

1. **Terminal**: `docker compose ps` → los 8 contenedores corriendo (2 bases de datos, 4 microservicios, frontend y gateway).
2. **Inicio de sesión** como administrador en **http://localhost:8080**. Antes, mostrar que sin sesión la API no responde: `curl -i http://localhost:8080/api/productos` → `401`. *El gateway protege todo.* Mostrar también que `docker compose ps` solo tiene **un puerto publicado (8080)**: todo pasa por el gateway.
3. **Panel**: ventas, pedidos, ticket promedio y ganancia, con comparación contra el período anterior. Cambiar entre 7 / 30 / 90 días.
   ➜ *Estos números los calcula Go consultando a Python, Node y Java al mismo tiempo.*
4. **Nuevo pedido** (botón morado de la barra lateral):
   - Elegir un cliente (la dirección se completa sola).
   - Agregar 2 productos, subir la cantidad de uno con el **+**. Ver el subtotal, el **IVA 16 %** y el total.
   - **Registrar pedido** → se abre el detalle con su código `PED-0000xx`.
   ➜ *Java le preguntó a Python si el cliente existe, a Node el precio y el stock, y luego le pidió a Node descontar las unidades.*
5. En el detalle del pedido: **Registrar pago** → el formulario se abre **ahí mismo** en la página: elegir el **banco** y escribir **solo el número de referencia** (si escribes letras, no las acepta). Luego **Marcar como enviado** → elegir la **empresa de envío** y el **número de guía**. Ver cómo avanza la barra de progreso y el **historial** ("Pago móvil · Banesco · Ref. 004512", "MRW · Guía 7745120").
   - Mostrar el botón **Imprimir**, que genera la nota de entrega.
6. **Productos** → hacer clic en el producto vendido: su detalle se abre **dentro de la tabla**, debajo de la fila, sin tapar nada. El stock bajó y en **Historial de movimientos** aparece `Venta · PED-0000xx`. Hacer una **Entrada** de 10 unidades ("Compra a proveedor"). **Editar** abre el formulario en el mismo lugar.
7. ⚡ **Tiempo real** (lo más vistoso): abrir una **segunda ventana** (por ejemplo en modo incógnito, o con `http://127.0.0.1:8080`) e iniciar sesión como **vendedor**. Arriba, junto a **"En vivo"**, aparece el avatar del otro usuario. Poner las dos ventanas lado a lado en la misma pantalla (Productos o el mismo pedido) y hacer un cambio en una: en la otra aparece el aviso *"Luis Herrera: Ajustó el stock de…"*, el dato cambia solo y la fila se ilumina. Si las dos editan el mismo producto, el formulario avisa *"Otra persona modificó este producto"*.
8. **Cancelar** un pedido pendiente (pide el motivo) → el stock **regresa** (aparece "Pedido cancelado" en el historial de movimientos).
9. **Reportes** → **Generar reporte** → "Mes anterior" → se guarda y se puede **Descargar CSV** (abre en Excel).
10. **Roles**: cerrar sesión y entrar como **vendedor**. No aparece *Equipo* ni las opciones de *Eliminar*. Aunque intentara borrar algo por la API, el gateway responde `403`.
11. **Tolerancia a fallos** (extra): `docker compose stop servicio-node` → el panel muestra *"Datos incompletos: no respondieron Productos"*, el indicador de tiempo real pasa a **"Sin conexión"**, pero pedidos, clientes y reportes siguen funcionando. Luego `docker compose start servicio-node` → en unos segundos vuelve a **"En vivo"** solo.
12. (Extra) Swagger de Python: levantar con `docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d` y abrir **http://localhost:8001/docs**.

Otros detalles para mostrar: el buscador global (**Ctrl + K**), el tema oscuro (icono de luna), las notificaciones (campana: pestaña **Alertas** de stock y pedidos, y pestaña **Actividad** con lo que hizo el equipo) y la vista en celular.

---

## 5. El viaje de un pedido: qué pasa por dentro

Cuando pulsas **"Registrar pedido"** pasa esto:

```
 Navegador          Gateway (Nginx)        Python            Java (pedidos)              Node (productos)
    │ POST /api/ordenes  │                    │                    │                           │
    │ + token            │                    │                    │                           │
    │──────────────────► │ /auth/verificar    │                    │                           │
    │                    │──────────────────► │ ¿token válido? ✔   │                           │
    │                    │ ◄──────────────────│ (Andrea, admin)    │                           │
    │                    │ POST /ordenes + X-Usuario-Nombre        │                           │
    │                    │───────────────────────────────────────► │                           │
    │                    │                    │ ◄──────────────────│ GET /usuarios/1 (¿existe?)│
    │                    │                    │──────────────────► │                           │
    │                    │                    │                    │ GET /productos/abc ──────►│ precio, stock
    │                    │                    │                    │ ◄─────────────────────────│
    │                    │                    │                    │ guarda PED-000085         │
    │                    │                    │                    │ PATCH /stock {-2, Venta}─►│ stock - 2
    │                    │                    │                    │ ◄─────────────────────────│ + movimiento
    │  201 + JSON        │ ◄───────────────────────────────────────│                           │
    │ ◄──────────────────│                    │                    │                           │
```

1. El **frontend** (`frontend/src/pages/pedidos/nuevo.jsx`) llama a `api('/ordenes', { method: 'POST', body })`, que agrega el token.
2. El **gateway** (`nginx/nginx.conf`) primero le pregunta a Python si el token es válido (`auth_request`). Si lo es, reenvía la petición a `servicio-java` con el nombre del usuario en una cabecera.
3. **Java** (`OrdenController.java` → `OrdenService.crear`):
   1. Llama a **Python** para validar el cliente (debe existir y estar activo).
   2. Llama a **Node** por cada producto para tomar el precio y revisar el stock.
   3. Calcula subtotal, **IVA 16 %** y total. **El precio lo pone el servidor**, no el navegador, así nadie puede hacer trampa cambiándolo.
   4. Guarda el pedido en **PostgreSQL** para obtener su número y su código `PED-000085`.
   5. Le pide a **Node** descontar el stock. Node lo registra como movimiento `Venta PED-000085`. Si falla a la mitad, Java **devuelve** lo que ya había descontado y borra el pedido (*compensación*).
4. La respuesta vuelve por el mismo camino y el navegador abre el detalle del pedido.

### El ciclo de vida de un pedido (máquina de estados)

```
  PENDIENTE ──► PAGADO ──► ENVIADO ──► ENTREGADO      (delivery o envío nacional)
      │            │  └──────────────► ENTREGADO      (retiro en tienda: no se envía)
      └────────────┴──────► CANCELADO   (devuelve el stock)
```

Java no deja hacer saltos inválidos. Por ejemplo, pasar de *pendiente* a *entregado* responde `409: No se puede pasar de PENDIENTE a ENTREGADA`. La regla está en `EstadoOrden.java` (método `siguientes()`), y el frontend solo muestra los botones de los pasos permitidos.

Cada paso **pide sus propios datos**, y cada uno se guarda en su **propia columna** de la base de datos (no todo junto en un texto):

| Paso | Qué se registra | Validación (en Java) |
|---|---|---|
| Crear | Forma de entrega (retiro, delivery o envío nacional) y empresa de envío preferida | Delivery y envío nacional necesitan dirección |
| **Pagado** | Método de pago, **banco** (código: 0134 Banesco, 0102 Venezuela…) y **número de referencia** | Pago móvil y transferencia: banco obligatorio y referencia **solo con números**. Zelle: letras y números. Efectivo: nada |
| **Enviado** | **Empresa de envío** (MRW, Zoom, Tealca, Domesa, Liberty Express) y **número de guía** | Envío nacional: empresa y guía obligatorias |
| **Entregado** | Quién lo recibió | Opcional |
| **Cancelado** | Motivo | Obligatorio |

Gracias a esto se puede **buscar un pedido por su número de guía o de referencia**, y los reportes muestran las ventas por cada empresa de envío.

### ⚡ Tiempo real: cómo se enteran los demás

```
 Luis (vendedor)          Gateway            Java               Node (WebSocket)        Andrea (admin)
    │ PATCH .../estado      │                  │                     │  conexión abierta ════ │
    │──────────────────────►│─────────────────►│ guarda el pago      │                        │
    │                       │                  │ POST /interno/eventos ──►                    │
    │ ◄─────────────────────│◄─────────────────│                     │ "Luis confirmó el pago │
    │                       │                  │                     │  de PED-000083" ══════►│ la pantalla
    │                       │                  │                     │                        │ se actualiza sola
```

1. Al iniciar sesión, el navegador abre **una** conexión WebSocket a `ws://localhost:8080/api/tiempo-real`. El gateway la valida igual que cualquier petición (con el token) y la pasa a **Node** (`servicio-node/tiempo-real.js`).
2. Cada vez que un servicio cambia algo, **avisa a Node**: Python (clientes, equipo), Java (pedidos) y Go (reportes) hacen un `POST http://servicio-node:3000/interno/eventos`. Node también avisa sus propios cambios (productos y stock). Esa ruta **no está en el gateway**, así que nadie la puede llamar desde fuera.
3. Node reenvía el aviso a **todos los navegadores conectados**.
4. En el navegador (`frontend/src/lib/tiempo-real.jsx`), cada pantalla sabe de qué datos depende y **se vuelve a cargar sola, sin parpadear**. Además aparece un aviso con el nombre de quien hizo el cambio, la fila se ilumina y queda en la pestaña *Actividad* de la campana.
5. Si se corta la conexión, el indicador pasa a *Sin conexión* y se reconecta solo (espera 1 s, 2 s, 4 s… hasta 30 s).

> ¿Cómo sabe Java dónde está Python? En Docker Compose, **cada servicio se puede llamar por su nombre**: `http://servicio-python:8000`. Esa URL se le pasa a Java con la variable de entorno `USUARIOS_SERVICE_URL`.

---

## 6. Inicio de sesión y permisos: cómo funciona

1. En la pantalla de login, el navegador envía correo y contraseña a `POST /api/auth/login` (Python).
2. Python busca al usuario y compara la contraseña con su **hash** (las contraseñas nunca se guardan en texto plano: se guarda una huella PBKDF2 con *sal*). Si coincide, crea un **token JWT** válido por 8 horas.
3. El navegador guarda el token y lo envía en cada petición.
4. **Nginx** tiene esta línea en cada ruta protegida:
   ```nginx
   auth_request /_auth;   # antes de seguir, pregúntale a Python si el token es bueno
   ```
   Python responde `200` (adelante), `401` (sin sesión o token vencido) o `403` (no tienes permiso, por ejemplo un vendedor intentando borrar).
5. Si es `200`, Nginx pasa al servicio el nombre y el rol del usuario en cabeceras (`X-Usuario-Nombre`, `X-Usuario-Rol`). Así Java puede anotar en el historial *"pagado por Andrea Salazar"* sin saber nada de tokens.

| Acción | Administrador | Vendedor |
|---|---|---|
| Ver todo, crear y editar pedidos, clientes y productos | ✅ | ✅ |
| Eliminar cualquier registro | ✅ | ❌ (lo bloquea el gateway) |
| Crear o editar cuentas del personal (sección *Equipo*) | ✅ | ❌ (lo bloquea Python) |

Además: hay un límite de **10 intentos de login por minuto** (contra ataques de fuerza bruta), y un usuario desactivado pierde el acceso de inmediato aunque tenga un token.

---

## 7. Archivo por archivo

### 🐍 `servicio-python/` (Clientes y autenticación · FastAPI · SQLAlchemy · PostgreSQL)

| Archivo | Qué hace |
|---|---|
| `main.py` | Crea la app FastAPI y define los endpoints de `/auth/...` y `/usuarios/...`. Al arrancar crea la tabla y carga 12 clientes y 2 cuentas del personal. Traduce los errores de validación al español. |
| `seguridad.py` | Hash de contraseñas (PBKDF2) y creación/lectura de tokens JWT. |
| `models.py` | La clase `Usuario` = la tabla `usuarios` (nombre, email, documento, rol, activo, contraseña…). |
| `schemas.py` | Reglas de validación con Pydantic (email válido, cédula con formato `V-12345678`…). |
| `database.py` | Conexión a PostgreSQL con SQLAlchemy y reintentos si la BD todavía está arrancando. |
| `requirements.txt` · `Dockerfile` | Librerías e imagen (`python:3.12-slim` + `uvicorn main:app`). |

Fragmento clave:
```python
@app.post("/auth/login")
def login(datos, db):
    usuario = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if usuario is None or not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(401, "Correo o contraseña incorrectos")
    token, expira = crear_token(usuario.id, usuario.rol)
```

### 🟩 `servicio-node/` (Catálogo e inventario · Express · Mongoose · MongoDB)

| Archivo | Qué hace |
|---|---|
| `index.js` | Servidor Express con los endpoints de productos y movimientos. Conecta a MongoDB y carga 16 productos de ejemplo. Recibe los avisos de los otros servicios en `POST /interno/eventos`. |
| `tiempo-real.js` | **Servidor WebSocket** (librería `ws`): guarda quién está conectado y envía los avisos a todos los navegadores. |
| `producto.model.js` | Esquema del producto: SKU, nombre, marca, categoría, precio, costo, stock, stock mínimo. Calcula `estadoStock` (disponible/bajo/agotado) y `margen`. |
| `movimiento.model.js` | Esquema del **kardex**: cada entrada/salida con motivo, referencia, usuario y stock antes/después. |
| `datos-iniciales.js` | El catálogo de ejemplo. |
| `package.json` · `Dockerfile` | Librerías (express, mongoose…) e imagen `node:20-alpine`. |

Fragmento clave (descontar stock sin que dos compras simultáneas lo dejen negativo):
```js
// Solo actualiza si stock >= cantidad pedida. Es una operación ATÓMICA en MongoDB.
Producto.findOneAndUpdate({ _id: id, stock: { $gte: 2 } }, { $inc: { stock: -2 } })
```

### ☕ `servicio-java/` (Pedidos · Spring Boot · JPA · PostgreSQL)

Ruta: `src/main/java/com/ujap/ordenes/`

| Archivo | Qué hace |
|---|---|
| `model/Orden.java`, `OrdenItem.java`, `HistorialEstado.java` | Entidades JPA = tablas `ordenes`, `orden_items` y `orden_historial`. |
| `model/EstadoOrden.java` | Los estados y **qué cambios están permitidos** (máquina de estados). |
| `model/MetodoPago.java` | Pago móvil, transferencia, tarjeta, efectivo, Zelle, y **qué dato pide cada uno** (referencia solo numérica, banco…). |
| `model/MetodoEntrega.java` · `EmpresaEnvio.java` · `Bancos.java` | Retiro en tienda / delivery / envío nacional; MRW, Zoom, Tealca, Domesa, Liberty Express; y la lista de bancos con su código. |
| `repository/OrdenRepository.java` + `OrdenFiltros.java` | Acceso a la BD. Los filtros (estado, cliente, fechas, búsqueda) se arman dinámicamente con *Specifications*. |
| `controller/OrdenController.java` | Endpoints REST (`@GetMapping`, `@PostMapping`…). |
| `service/OrdenService.java` | **La lógica de negocio**: validar, calcular IVA, descontar stock, compensar si falla, cambiar estado. |
| `client/ServiciosClient.java` | **Comunicación con Python y Node** usando `RestClient` (peticiones HTTP), incluido el aviso de tiempo real. |
| `demo/DatosDemo.java` | Al primer arranque crea ~80 pedidos de ejemplo usando la misma lógica de un pedido real. |
| `dto/*.java` · `exception/*.java` | Forma del JSON que recibe (con validaciones) y errores en JSON (`{ "error": "..." }`). |
| `resources/application.properties` | Configuración (BD, URLs de los otros servicios, IVA) desde variables de entorno. |
| `pom.xml` · `Dockerfile` | Dependencias de Maven. Imagen en **dos etapas**: compila con Maven y copia solo el `.jar`. |

### 🐹 `servicio-go/` (Reportes · Gin · GORM · PostgreSQL)

| Archivo | Qué hace |
|---|---|
| `main.go` | Arranque, conexión con GORM (`AutoMigrate` crea la tabla) y rutas de Gin. |
| `clientes.go` | **Llama a Python, Node y Java AL MISMO TIEMPO** usando *goroutines* y `sync.WaitGroup`. |
| `reportes.go` | Calcula los indicadores de un período: ventas, IVA, ganancia bruta, margen, ventas por día, por categoría y por método de pago, top productos y clientes, comparación con el período anterior. |
| `csv.go` | Genera el archivo CSV para Excel. |
| `reportes_test.go` | **Pruebas unitarias** del cálculo (`go test`). Si fallan, la imagen no se construye. |
| `modelos.go` · `go.mod` · `Dockerfile` | Structs, dependencias e imagen en dos etapas (`alpine`, ~20 MB). |

Fragmento clave (concurrencia en Go):
```go
wg.Add(3)
go consultar("Clientes",  cfg.UsuariosURL+"/usuarios",   &datos.Usuarios)
go consultar("Productos", cfg.ProductosURL+"/productos", &datos.Productos)
go consultar("Pedidos",   cfg.OrdenesURL+"/ordenes",     &datos.Ordenes)
wg.Wait()   // espera a que terminen las 3
```
Si uno de los servicios no responde, el panel **igual se calcula** y avisa cuál faltó.

### 🖥️ `frontend/` (React · Vite · Tailwind · shadcn/ui)

| Carpeta / archivo | Qué hace |
|---|---|
| `src/main.jsx` · `src/App.jsx` | Punto de entrada y **rutas** (`/pedidos`, `/productos/…`). Si no hay sesión muestra el login. |
| `src/lib/api.js` | **Todas las llamadas a la API** pasan por aquí: agrega el token y convierte los errores en mensajes. |
| `src/lib/auth.jsx` | Guarda la sesión del usuario (login, logout, rol). |
| `src/lib/tiempo-real.jsx` | Abre el **WebSocket**, se reconecta si se cae, muestra los avisos y le dice a cada pantalla cuándo recargarse. |
| `src/hooks/use-api.js` | Carga datos de la API y los **recarga sola** cuando llega un aviso de tiempo real. |
| `src/lib/format.js` | Formatos de dinero (`$1.234,56`), fechas y nombres de estados. |
| `src/pages/` | Una pantalla por archivo: `dashboard.jsx`, `pedidos/lista.jsx`, `pedidos/nuevo.jsx`, `pedidos/detalle.jsx`, `productos.jsx`, `clientes.jsx`, `inventario.jsx`, `reportes.jsx`, `equipo.jsx`, `perfil.jsx`, `login.jsx`. |
| `src/components/` | Piezas propias: barra lateral, buscador (Ctrl+K), notificaciones, indicador *En vivo*, tabla con orden, paginación y **filas que se abren**, y `panel-en-linea.jsx` (los formularios que aparecen dentro de la página). |
| `src/components/ui/` | Componentes de **shadcn/ui** (botón, tarjeta, tabla, selectores, menús, gráficos…). |
| `Dockerfile` | Dos etapas: `node` compila la app con `npm run build` y `nginx` sirve el resultado. |

Ejemplo de cómo se ve un componente de React con shadcn/ui:
```jsx
<Card>
  <CardHeader><CardTitle>Ventas diarias</CardTitle></CardHeader>
  <CardContent>
    <ChartContainer config={...}><AreaChart data={r.ventasPorDia}>...</AreaChart></ChartContainer>
  </CardContent>
</Card>
```

### Otros archivos de la raíz

| Archivo | Qué hace |
|---|---|
| `docker-compose.yml` | Orquesta los 8 contenedores (ver sección 8). |
| `docker-compose.debug.yml` | Opcional, solo para depurar: abre el puerto de cada servicio en tu PC. |
| `docs/MercaUJAP-Guia.pdf` | Esta guía en PDF. |
| `nginx/nginx.conf` + `Dockerfile` | API Gateway (ver sección 9). |
| `database/init.sql` + `Dockerfile` | Crea las 3 bases de datos de PostgreSQL la primera vez. |
| `.env.example` | Plantilla de variables de entorno. |
| `.gitignore` | Archivos que Git no sube (`.env`, `node_modules`, `target`…). |

---

## 8. `docker-compose.yml` explicado

Fragmento de un servicio:

```yaml
servicio-java:
  build: ./servicio-java            # construye la imagen con el Dockerfile de esa carpeta
  environment:                      # variables de entorno que recibe el programa
    DATABASE_URL: jdbc:postgresql://postgres:5432/ordenes_db
    DB_USER: ${DB_USER:-admin}      # toma DB_USER del .env; si no existe usa "admin"
    USUARIOS_SERVICE_URL: http://servicio-python:8000
  # sin "ports": Java NO se ve desde tu PC, solo el gateway le habla por la red interna
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
| **ports** | Solo el **gateway** tiene `ports: ["${PUERTO:-8080}:8080"]` (puerto de TU PC : puerto DENTRO del contenedor). Es el **único puerto** del sistema; desde ahí se reparte a los demás. |
| **healthcheck** | Cada servicio expone `/health`. Postgres usa `pg_isready` y Mongo usa `mongosh ping`. |
| **depends_on + service_healthy** | Evita que los servicios arranquen antes que su base de datos, y el gateway antes que los servicios. |
| **volumes** | `pgdata` y `mongodata` guardan los datos. Con `docker compose down` **no se pierden**. Con `down -v` sí se borran. |
| **restart: unless-stopped** | Si un contenedor se cae, Docker lo vuelve a levantar. |

---

## 9. El API Gateway (Nginx) explicado

Archivo `nginx/nginx.conf`:

```nginx
upstream java_svc { zone java_svc 64k; server servicio-java:8080 resolve; }   # dónde está Java

location /api/ordenes {
  auth_request /_auth;                                         # 1) ¿el token es válido?
  auth_request_set $usuario_nombre $upstream_http_x_usuario_nombre;
  proxy_pass http://java_svc/ordenes;                          # 2) /api/ordenes/5 → servicio-java:8080/ordenes/5
}
```

| El navegador pide... | Nginx lo manda a... | ¿Requiere sesión? |
|---|---|---|
| `http://localhost:8080/` | `frontend:80` (la página web) | No |
| `/api/auth/login` | `servicio-python:8000/auth/login` | No (máx. 10 por minuto) |
| `/api/usuarios...` | `servicio-python:8000/usuarios...` | Sí |
| `/api/productos...` · `/api/movimientos` | `servicio-node:3000/...` | Sí |
| `/api/tiempo-real` (WebSocket) | `servicio-node:3000/tiempo-real` | Sí (el token va en `Sec-WebSocket-Protocol`) |
| `/api/ordenes...` | `servicio-java:8080/ordenes...` | Sí |
| `/api/reportes...` | `servicio-go:8080/reportes...` | Sí |
| `/api/health/python` (node, java, go, gateway) | `/health` de cada servicio | No |

`servicio-python` es el **nombre del contenedor** en `docker-compose.yml`; el DNS interno de Docker lo traduce a una IP. La palabra `resolve` hace que Nginx vuelva a buscar esa IP si el contenedor se reinicia.

Ventajas: el frontend no necesita saber los puertos de cada servicio, no hay problemas de CORS (todo es el mismo origen), la seguridad está **en un solo lugar** y si un servicio está caído Nginx responde un JSON claro (`503`).

Para ver por dónde pasa cada petición:
```bash
docker compose logs -f gateway
# 172.18.0.1 [a1b2c3...] "GET /api/productos" -> 172.18.0.5:3000 [200] 0.004 s
```

---

## 10. Ver los datos dentro de las bases de datos

**PostgreSQL** (usuarios, pedidos y reportes):
```bash
docker compose exec postgres psql -U admin -d usuarios_db -c "SELECT id, nombre, email, rol, activo FROM usuarios;"
docker compose exec postgres psql -U admin -d ordenes_db  -c "SELECT id, codigo, usuario_nombre, estado, total FROM ordenes ORDER BY id DESC LIMIT 10;"
docker compose exec postgres psql -U admin -d ordenes_db  -c "SELECT * FROM orden_historial ORDER BY id DESC LIMIT 10;"
docker compose exec postgres psql -U admin -d reportes_db -c "SELECT id, titulo, total_ventas FROM reportes;"
```

**MongoDB** (productos y movimientos):
```bash
docker compose exec mongodb mongosh productos_db --eval "db.productos.find({}, {sku:1, nombre:1, stock:1})"
docker compose exec mongodb mongosh productos_db --eval "db.movimientos.find().sort({fecha:-1}).limit(5)"
```

---

## 11. Preguntas que te puede hacer la profesora

**¿Por qué microservicios y no un solo programa?**
Cada servicio es independiente: se puede desarrollar, desplegar y escalar por separado, cada uno usa el lenguaje que más le conviene, y si uno falla los demás siguen funcionando (se puede demostrar apagando Node).

**¿Cómo se comunican los microservicios?**
Por **HTTP con JSON** (REST), usando el **nombre del servicio** como dirección dentro de la red de Docker (`http://servicio-node:3000`). Java usa `RestClient`, Go usa `net/http`, Python usa `urllib` y Nginx usa `auth_request`.

**¿Cómo funciona el tiempo real?**
Con un **WebSocket**: el navegador deja una conexión abierta con Node (a través del gateway). Cuando Python, Java o Go cambian algo, le avisan a Node por HTTP (`POST /interno/eventos`) y Node lo reenvía a todos los navegadores, que recargan solo los datos afectados. Ver la sección 5.

**¿Por qué el WebSocket está en Node?**
Node maneja muy bien muchas conexiones abiertas al mismo tiempo (es asíncrono, con un solo hilo y eventos), y la librería `ws` es la estándar. Así los demás servicios no tienen que manejar conexiones: solo avisan con una petición HTTP.

**¿Por qué un solo puerto?**
Porque el gateway es la única puerta: se publica solo el **8080** y Nginx reparte a cada servicio por la red interna de Docker. Así los servicios y las bases de datos no quedan expuestos, la seguridad (token, límite de intentos) se aplica en un solo lugar y el navegador no tiene problemas de CORS.

**¿Por qué el pago guarda el banco y la referencia por separado?**
Para que la base de datos quede **ordenada**: se puede buscar un pedido por su referencia, validar que la referencia tenga solo números y hacer reportes por banco o por empresa de envío. Si todo estuviera en un texto libre ("Pago móvil ref. 004512") no se podría validar ni consultar bien.

**¿Por qué cada servicio tiene su propia base de datos?**
Es el patrón *database per service*: ningún servicio toca los datos de otro directamente; si los necesita, **se los pide por la API**. Por eso el pedido guarda el `usuarioId` y el `productoId` (más una copia del nombre y del precio del momento, para que el pedido no cambie si luego se edita el producto).

**¿Por qué MongoDB para productos?**
Los productos son documentos con campos flexibles. En un catálogo es común agregar atributos nuevos sin cambiar un esquema rígido. Además, el historial de movimientos es un registro que solo crece (un *log*), lo que encaja bien con una colección de documentos.

**¿Cómo funciona el inicio de sesión?**
Python verifica la contraseña contra su hash y entrega un token JWT firmado. Nginx valida ese token en **cada** petición preguntándole a Python (`auth_request`) antes de reenviarla. Ver la sección 6.

**¿Qué pasa si en un pedido falla el segundo producto?**
Java ya descontó el stock del primero, así que lo **devuelve** y borra el pedido (compensación). No hay transacción entre bases de datos distintas, así que se deshace manualmente. Es una versión simple del patrón **Saga**.

**¿Qué pasa si dos personas compran el último producto al mismo tiempo?**
Node descuenta el stock con una operación **atómica** de MongoDB (`findOneAndUpdate` con la condición `stock >= cantidad`). Solo una de las dos lo logra; la otra recibe `409 Stock insuficiente`.

**¿Qué es la máquina de estados?**
Una regla que define a qué estados puede pasar un pedido desde el actual (ver sección 5). Evita errores como entregar un pedido que nunca se pagó.

**¿Por qué no se puede eliminar un cliente con pedidos?**
Porque se perdería la referencia en los pedidos. Python le pregunta a Java cuántos pedidos tiene; si tiene alguno, responde `409` y sugiere **desactivarlo**.

**¿Qué hace el healthcheck?**
Docker ejecuta un comando cada 5 segundos para saber si el servicio está vivo. Con `depends_on: condition: service_healthy` un servicio espera a que su dependencia esté **lista** (no solo arrancada).

**¿Para qué sirven los volúmenes?**
Para que los datos de las bases de datos **sobrevivan** cuando se apagan los contenedores.

**¿Por qué el `.env` no está en GitHub?**
Porque tiene credenciales. Se sube un `.env.example` como plantilla. Además el compose trae valores por defecto para que el sistema levante igual.

**¿Qué es shadcn/ui y por qué se usó?**
Una colección de componentes de interfaz para React (construidos sobre Radix UI y Tailwind) que se copian dentro del proyecto. Dan una interfaz accesible y consistente (diálogos, menús, tablas, gráficos) sin depender de una librería cerrada.

**¿Por qué los Dockerfile de Java, Go y el frontend tienen dos `FROM`?**
Es un *multi-stage build*: la primera etapa tiene las herramientas para compilar (pesadas) y la segunda solo lo necesario para ejecutar. La imagen final queda mucho más liviana.

---

## 12. Problemas comunes y cómo resolverlos

| Problema | Solución |
|---|---|
| `Cannot connect to the Docker daemon` / `docker: command not found` | Abre **Docker Desktop** y espera a que esté en verde. |
| `port is already allocated` en el **puerto 8080** | Otro programa usa el 8080. Levanta con otro puerto: `PUERTO=9090 docker compose up --build` (o pon `PUERTO=9090` en el `.env`) y entra a http://localhost:9090 |
| Arriba dice **"Sin conexión"** | El tiempo real se cortó (por ejemplo, `servicio-node` se está reiniciando). Se reconecta solo; si no, recarga la página. |
| "Correo o contraseña incorrectos" con las cuentas demo | Si usaste una versión anterior del proyecto, la base de datos vieja sigue ahí: `docker compose down -v` y `docker compose up --build`. |
| El panel dice "Datos incompletos" o la página no carga datos | Algún servicio todavía está arrancando (Java tarda ~30 s). Espera y recarga. Revisa con `docker compose ps`. |
| Cambié el código y no se ve el cambio | Vuelve a ejecutar con `--build`: `docker compose up --build` |
| Quiero empezar con los datos de ejemplo limpios | `docker compose down -v` y luego `docker compose up --build` |
| Windows: error con WSL 2 | Ejecuta `wsl --update` en PowerShell como administrador y reinicia. |
| Tarda mucho en `servicio-java` o `frontend` la primera vez | Es normal: Maven y npm descargan dependencias. |

Ver logs de un servicio específico:
```bash
docker compose logs -f servicio-java
```

---

## 13. Glosario rápido

| Término | Significado |
|---|---|
| **Backend** | La parte que corre en el servidor (los microservicios y las bases de datos). |
| **Frontend** | Lo que ve el usuario en el navegador. |
| **REST** | Estilo de API con URLs + métodos HTTP + JSON. |
| **Endpoint** | Una URL concreta de la API (ej: `GET /productos`). |
| **CRUD** | Crear, Leer, Actualizar, Borrar. |
| **ORM / ODM** | Librería que traduce objetos del código a tablas (ORM) o documentos (ODM). |
| **JWT** | Token firmado que demuestra que iniciaste sesión. |
| **Hash** | Huella irreversible de una contraseña: se puede comprobar pero no "desencriptar". |
| **Kardex** | Registro de cada entrada y salida de inventario. |
| **SKU** | Código único de un producto (ej: `COM-1001`). |
| **Saga / compensación** | Deshacer manualmente los pasos ya hechos cuando una operación entre servicios falla a la mitad. |
| **Contenedor / Imagen / Dockerfile** | Programa aislado ejecutándose / su plantilla / la receta para crearla. |
| **Volumen** | Carpeta persistente para que los datos no se pierdan. |
| **Reverse proxy** | Servidor que recibe peticiones y las reenvía a otros (eso hace Nginx). |
| **Healthcheck** | Prueba periódica para saber si un servicio está vivo. |
| **Goroutine** | Tarea ligera de Go que corre en paralelo. |
| **Componente (React)** | Pieza reutilizable de la interfaz (`<Button>`, `<Card>`…). |
| **Swagger / OpenAPI** | Documentación interactiva de una API (FastAPI la genera sola en `/docs`). |
| **CORS** | Regla del navegador que bloquea llamadas a otros dominios o puertos salvo que el servidor lo permita. |
| **WebSocket** | Conexión que queda abierta para que el servidor le envíe avisos al navegador en tiempo real. |
| **Número de guía** | Código con el que la empresa de envío (MRW, Zoom…) identifica un paquete para rastrearlo. |
