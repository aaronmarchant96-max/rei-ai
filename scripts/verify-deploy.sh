#!/bin/bash
# Deployment Verification & Smoke Test Script for rei-ai
# Usage: ./scripts/verify-deploy.sh

set -e

echo "=== REI.AI DEPLOYMENT CHECK & SMOKE TEST ==="
echo ""

PROD_URL="https://prompthound-labs.vercel.app"

# 1. Check live site
echo "1. Checking live site..."
if curl -s -I "$PROD_URL" | grep -q -E "(HTTP/2 200|HTTP/1.1 200|HTTP/2 308)"; then
  echo "   ✅ Site is live ($PROD_URL)"
else
  echo "   ❌ Site is down"
  exit 1
fi

# 2. Check git status
echo "2. Checking local git..."
cd /home/potatoking/rei-ai
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "   🪲 Local commit: $CURRENT_COMMIT"

# 3. Check GitHub main
echo "3. Checking GitHub main..."
GITHUB_COMMIT=$(curl -s https://api.github.com/repos/aaronmarchant96-max/rei-ai/commits/main | grep '\"sha\"' | head -1 | cut -d'"' -f4 | head -c 7 || echo "$CURRENT_COMMIT")
echo "   🌍 GitHub commit: $GITHUB_COMMIT"

# 4. Run automated production smoke tests
echo ""
echo "4. Running full automated smoke suite..."
node scripts/smoke-test.mjs

echo "=== VERIFICATION COMPLETE ==="
