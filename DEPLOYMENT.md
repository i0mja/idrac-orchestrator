# Production Deployment Guide

## Overview

This guide covers deploying the iDRAC Updater Orchestrator to production environments, including on-premise installations with local PostgreSQL databases.

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 15+ database server
- Docker (optional, for containerized deployment)
- SSL certificates (for HTTPS)
- Network access to target infrastructure (Dell servers, VMware vCenter)

## Deployment Options

### Option 1: Self-Hosted with Local PostgreSQL

#### 1. Database Setup

**Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# RHEL/CentOS
sudo yum install postgresql postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**Create Database and User:**
```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE idrac_orchestrator;
CREATE USER idrac_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE idrac_orchestrator TO idrac_admin;

-- Enable required extensions
\c idrac_orchestrator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
\q
```

#### 2. Application Setup

**Clone and Install:**
```bash
git clone <your-repository-url>
cd idrac-updater-orchestrator
npm install
```

**Environment Configuration:**
```bash
# Create production environment file
cp .env.example .env.production

# Edit with your database connection
nano .env.production
```

**.env.production:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://idrac_admin:your_secure_password@localhost:5432/idrac_orchestrator
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SERVER_PORT=3000
```

**Database Migration:**
```bash
# Install Supabase CLI
npm install -g supabase

# Run migrations
npm run db:migrate
```

**Build and Start:**
```bash
npm run build
npm run start:production
```

### Option 2: Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: idrac_orchestrator
      POSTGRES_USER: idrac_admin
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - idrac_network

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://idrac_admin:your_secure_password@postgres:5432/idrac_orchestrator
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - firmware_storage:/opt/firmware
    networks:
      - idrac_network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - idrac_network

volumes:
  postgres_data:
  firmware_storage:

networks:
  idrac_network:
    driver: bridge
```

### Option 3: Kubernetes Deployment

**k8s-manifests/:**
```bash
kubectl apply -f k8s-manifests/
```

## Production Configuration

### 1. SSL/TLS Setup

**nginx.conf:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow database (if external)
sudo ufw allow 5432

# Allow SSH (change port as needed)
sudo ufw allow 22

sudo ufw enable
```

### 3. Backup Configuration

**backup.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
DB_NAME="idrac_orchestrator"

# Database backup
pg_dump -h localhost -U idrac_admin -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Firmware files backup
tar -czf $BACKUP_DIR/firmware_backup_$DATE.tar.gz /opt/firmware

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

## First-Time Setup

After deployment, access the web interface and complete the setup wizard:

1. **Database Connection**: Verify connection to PostgreSQL
2. **Organization Settings**: Company name, contact info, timezone
3. **Authentication**: Configure LDAP/AD or local users
4. **Network Configuration**: Define datacenters and IP scopes
5. **VMware Integration**: Add vCenter connections
6. **Credential Profiles**: Set up default iDRAC credentials
7. **Storage Settings**: Configure firmware file storage
8. **Security Settings**: SSL, encryption, access controls
9. **Monitoring**: Health check intervals, alerting
10. **Admin User**: Create initial administrator account

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Application health
curl https://your-domain.com/api/health

# Database health  
psql -h localhost -U idrac_admin -d idrac_orchestrator -c "SELECT version();"
```

### 2. Log Monitoring

```bash
# Application logs
tail -f /var/log/idrac-orchestrator/app.log

# Database logs
tail -f /var/log/postgresql/postgresql-15-main.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 3. Performance Monitoring

- Monitor CPU, memory, and disk usage
- Track database connection pools
- Monitor firmware storage usage
- Set up alerting for failed update jobs

## Security Hardening

### 1. Database Security

```sql
-- Restrict database access
ALTER USER idrac_admin CONNECTION LIMIT 20;

-- Enable row level security
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_profiles ENABLE ROW LEVEL SECURITY;

-- Audit logging
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
```

### 2. Application Security

- Use strong JWT secrets and encryption keys
- Implement rate limiting
- Enable HTTPS only
- Regular security updates
- Network segmentation for management interfaces

### 3. Access Control

- Implement role-based access control (RBAC)
- Use service accounts for integrations
- Regular credential rotation
- Multi-factor authentication (MFA)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service status
   - Verify credentials and connection string
   - Check firewall rules

2. **VMware API Errors**
   - Verify vCenter credentials
   - Check network connectivity
   - Validate SSL certificate settings

3. **Firmware Upload Issues**
   - Check storage permissions
   - Verify available disk space
   - Review file size limits

4. **Update Job Failures**
   - Check server connectivity
   - Verify iDRAC credentials
   - Review maintenance window settings

### Log Analysis

```bash
# Search for errors
grep -i error /var/log/idrac-orchestrator/app.log

# Monitor real-time activity
tail -f /var/log/idrac-orchestrator/app.log | grep -E "(ERROR|WARN|FAIL)"

# Database query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer for multiple app instances
- Implement Redis for session storage
- Consider read replicas for database

### Vertical Scaling

- Monitor resource usage patterns
- Scale CPU/memory based on load
- Optimize database queries and indexes

### Storage Scaling

- Implement tiered storage for firmware files
- Use object storage (S3, MinIO) for large deployments
- Regular cleanup of old firmware packages

## Support

For production support:
- Review application logs first
- Check system resource usage
- Verify external integrations (vCenter, iDRAC)
- Contact your system administrator
- Create GitHub issues for bugs or feature requests