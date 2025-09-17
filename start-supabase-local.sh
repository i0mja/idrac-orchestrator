#!/bin/bash

# iDRAC Orchestrator - Full Local Development Setup Script with Supabase
# This script starts Supabase + API + Frontend for complete local development

set -e

echo "🚀 Starting iDRAC Orchestrator with Full Supabase Local Setup"
echo "=============================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install from: https://supabase.com/docs/guides/cli"
    echo "   Homebrew: brew install supabase/tap/supabase"
    echo "   Scoop: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase"
    exit 1
fi

echo "✅ Supabase CLI detected"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Download from: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker detected"

# Install frontend dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies installed"
fi

# Setup API
cd api

# Install API dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing API dependencies..."
    npm install
else
    echo "✅ API dependencies installed"
fi

# Create API .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating API .env configuration..."
    cat > .env << EOF
# API Configuration
API_PORT=8081
API_KEY=dev-api-key

# Database Configuration (Docker)
PGHOST=localhost
PGPORT=5432
PGDATABASE=idrac_orchestrator
PGUSER=idrac_admin
PGPASSWORD=devpass

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Disable worker for local development
DISABLE_WORKER=true

# Security (permissive for local development)
TLS_REJECT_UNAUTHORIZED=false

# Tool paths
RACADM_PATH=racadm
IPMITOOL_PATH=ipmitool
EOF
    echo "✅ Created API .env file"
else
    echo "✅ API .env file exists"
fi

# Start API database services
echo "🐳 Starting API database services..."
docker-compose up -d postgres redis
echo "✅ API database services started"

cd ..

# Start Supabase
echo "🔧 Starting Supabase locally..."
supabase start

# Get the anon key from Supabase
ANON_KEY=$(supabase status -o json | grep -o '"anon_key":"[^"]*"' | cut -d'"' -f4)
if [ -z "$ANON_KEY" ]; then
    echo "⚠️  Could not get anon key automatically. Please check 'supabase status' and update .env manually."
    ANON_KEY="<paste your local anon key here>"
fi

# Create/Update .env file for frontend
echo "📝 Creating frontend .env configuration..."
cat > .env << EOF
# Frontend with Supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY

# Local API (used for orchestration endpoints)
VITE_API_BASE_URL=http://localhost:8081
VITE_API_KEY=dev-api-key
EOF
echo "✅ Created frontend .env file with Supabase configuration"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Run API migrations
echo "🔄 Running API database migrations..."
cd api
npm run migrate 2>/dev/null || echo "⚠️  Migrations will run automatically on first API start"
cd ..

echo ""
echo "🎉 Setup Complete!"
echo "==================="
echo ""
echo "Services Started:"
echo "- Supabase API: http://127.0.0.1:54321"
echo "- Supabase Studio: http://127.0.0.1:54323"
echo "- API Backend: Ready to start on http://localhost:8081"
echo "- Frontend: Ready to start on http://localhost:8080"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 (API Backend):"
echo "  cd api && npm run dev"
echo ""
echo "Terminal 2 (Supabase Functions):"
echo "  supabase functions serve"
echo ""
echo "Terminal 3 (Frontend):"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:8080"
echo ""
echo "📚 Full setup guide: SUPABASE_LOCAL_SETUP.md"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Supabase Status: supabase status"
echo "   - API Health: http://localhost:8081/health"
echo "   - Supabase Studio: http://127.0.0.1:54323"
echo "   - Reset Supabase: supabase stop && supabase start"
echo "   - Reset API DB: cd api && docker-compose down -v && docker-compose up -d"