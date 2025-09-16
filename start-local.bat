@echo off
REM iDRAC Orchestrator - Local Development Startup Script (Windows)
REM This script starts the application in local-only mode (no Supabase required)

echo 🚀 Starting iDRAC Orchestrator in Local Mode
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env configuration...
    (
        echo # Local API Configuration
        echo VITE_API_BASE_URL=http://localhost:8081
        echo VITE_API_KEY=dev-api-key
        echo.
        echo # Supabase disabled for local mode
        echo VITE_SUPABASE_URL=
        echo VITE_SUPABASE_PUBLISHABLE_KEY=
        echo VITE_SUPABASE_PROJECT_ID=
    ) > .env
    echo ✅ Created .env file
) else (
    echo ✅ .env file exists
)

REM Install frontend dependencies
if not exist node_modules (
    echo 📦 Installing frontend dependencies...
    npm install
) else (
    echo ✅ Frontend dependencies installed
)

REM Setup API
cd api

REM Create API .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating API .env configuration...
    (
        echo # API Configuration
        echo API_PORT=8081
        echo API_KEY=dev-api-key
        echo.
        echo # Database Configuration ^(Docker^)
        echo PGHOST=localhost
        echo PGPORT=5432
        echo PGDATABASE=idrac_orchestrator
        echo PGUSER=idrac_admin
        echo PGPASSWORD=devpass
        echo.
        echo # Redis Configuration
        echo REDIS_URL=redis://localhost:6379
        echo.
        echo # Disable worker for local development
        echo DISABLE_WORKER=true
        echo.
        echo # Security ^(permissive for local development^)
        echo TLS_REJECT_UNAUTHORIZED=false
        echo.
        echo # Tool paths
        echo RACADM_PATH=racadm
        echo IPMITOOL_PATH=ipmitool
    ) > .env
    echo ✅ Created API .env file
) else (
    echo ✅ API .env file exists
)

REM Install API dependencies
if not exist node_modules (
    echo 📦 Installing API dependencies...
    npm install
) else (
    echo ✅ API dependencies installed
)

REM Check if Docker is available
docker --version >nul 2>&1
if not errorlevel 1 (
    echo 🐳 Docker detected - starting database services...
    
    REM Start database services
    if exist docker-compose.yml (
        docker-compose up -d postgres redis
        echo ✅ Database services started
        
        REM Wait for database to be ready
        echo ⏳ Waiting for database to be ready...
        timeout /t 5 /nobreak >nul
        
        REM Run migrations
        echo 🔄 Running database migrations...
        npm run migrate 2>nul || echo ⚠️  Migrations will run automatically on first API start
    ) else (
        echo ⚠️  docker-compose.yml not found - you'll need to setup PostgreSQL manually
    )
) else (
    echo ⚠️  Docker not found - you'll need to setup PostgreSQL and Redis manually
    echo    See LOCAL_SETUP.md for manual database setup instructions
)

cd ..

echo.
echo 🎉 Setup Complete!
echo ===================
echo.
echo To start the application:
echo.
echo Terminal 1 ^(API Backend^):
echo   cd api ^&^& npm run dev
echo.
echo Terminal 2 ^(Frontend^):
echo   npm run dev
echo.
echo Then open: http://localhost:8080
echo.
echo 📚 For detailed setup instructions, see LOCAL_SETUP.md
echo.
echo 🔧 Troubleshooting:
echo    - API Health Check: http://localhost:8081/health
echo    - Database logs: cd api ^&^& docker-compose logs postgres
echo    - Reset database: cd api ^&^& docker-compose down -v ^&^& docker-compose up -d

pause