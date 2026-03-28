#!/bin/bash
set -euo pipefail

# Docker rootless deploy script for CoinKeeper
# Workaround for rootless Docker in containerized environments where:
# - Standard `docker build` fails (single-UID namespace can't handle GID 42)
# - Container networking doesn't work (no iptables, no TAP devices)
#
# This script builds the app locally, creates a Docker image via `docker import`,
# and can start a Docker daemon for testing. For actual deployment, use
# scripts/local-deploy.sh which runs the app directly on the host.

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

IMAGE_NAME="${1:-coinkeeper-app}"
ROOTFS="/tmp/coinkeeper-rootfs"

usage() {
  cat <<EOF
Usage: $0 [image-name]

Builds the CoinKeeper app locally and creates a Docker image via docker import.
This bypasses the standard docker build which fails in single-UID rootless mode.

Prerequisites:
  - Docker daemon running (rootless OK)
  - Node.js and npm installed
  - App dependencies installed (npm ci)

The resulting image can be used with cb-deploy when AGENT_NAME and DOCKER_HOST
are configured, or tested locally with docker run.

Default image name: coinkeeper-app
EOF
  exit 0
}

[ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ] && usage

echo "==> Building Next.js app..."
npm run build 2>&1 | tail -3

echo "==> Running Prisma generate..."
npx prisma generate 2>&1 | tail -1

echo "==> Creating rootfs at $ROOTFS..."
rm -rf "$ROOTFS"
mkdir -p "$ROOTFS"/{app/data,bin,usr/local/bin,usr/bin,lib,lib/aarch64-linux-gnu,etc,tmp}

# Copy app files
cp -r .next/standalone/* "$ROOTFS/app/"
cp -r .next/standalone/.next "$ROOTFS/app/.next"
cp -r .next/static "$ROOTFS/app/.next/static"
cp -r public "$ROOTFS/app/public" 2>/dev/null || true
cp -r prisma "$ROOTFS/app/prisma"
cp -r node_modules "$ROOTFS/app/node_modules"

# Copy Node.js runtime
cp /usr/local/bin/node "$ROOTFS/usr/local/bin/"

# Copy shell and utilities
for bin in sh sleep; do
  src=$(which "$bin" 2>/dev/null) && cp "$src" "$ROOTFS/bin/" || true
done
for bin in curl env; do
  src=$(which "$bin" 2>/dev/null) && cp "$src" "$ROOTFS/usr/bin/" || true
done

# Copy dynamic linker and shared libraries
cp /usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1 "$ROOTFS/lib/ld-linux-aarch64.so.1"
cp /lib/aarch64-linux-gnu/lib*.so* "$ROOTFS/lib/aarch64-linux-gnu/" 2>/dev/null || true

# Copy libraries for curl
for lib in $(ldd /usr/bin/curl 2>/dev/null | awk '/=>/ {print $3}' | sort -u); do
  dir=$(dirname "$lib")
  mkdir -p "$ROOTFS$dir"
  cp "$lib" "$ROOTFS$dir/" 2>/dev/null || true
done

# Minimal /etc
echo "root:x:0:0:root:/root:/bin/sh" > "$ROOTFS/etc/passwd"
echo "root:x:0:" > "$ROOTFS/etc/group"
echo "127.0.0.1 localhost" > "$ROOTFS/etc/hosts"
echo "nameserver 8.8.8.8" > "$ROOTFS/etc/resolv.conf"

echo "==> Importing Docker image: $IMAGE_NAME..."
docker rmi "$IMAGE_NAME" 2>/dev/null || true
cd "$ROOTFS"
tar --owner=0 --group=0 -cf - . | docker import - "$IMAGE_NAME"

echo "==> Cleaning up rootfs..."
rm -rf "$ROOTFS"

echo "==> Done! Image: $IMAGE_NAME"
echo ""
echo "Test with:"
echo "  docker run --rm -w /app $IMAGE_NAME /usr/local/bin/node --version"
echo ""
echo "For actual deployment, use: scripts/local-deploy.sh both"
