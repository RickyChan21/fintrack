#!/bin/bash

export PATH="/usr/lib/postgresql/15/bin:$PATH"
DATA_DIR="${DATA_DIR:-/data}"
PGDATA="$DATA_DIR/pgdata"
APP_DIR="/home/fintrack/app"

# Load .env file from data directory if mounted
ENV_FILE="$DATA_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

if [ -z "$DATABASE_URL" ]; then
    export POSTGRES_USER="${POSTGRES_USER:-fintrack}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-fintrack}"
    export POSTGRES_DB="${POSTGRES_DB:-fintrack}"
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB"

    PG_BIN="/usr/lib/postgresql/15/bin"

    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        mkdir -p "$PGDATA"
        chown -R postgres:postgres "$PGDATA"
        su - postgres -c "$PG_BIN/initdb -D $PGDATA"
        su - postgres -c "$PG_BIN/pg_ctl -D $PGDATA start -w"
        su - postgres -c "$PG_BIN/psql -c \"CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;\""
        su - postgres -c "$PG_BIN/psql -c \"CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;\""
        su - postgres -c "$PG_BIN/psql -d $POSTGRES_DB -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
        su - postgres -c "$PG_BIN/pg_ctl -D $PGDATA stop"
    fi

    chown -R postgres:postgres "$PGDATA"
    echo "listen_addresses = '*'" >> "$PGDATA/postgresql.conf"
    echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
    su - postgres -c "$PG_BIN/pg_ctl -D $PGDATA start -w"
    echo "Postgres ready"
fi

redis-server --daemonize yes
echo "Redis ready"

export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"

cd "$APP_DIR"

echo "DATABASE_URL=$DATABASE_URL"
npx prisma db push --accept-data-loss 2>&1
npx tsx src/lib/seed.ts

npx tsx worker/index.ts &
npx tsx ingester/index.ts &

exec npx next start --port 3000
