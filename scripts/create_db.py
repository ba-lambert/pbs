from sqlalchemy import create_engine, text

from api.core.config import settings


def main():
    admin_url = (
        f"postgresql+psycopg://{settings.postgres_user}:{settings.postgres_password}"
        f"@{settings.postgres_host}:{settings.postgres_port}/postgres"
    )
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :db"), {"db": settings.postgres_db}).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{settings.postgres_db}"'))
    print(f"Database '{settings.postgres_db}' is ready.")


if __name__ == "__main__":
    main()

