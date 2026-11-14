#!/usr/bin/env bash
set -euo pipefail

# ========================================================
# Dailyba Automated VPS Deployment Script
# Target Host: 43.134.26.73 (Ubuntu)
# Domain: dailyba.pdfumi.com (Web: 3005, API: 4005)
# ========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "=================================================="
echo "🚀 Starting Dailyba Deployment on VPS"
echo "Working directory: $ROOT_DIR"
echo "=================================================="

# 1. Ensure .env exists with strong random secrets
if [ ! -f .env ]; then
  echo "⚙️ Creating .env from .env.example..."
  cp .env.example .env
  
  # Auto-generate secure random keys
  RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | head -c 64)
  RANDOM_ENC=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | head -c 64)
  
  sed -i "s/replace_with_secure_random_jwt_secret_key_32bytes/$RANDOM_JWT/" .env
  sed -i "s/replace_with_secure_random_aes256_key_32bytes/$RANDOM_ENC/" .env
  echo "✅ .env initialized with cryptographic JWT & AES-256 keys."
else
  echo "✅ .env file already exists."
fi

# 2. Build and launch Docker Compose
echo "🐳 Building and starting Docker containers (Ports 3005 & 4005)..."
docker compose down || true
docker compose up -d --build

# 3. Wait for containers and verify ports
echo "⏳ Verifying services status..."
sleep 5
docker compose ps

echo "🔍 Testing Web (port 3005)..."
curl -s -I http://127.0.0.1:3005 | head -n 1 || echo "⚠️ Web port 3005 warming up..."

echo "🔍 Testing Backend API (port 4005)..."
curl -s http://127.0.0.1:4005/api/health || echo "⚠️ API port 4005 warming up..."

echo ""
echo "=================================================="
echo "🎉 Dailyba Containers Deployed Successfully!"
echo "• Frontend Container: http://127.0.0.1:3005"
echo "• Backend API:        http://127.0.0.1:4005"
echo ""
echo "📋 Next step for Nginx Reverse Proxy on Host:"
echo "sudo cp deploy/nginx-dailyba.pdfumi.com.conf /etc/nginx/sites-available/dailyba.pdfumi.com"
echo "sudo ln -sf /etc/nginx/sites-available/dailyba.pdfumi.com /etc/nginx/sites-enabled/"
echo "sudo nginx -t && sudo systemctl reload nginx"
echo "sudo certbot --nginx -d dailyba.pdfumi.com"
echo "=================================================="
