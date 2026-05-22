#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import psycopg, os, sys
try:
    psycopg.connect(
        host=os.environ.get('POSTGRES_HOST', 'localhost'),
        port=os.environ.get('POSTGRES_PORT', '5432'),
        user=os.environ.get('POSTGRES_USER', 'postgres'),
        password=os.environ.get('POSTGRES_PASSWORD', 'postgres'),
        dbname='postgres'
    ).close()
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
  echo "  postgres not ready, retrying in 2s..."
  sleep 2
done

echo "PostgreSQL is up."

echo "Creating database if not exists..."
PYTHONPATH=/app python scripts/create_db.py

echo "Running migrations..."
PYTHONPATH=/app alembic upgrade head

echo "Seeding initial data..."
PYTHONPATH=/app python -m api.seed

echo "Starting API server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
