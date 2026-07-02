#!/bin/bash

export PATH="/usr/lib/postgresql/15/bin:$PATH"
PGDATA="/var/lib/postgresql/data"
APP_DIR="/home/fintrack/app"

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

nohup npx tsx worker/index.ts > /var/log/fintrack/worker.log 2>&1 &
nohup npx tsx ingester/index.ts > /var/log/fintrack/ingester.log 2>&1 &

exec npx next start --port 3000
