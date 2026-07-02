#!/bin/bash
set -e

APP_DIR="/home/fintrack/app"
PGDATA="/var/lib/postgresql/data"

# If DATABASE_URL is provided externally, skip internal Postgres
if [ -z "$DATABASE_URL" ]; then
    export POSTGRES_USER="${POSTGRES_USER:-fintrack}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-fintrack}"
    export POSTGRES_DB="${POSTGRES_DB:-fintrack}"
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB"

    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        mkdir -p "$PGDATA"
        chown -R postgres:postgres "$PGDATA"
        su - postgres -c "initdb -D $PGDATA"
        su - postgres -c "pg_ctl -D $PGDATA start -w"
        su - postgres -c "psql -c \"CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;\""
        su - postgres -c "psql -c \"CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;\""
        su - postgres -c "psql -d $POSTGRES_DB -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
        su - postgres -c "pg_ctl -D $PGDATA stop"
    fi

    chown -R postgres:postgres "$PGDATA"
    echo "listen_addresses = '*'" >> "$PGDATA/postgresql.conf"
    echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
    su - postgres -c "pg_ctl -D $PGDATA start -w"
    echo "Postgres ready"
fi

redis-server --daemonize yes
echo "Redis ready"

cd "$APP_DIR"
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"

su - fintrack -c "cd $APP_DIR && npx prisma db push --accept-data-loss"
su - fintrack -c "cd $APP_DIR && npx tsx src/lib/seed.ts"

su - fintrack -c "cd $APP_DIR && nohup npx tsx worker/index.ts > /var/log/fintrack/worker.log 2>&1 &"
su - fintrack -c "cd $APP_DIR && nohup npx tsx ingester/index.ts > /var/log/fintrack/ingester.log 2>&1 &"

exec su - fintrack -c "cd $APP_DIR && npx next start --port 3000"
