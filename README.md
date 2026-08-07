# Base-2 DDD

Plataforma SaaS de gestion para empresas de **control de plagas (DDD: Desinfeccion, Desinsectacion, Desratizacion)** en Argentina.

Inspirada en el dominio de iGEO pero con schema propio, enfocada solo en DDD y adaptada a regulacion argentina (SENASA / ANMAT / AFIP).

## Estructura del monorepo

```
Base-2/
├── docs/              # Documentacion funcional y tecnica
│   └── modelo-datos.md    # Analisis del dump iGEO + ERD del nucleo DDD
├── db/                # Schema Prisma + migraciones + seed
│   └── prisma/schema.prisma
├── backend/           # API REST (NestJS + Prisma)
├── web/               # Backoffice de gestion (Next.js 14)
├── mobile-pwa/        # App tecnicos en campo (PWA instalable)
├── infra/             # docker-compose (Postgres+PostGIS, MinIO, MailHog)
└── .env.example
```

## Stack

| Capa | Tecnologia |
|---|---|
| Base de datos | PostgreSQL 16 + PostGIS |
| Backend | NestJS 10 + Prisma 5 + JWT |
| Web backoffice | Next.js 14 + React 18 + TailwindCSS |
| Mobile tecnicos | Next.js 14 PWA + Service Worker + IndexedDB |
| Storage | MinIO (S3-compatible) para fotos/firmas/PDFs |
| Dev mail | MailHog |

## Arranque rapido

### 1. Requisitos
- Node.js 22+
- pnpm 10+
- Docker + Docker Compose

### 2. Variables de entorno
```bash
cp .env.example .env
```

### 3. Instalar dependencias
```bash
pnpm install
```

### 4. Levantar infraestructura (Postgres+PostGIS, MinIO, MailHog)
```bash
pnpm infra:up
```

Servicios expuestos:
- Postgres: `localhost:5432` (user: `base2`, pass: `base2_dev`, db: `base2_ddd`)
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (user: `base2`, pass: `base2_dev_minio`)
- MailHog UI: `http://localhost:8025`

### 5. Generar cliente Prisma + migraciones
```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Cargar datos de prueba
```bash
pnpm --filter @base2/db seed
```

Crea:
- Empresa demo (CUIT `30-99999999-9`)
- Usuario admin: `admin` / `admin123`
- Usuario tecnico: `juan` / `admin123`
- Linea de negocio DDD + tipos de punto de control + un cliente de prueba

### 7. Arrancar todo en paralelo
```bash
pnpm dev
```

URLs:
- Backend API: http://localhost:4000
- API Docs (Swagger): http://localhost:4000/api/docs
- Backoffice: http://localhost:3000
- PWA tecnico: http://localhost:3100

## Arranque por paquete

```bash
pnpm --filter @base2/backend dev
pnpm --filter @base2/web dev
pnpm --filter @base2/mobile-pwa dev
```

## Arquitectura multi-tenant

Single-schema PostgreSQL con aislamiento por `empresa_id` en todas las tablas.
El `empresa_id` se extrae del JWT en cada request y se inyecta en los queries via el interceptor/guard.

## Endpoints principales

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/v1/auth/login` | Login con `empresaCuit + username + password` |
| GET | `/api/v1/auth/me` | Datos del usuario autenticado |
| GET | `/api/v1/health` | Health check + ping a DB |
| GET/POST/PATCH/DELETE | `/api/v1/clientes` | CRUD de clientes |
| GET/POST/PATCH | `/api/v1/sedes` | CRUD de sedes |
| GET | `/api/v1/sedes/nearby?lat=&lng=&radio=` | Sedes cercanas (haversine) |
| GET/POST/PATCH | `/api/v1/puntos-control?sedeId=` | Puntos de control por sede |
| PATCH | `/api/v1/puntos-control/:id/mover` | Reposicionar punto en plano |
| PATCH | `/api/v1/puntos-control/:id/desinstalar` | Desinstalar punto |
| GET/POST | `/api/v1/ordenes-trabajo` | Listar/crear OTs |
| GET | `/api/v1/ordenes-trabajo/mi-dia?fecha=` | OTs del tecnico logueado |
| GET | `/api/v1/ordenes-trabajo/:id/puntos-control` | Puntos de control de la OT (con revision actual) |
| PATCH | `/api/v1/ordenes-trabajo/:id/asignar` | Asignar tecnicos |
| PATCH | `/api/v1/ordenes-trabajo/:id/iniciar` | Iniciar OT |
| PATCH | `/api/v1/ordenes-trabajo/:id/cerrar` | Cerrar OT con firma |
| GET | `/api/v1/ordenes-trabajo/:id/parte.pdf` | Descargar parte de trabajo en PDF |
| POST | `/api/v1/revisiones/iniciar` | Crea o recupera la revision de un PC |
| GET | `/api/v1/revisiones/:id` | Detalle (respuestas + productos + fotos) |
| PATCH | `/api/v1/revisiones/:id/finalizar` | Cierre de revision con checklist + productos |
| POST/DELETE | `/api/v1/revisiones/:id/fotos` | Foto de revision (referencia por URL) |
| GET | `/api/v1/preguntas-revision?tipoPuntoControlId=` | Checklist dinamico por tipo de PC |
| GET | `/api/v1/productos/catalogo` | Catalogo de biocidas activos |
| POST | `/api/v1/storage/presign` | URL prefirmada para subir un archivo a MinIO |
| POST | `/api/v1/storage/firma` | Sube una firma (dataURL base64) y devuelve la URL |
| GET | `/api/v1/empleados` | Lista empleados activos de la empresa |
| GET | `/api/v1/empleados?tecnicos=true` | Solo tecnicos activos |

## Proximos pasos

- [x] Flujo completo de revision en PWA (checklist dinamico, productos, foto, firma) — **Fase 3A**
- [x] Generacion de PDF del parte de trabajo — **Fase 3B**
- [x] Gestion completa de plano + puntos de control (drag & drop) — **Fase 3C**
- [x] Sincronizacion offline (IndexedDB + queue de mutations) — **Fase 3D**
- [x] CRUD clientes en backoffice web (modal crear/editar/borrar + busqueda)
- [x] Pagina ordenes de trabajo en backoffice (filtros, detalle, link PDF, crear OT)
- [x] Modulo empleados API (GET /api/v1/empleados)
- [ ] RLS PostgreSQL + guard que inyecta `empresa_id` automaticamente
- [ ] Modulo de presupuestos y contratos
- [ ] Integracion AFIP (factura electronica)

## Notas de regulacion Argentina

- **Carne de aplicador/director tecnico** (SENASA o autoridad provincial) en `empleado.carne_plagas_*`
- **Registro de biocidas** (ANMAT/SENASA) en `producto.registro`
- **Libro de tratamientos** obligatorio con trazabilidad de cada aplicacion
- **CUIT** en lugar de NIF/CIF
- Zonas horarias `America/Argentina/*`
- Factura electronica AFIP (CAE, tipos A/B/C/E/M) — modelo preparado, integracion pendiente

## Licencia

Proyecto privado — todos los derechos reservados.
