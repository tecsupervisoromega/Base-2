# Infra — Base-2 DDD

Servicios de desarrollo levantados via `docker compose`.

## Servicios

| Servicio | Puerto | Credenciales | Consola |
|---|---|---|---|
| Postgres + PostGIS | 5432 | `base2` / `base2_dev` (db: `base2_ddd`) | `psql` |
| MinIO (S3) | 9000 (API), 9001 (UI) | `base2` / `base2_dev_minio` | http://localhost:9001 |
| MailHog | 1025 (SMTP), 8025 (UI) | — | http://localhost:8025 |

## Comandos

```bash
pnpm infra:up         # levantar
pnpm infra:down       # bajar
pnpm infra:logs       # seguir logs
```

## Extensiones PostgreSQL instaladas al iniciar

- `uuid-ossp`
- `pgcrypto`
- `postgis`
- `citext`
- `pg_trgm`

Ver `postgres-init/01-extensions.sql`.

## Volumen de datos

Persistente en volumenes Docker:
- `pgdata`: datos Postgres
- `miniodata`: archivos MinIO

Para resetear todo:
```bash
docker compose -f infra/docker-compose.yml down -v
```
