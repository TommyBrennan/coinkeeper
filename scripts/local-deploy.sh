#!/bin/bash
set -euo pipefail

# Local deployment script for CoinKeeper
# Deploys dev server on port 3000 and prod server on port 8080

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

usage() {
  echo "Usage: $0 <dev|prod|both|status|stop>"
  exit 1
}

start_dev() {
  echo "==> Starting dev server on port 3000..."
  # Kill existing dev server
  pkill -f "next dev" 2>/dev/null || true
  sleep 1
  DATABASE_URL="file:$(pwd)/prisma/dev.db" nohup npm run dev > /tmp/coinkeeper-dev.log 2>&1 &
  echo "Dev server PID: $!"
  sleep 3
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "==> Dev server healthy on http://localhost:3000"
  else
    echo "==> Dev server starting... (check /tmp/coinkeeper-dev.log)"
  fi
}

start_prod() {
  echo "==> Building for production..."
  npm run build 2>&1 | tail -3

  # Copy static assets to standalone
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  cp -r public .next/standalone/public 2>/dev/null || true

  echo "==> Starting prod server on port 8080..."
  # Kill existing prod server on port 8080
  local prod_pid
  prod_pid=$(lsof -ti:8080 2>/dev/null || true)
  if [ -n "$prod_pid" ]; then
    kill "$prod_pid" 2>/dev/null || true
    sleep 1
  fi

  DATABASE_URL="file:$(pwd)/prisma/dev.db" PORT=8080 HOSTNAME=0.0.0.0 NODE_ENV=production \
    nohup node .next/standalone/server.js > /tmp/coinkeeper-prod.log 2>&1 &
  echo "Prod server PID: $!"
  sleep 3

  if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "==> Prod server healthy on http://localhost:8080"
  else
    echo "==> Prod server starting... (check /tmp/coinkeeper-prod.log)"
  fi
}

show_status() {
  echo "=== CoinKeeper Deploy Status ==="
  echo -n "Dev  (port 3000): "
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "HEALTHY"
  else
    echo "DOWN"
  fi
  echo -n "Prod (port 8080): "
  if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "HEALTHY"
  else
    echo "DOWN"
  fi
}

stop_all() {
  echo "Stopping servers..."
  pkill -f "next dev" 2>/dev/null || true
  local prod_pid
  prod_pid=$(lsof -ti:8080 2>/dev/null || true)
  if [ -n "$prod_pid" ]; then
    kill "$prod_pid" 2>/dev/null || true
  fi
  echo "Stopped."
}

case "${1:-}" in
  dev)    start_dev ;;
  prod)   start_prod ;;
  both)   start_dev; start_prod ;;
  status) show_status ;;
  stop)   stop_all ;;
  *)      usage ;;
esac
