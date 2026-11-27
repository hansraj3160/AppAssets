#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "🚀 AppAssets Deployment Started: $(date -u)"
echo "=========================================="

APP_DIR="/home/ubuntu/appassets"
cd "$APP_DIR"

echo "📦 Installing root dependencies..."
bun install

echo "📦 Installing studio dependencies & building frontend..."
cd studio
bun install
bun run build
cd ..

echo "🔨 Building CLI distribution..."
bun run build:cli

echo "🔄 Restarting systemd service..."
sudo systemctl restart appassets

echo "🩺 Verifying health endpoint..."
for i in {1..15}; do
  if curl -sf http://localhost:4321/api/health > /dev/null 2>&1; then
    echo "✅ AppAssets is live and healthy!"
    echo "=========================================="
    exit 0
  fi
  echo "Waiting for app to start ($i/15)..."
  sleep 1
done

echo "❌ Health check timed out!"
sudo journalctl -u appassets -n 25 --no-pager
exit 1
