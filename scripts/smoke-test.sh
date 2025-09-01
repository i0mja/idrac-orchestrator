#!/usr/bin/env bash
set -euo pipefail

echo "Generating Supabase types"
VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID:-hrqzmjjpnylcmunyaovj}
npx supabase gen types typescript --project-id $VITE_SUPABASE_PROJECT_ID > src/integrations/supabase/types.ts

echo "Building application"
npm run build >/dev/null

echo "Building docker image"
docker build -t idrac-orchestrator-test \
  --build-arg VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-http://localhost} \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-anon} . >/dev/null

echo "Smoke test complete"

