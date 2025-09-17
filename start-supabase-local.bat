@echo off
REM iDRAC Orchestrator - Full Local Development Setup Script with Supabase (Windows)
REM This script starts Supabase + API + Frontend for complete local development

echo 🚀 Starting iDRAC Orchestrator with Full Supabase Local Setup
echo ==============================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Supabase CLI is not installed.
    echo    Install from: https://supabase.com/docs/guides/cli
    echo    Scoop: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git ^&^& scoop install supabase
    pause
    exit /b 1
)

echo ✅ Supabase CLI detected

REM Check if Docker is available
docker --version >nul 2>&1
if not errorlevel 1 (
    echo ✅ Docker detected
) else (
    echo ❌ Docker is not installed. Please install Docker first.
    echo    Download from: https://docs.docker.com/get-docker/
    pause
    exit /b 1
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

REM Install API dependencies
if not exist node_modules (
    echo 📦 Installing API dependencies...
    npm install
) else (
    echo ✅ API dependencies installed
)

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

REM Start API database services
echo 🐳 Starting API database services...
docker-compose up -d postgres redis
echo ✅ API database services started

cd ..

REM Start Supabase
echo 🔧 Starting Supabase locally...
supabase start

REM Create/Update .env file for frontend
echo 📝 Creating frontend .env configuration...
(
    echo # Frontend with Supabase
    echo VITE_SUPABASE_URL=http://127.0.0.1:54321
    echo VITE_SUPABASE_PUBLISHABLE_KEY=^<Get from 'supabase status'^>
    echo.
    echo # Local API ^(used for orchestration endpoints^)
    echo VITE_API_BASE_URL=http://localhost:8081
    echo VITE_API_KEY=dev-api-key
) > .env
echo ✅ Created frontend .env file

echo ⚠️  Please update VITE_SUPABASE_PUBLISHABLE_KEY in .env with the anon key from 'supabase status'

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM Run API migrations
echo 🔄 Running API database migrations...
cd api
npm run migrate 2>nul || echo ⚠️  Migrations will run automatically on first API start
cd ..

echo.
echo 🎉 Setup Complete!
echo ===================
echo.
echo Services Started:
echo - Supabase API: http://127.0.0.1:54321
echo - Supabase Studio: http://127.0.0.1:54323
echo - API Backend: Ready to start on http://localhost:8081
echo - Frontend: Ready to start on http://localhost:8080
echo.
echo To start the application:
echo.
echo Terminal 1 ^(API Backend^):
echo   cd api ^&^& npm run dev
echo.
echo Terminal 2 ^(Supabase Functions^):
echo   supabase functions serve
echo.
echo Terminal 3 ^(Frontend^):
echo   npm run dev
echo.
echo Then open: http://localhost:8080
echo.
echo 📚 Full setup guide: SUPABASE_LOCAL_SETUP.md
echo.
echo 🔧 Troubleshooting:
echo    - Supabase Status: supabase status
echo    - Get anon key: supabase status ^| find "anon_key"
echo    - API Health: http://localhost:8081/health
echo    - Supabase Studio: http://127.0.0.1:54323
echo    - Reset Supabase: supabase stop ^&^& supabase start
echo    - Reset API DB: cd api ^&^& docker-compose down -v ^&^& docker-compose up -d

pause