# Infrastructure

This directory contains the Docker Compose configuration for local development infrastructure.

## Services

- **PostgreSQL** (port 54321): Main database
- **Redis** (port 63791): Caching and session storage
- **MinIO** (ports 9000/9001): S3-compatible object storage

## Usage

Start all services:
```bash
cd infra
docker compose up -d
```

View logs:
```bash
docker compose logs -f
```

Stop services:
```bash
docker compose stop
```

Remove services and data:
```bash
docker compose down -v
```

## Connection Strings

Add these to your `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54321/postgres
REDIS_URL=redis://localhost:63791
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
```

## MinIO Console

Access the MinIO console at: http://localhost:9001

Login credentials:
- Username: `minioadmin`
- Password: `minioadmin`
