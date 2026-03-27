#!/bin/bash
# deploy-local.sh — Deploy CoinKeeper locally without Docker
# Usage: ./scripts/deploy-local.sh [dev|prod|status|stop]
set -euo pipefail

APP_DIR="/app"
DATA_DIR="/app/data"
DEPLOY_DIR="/app/.deploy"
STANDALONE_DIR="$APP_DIR/.next/standalone"

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  dev       Build and start development instance (port 3000)
  prod      Build and start production instance (port 8080)
  stop      Stop all running instances
  status    Show running instances
  logs      Show recent logs

Environment:
  Standalone Next.js deployment, SQLite database at $DATA_DIR/coinkeeper.db
EOF
  exit 0
}

ensure_built() {
  if [ ! -f "$STANDALONE_DIR/server.js" ]; then
    echo "==> Building app..."
    cd "$APP_DIR"
    npm run build
  fi
}

ensure_data_dir() {
  mkdir -p "$DATA_DIR"
  mkdir -p "$DEPLOY_DIR/logs"
}

run_migrations() {
  echo "==> Running database migrations..."
  cd "$APP_DIR"
  DATABASE_URL="file:$DATA_DIR/coinkeeper.db" npx prisma migrate deploy 2>&1
}

start_instance() {
  local ENV="$1"
  local PORT="$2"
  local PIDFILE="$DEPLOY_DIR/${ENV}.pid"
  local LOGFILE="$DEPLOY_DIR/logs/${ENV}.log"

  # Stop existing instance
  if [ -f "$PIDFILE" ]; then
    local OLD_PID
    OLD_PID=$(cat "$PIDFILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "==> Stopping existing $ENV instance (PID $OLD_PID)..."
      kill "$OLD_PID" 2>/dev/null || true
      sleep 2
    fi
    rm -f "$PIDFILE"
  fi

  ensure_built
  ensure_data_dir
  run_migrations

  echo "==> Starting $ENV instance on port $PORT..."
  cd "$STANDALONE_DIR"

  PORT="$PORT" \
  HOSTNAME="0.0.0.0" \
  NODE_ENV=production \
  DATABASE_URL="file:$DATA_DIR/coinkeeper.db" \
  node server.js > "$LOGFILE" 2>&1 &

  local PID=$!
  echo "$PID" > "$PIDFILE"
  echo "==> Started $ENV (PID $PID, port $PORT)"

  # Wait for health check
  local healthy=false
  for i in $(seq 1 15); do
    if curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
      healthy=true
      break
    fi
    sleep 1
  done

  if $healthy; then
    echo "==> $ENV is healthy at http://localhost:$PORT"
    curl -s "http://localhost:$PORT/api/health"
    echo ""
  else
    echo "Warning: $ENV may not be healthy. Check: tail -f $LOGFILE"
  fi
}

show_status() {
  echo "CoinKeeper Deployment Status"
  echo "---"
  for ENV in dev prod; do
    local PIDFILE="$DEPLOY_DIR/${ENV}.pid"
    if [ -f "$PIDFILE" ]; then
      local PID
      PID=$(cat "$PIDFILE")
      if kill -0 "$PID" 2>/dev/null; then
        local PORT
        [ "$ENV" = "dev" ] && PORT=3000 || PORT=8080
        echo "$ENV: RUNNING (PID $PID, port $PORT)"
        curl -s "http://localhost:$PORT/api/health" 2>/dev/null && echo "" || echo "  (health check failed)"
      else
        echo "$ENV: DEAD (stale PID $PID)"
      fi
    else
      echo "$ENV: NOT DEPLOYED"
    fi
  done
}

stop_all() {
  for ENV in dev prod; do
    local PIDFILE="$DEPLOY_DIR/${ENV}.pid"
    if [ -f "$PIDFILE" ]; then
      local PID
      PID=$(cat "$PIDFILE")
      if kill -0 "$PID" 2>/dev/null; then
        echo "==> Stopping $ENV (PID $PID)..."
        kill "$PID" 2>/dev/null || true
      fi
      rm -f "$PIDFILE"
    fi
  done
  echo "All instances stopped."
}

show_logs() {
  for ENV in dev prod; do
    local LOGFILE="$DEPLOY_DIR/logs/${ENV}.log"
    if [ -f "$LOGFILE" ]; then
      echo "=== $ENV logs ==="
      tail -20 "$LOGFILE"
      echo ""
    fi
  done
}

# Main
case "${1:---help}" in
  dev)    start_instance "dev" 3000 ;;
  prod)   start_instance "prod" 8080 ;;
  stop)   stop_all ;;
  status) show_status ;;
  logs)   show_logs ;;
  --help|-h|help) usage ;;
  *) echo "Unknown command: $1" >&2; usage ;;
esac
