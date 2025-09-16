# Local Setup Without Supabase

This guide explains how to run the iDRAC Orchestrator locally without requiring Supabase, using only the local API backend.

## Quick Start (Local Only)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker for easy setup)
- Git

### 1. Clone and Setup Frontend

```bash
git clone <repository-url>
cd idrac-orchestrator
npm install
```

### 2. Configure Environment (No Supabase)

Create a `.env` file in the root directory:

```bash
# Local API Configuration
VITE_API_BASE_URL=http://localhost:8081
VITE_API_KEY=dev-api-key

# Leave Supabase settings empty to disable
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

### 3. Setup Local Database

#### Option A: Docker (Recommended)
```bash
cd api
docker-compose up -d postgres redis
```

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL and create database
createdb idrac_orchestrator
createuser idrac_admin
```

### 4. Configure API Backend

Create `api/.env`:

```bash
# API Configuration
API_PORT=8081
API_KEY=dev-api-key

# Database Configuration
PGHOST=localhost
PGPORT=5432
PGDATABASE=idrac_orchestrator
PGUSER=idrac_admin
PGPASSWORD=devpass

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Disable worker for local development
DISABLE_WORKER=true

# Optional: vCenter defaults (can be configured via UI)
VCENTER_URL=
VCENTER_USERNAME=
VCENTER_PASSWORD=

# Security
TLS_REJECT_UNAUTHORIZED=false
```

### 5. Start Services

#### Terminal 1: API Backend
```bash
cd api
npm install
npm run dev
```

#### Terminal 2: Frontend
```bash
npm run dev
```

### 6. Access Application

- Frontend: http://localhost:8080
- API Health: http://localhost:8081/health

## Features Available in Local Mode

### ✅ Fully Functional
- Server discovery and inventory management
- vCenter integration and cluster management
- Credential profile management
- Firmware package uploads and management
- Update scheduling and orchestration
- Health monitoring and alerts
- Maintenance window management
- Real-time dashboard and monitoring

### ❌ Disabled (Supabase Required)
- User authentication (runs in single-user mode)
- Real-time database subscriptions
- File storage via Supabase Storage
- Edge functions for external integrations

## Architecture in Local Mode

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web UI │────│  Local API      │────│   Dell iDRAC    │
│   (Port 8080)   │    │  (Port 8081)    │    │   Redfish API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         └──────────────│  PostgreSQL DB  │─────────────┘
                        │   + Redis       │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │  VMware vCenter │
                        │    REST API     │
                        └─────────────────┘
```

## Database Schema

The local API includes all necessary database migrations:

```bash
# Run migrations (automatic on startup)
cd api
npm run migrate
```

Tables created:
- `hosts` - Server inventory
- `vcenters` - vCenter connections
- `credential_profiles` - Credential management
- `firmware_packages` - Firmware library
- `update_jobs` - Orchestration jobs
- `maintenance_windows` - Scheduling
- `system_events` - Audit logging

## API Endpoints

### Core Operations
- `GET /health` - Health check
- `GET /hosts` - List servers
- `POST /hosts/:id/discover` - Discover server
- `GET /vcenters` - List vCenter connections
- `POST /vcenters` - Add vCenter connection

### Orchestration
- `POST /plans` - Create update plan
- `GET /plans/:id/status` - Check plan status
- `POST /updates/redfish/simple` - Start firmware update

### Configuration
- `GET /system/setup` - Get system configuration
- `PUT /system/setup` - Update system configuration

## Development Workflow

### 1. Setup Development Environment
```bash
# Install dependencies
npm install
cd api && npm install && cd ..

# Start both services
npm run dev          # Frontend (8080)
cd api && npm run dev # API (8081)
```

### 2. Testing API Endpoints
```bash
# Health check
curl http://localhost:8081/health

# List hosts
curl -H "Authorization: Bearer dev-api-key" http://localhost:8081/hosts
```

### 3. Database Management
```bash
cd api

# View logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U idrac_admin -d idrac_orchestrator

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

## Production Deployment (Local)

### 1. Build Production Assets
```bash
npm run build
cd api && npm run build
```

### 2. Deploy with Docker
```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Configure Reverse Proxy
```nginx
# nginx.conf example
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:8080;
    }

    location /api/ {
        proxy_pass http://localhost:8081/;
    }
}
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
lsof -i :8080
lsof -i :8081

# Use different ports
VITE_API_BASE_URL=http://localhost:3001 npm run dev
API_PORT=3001 npm run dev
```

#### Database Connection
```bash
# Test database connectivity
cd api
npm run test:db

# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
```

#### API Authentication
```bash
# Verify API key
curl -H "Authorization: Bearer dev-api-key" http://localhost:8081/health
```

### Logs and Debugging

#### API Logs
```bash
cd api
npm run dev  # Shows real-time logs
```

#### Database Logs
```bash
docker-compose logs postgres
```

#### Frontend Development
```bash
npm run dev  # Auto-reload on changes
```

### Performance Tuning

#### Database
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

#### API
```bash
# Monitor API performance
cd api
npm run profile
```

## Migration from Supabase

If you're migrating from a Supabase setup:

### 1. Export Data
```bash
# Export from Supabase (if needed)
pg_dump postgresql://[supabase-connection] > backup.sql
```

### 2. Import to Local
```bash
# Import to local database
psql -U idrac_admin -d idrac_orchestrator < backup.sql
```

### 3. Update Configuration
```bash
# Update .env to remove Supabase settings
cp .env.example .env
# Edit .env with local settings
```

## Security Considerations

### Local Development
- Uses development API key (`dev-api-key`)
- TLS verification disabled for self-signed certificates
- Single-user mode (no authentication)

### Production Deployment
- Change default API key
- Enable TLS verification
- Use secure PostgreSQL credentials
- Configure firewall rules
- Enable audit logging

## Support

### Documentation
- [API Documentation](API.md)
- [Installation Guide](INSTALLATION.md)
- [Deployment Guide](DEPLOYMENT.md)

### Common Commands
```bash
# Start all services
npm run dev

# Reset everything
docker-compose down -v
npm run clean
npm install

# Check system status
curl http://localhost:8081/health
```