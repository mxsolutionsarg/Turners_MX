# NS Motors – Sistema de Gestión de Turnos

Sistema de gestión de turnos para taller mecánico con panel administrativo, presupuestos en PDF y backoffice.

## Requisitos

- **Node.js** v18+
- **MySQL** 8.0+

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Turners

# 2. Instalar dependencias
cd backend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los datos de tu base de datos
```

## Configuración (.env)

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=turners_db
PORT=3001
BACKOFFICE_KEY=TU_CLAVE_SECRETA_AQUI
```

> ⚠️ **IMPORTANTE:** Cambiar `BACKOFFICE_KEY` por una clave segura en producción.

## Base de Datos

```bash
# Inicializar la base de datos (crea tablas, datos iniciales y usuario admin)
cd backend
node db/init.js
```

**Usuario admin por defecto:**
- Email: `admin@turners.com`
- Password: `admin123`

> Cambiar la contraseña del admin desde el backoffice después del primer inicio.

## Ejecutar

```bash
# Desarrollo (auto-reload)
npm run dev

# Producción
npm start
```

La app estará disponible en `http://localhost:3001`

## Estructura del Proyecto

```
Turners/
├── backend/
│   ├── db/              # Conexión, schema y seeds
│   ├── routes/          # API endpoints
│   ├── server.js        # Entry point
│   ├── .env             # Variables de entorno (no commitear)
│   └── package.json
├── views/               # Páginas HTML
├── scripts/             # JavaScript frontend
├── styles/              # CSS
├── images/              # Imágenes estáticas
└── data/                # Datos estáticos (servicios)
```

## API Endpoints

| Ruta | Descripción |
|------|-------------|
| `/api/auth` | Login y registro |
| `/api/clientes` | CRUD de clientes |
| `/api/vehiculos` | CRUD de vehículos |
| `/api/servicios` | CRUD de servicios |
| `/api/turnos` | Gestión de turnos |
| `/api/seguimientos` | Historial de mantenimiento |
| `/api/bloqueos` | Bloqueo de fechas |
| `/api/presupuestos` | Presupuestos |
| `/api/backoffice` | Gestión de admins (protegido) |
| `/health` | Health check |

## Backoffice

Panel oculto para gestionar usuarios admin:
- **URL:** `/views/backoffice.html`
- **Acceso:** Requiere la clave definida en `BACKOFFICE_KEY`
- No tiene link desde la app — solo accesible por URL directa

## Deploy en Producción

### Con PM2 (recomendado)

```bash
npm install -g pm2
cd backend
pm2 start server.js --name "turners"
pm2 save
pm2 startup
```

### Con Docker (opcional)

Crear un `Dockerfile` en la raíz:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
WORKDIR /app/backend
RUN npm ci --production
EXPOSE 3001
CMD ["npm", "start"]
```

### Variables de entorno en producción

Asegurate de configurar:
- `DB_HOST` → dirección del servidor MySQL
- `DB_USER` / `DB_PASSWORD` → credenciales de la BD
- `DB_NAME` → nombre de la base de datos
- `PORT` → puerto (o usar el que asigne el hosting)
- `BACKOFFICE_KEY` → clave segura para el backoffice

## Licencia

Proyecto privado – NS Motors
