#!/bin/bash

# iDRAC Orchestrator - Local Development Startup Script
# This script starts the application in local-only mode (no Supabase required)

set -e

echo "🚀 Starting iDRAC Orchestrator in Local Mode"
echo "=============================================="

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

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env configuration..."
    cat > .env << EOF
# Local API Configuration
VITE_API_BASE_URL=http://localhost:8081
VITE_API_KEY=dev-api-key

# Supabase disabled for local mode
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
EOF
    echo "✅ Created .env file"
else
    echo "✅ .env file exists"
fi

# Install frontend dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies installed"
fi

# Setup API
cd api

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

# Install API dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing API dependencies..."
    npm install
else
    echo "✅ API dependencies installed"
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Docker detected - starting database services..."
    
    # Start database services
    if [ -f docker-compose.yml ]; then
        docker-compose up -d postgres redis
        echo "✅ Database services started"
        
        # Wait for database to be ready
        echo "⏳ Waiting for database to be ready..."
        sleep 5
        
        # Run migrations
        echo "🔄 Running database migrations..."
        npm run migrate 2>/dev/null || echo "⚠️  Migrations will run automatically on first API start"
    else
        echo "⚠️  docker-compose.yml not found - you'll need to setup PostgreSQL manually"
    fi
else
    echo "⚠️  Docker not found - you'll need to setup PostgreSQL and Redis manually"
    echo "   See LOCAL_SETUP.md for manual database setup instructions"
fi

cd ..

echo ""
echo "🎉 Setup Complete!"
echo "==================="
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 (API Backend):"
echo "  cd api && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:8080"
echo ""
echo "📚 For detailed setup instructions, see LOCAL_SETUP.md"
echo ""
echo "🔧 Troubleshooting:"
echo "   - API Health Check: http://localhost:8081/health"
echo "   - Database logs: cd api && docker-compose logs postgres"
echo "   - Reset database: cd api && docker-compose down -v && docker-compose up -d"