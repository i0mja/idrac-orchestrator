# Installation Guide

## Quick Start (Development)

```bash
# Clone repository
git clone <repository-url>
cd idrac-updater-orchestrator

# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Installation

### Prerequisites Checklist

- [ ] PostgreSQL 15+ server
- [ ] Node.js 18+ and npm
- [ ] SSL certificate (for production)
- [ ] Network access to Dell iDRAC interfaces
- [ ] VMware vCenter API access
- [ ] 10GB+ storage for firmware files

### Step 1: Database Setup

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
sudo apt update && sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb idrac_orchestrator
sudo -u postgres createuser -P idrac_admin

# Grant permissions
sudo -u postgres psql -c "GRANT ALL ON DATABASE idrac_orchestrator TO idrac_admin;"
```

**Option B: Docker PostgreSQL**
```bash
docker run --name postgres-idrac \
  -e POSTGRES_DB=idrac_orchestrator \
  -e POSTGRES_USER=idrac_admin \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15
```

### Step 2: Application Installation

```bash
# Clone and setup
git clone <repository-url>
cd idrac-updater-orchestrator
npm install

# Create environment file
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://idrac_admin:secure_password@localhost:5432/idrac_orchestrator
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SERVER_PORT=3000
EOF

# Build application
npm run build
```

### Step 3: Database Migration

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize database schema
supabase db reset --linked
supabase db push
```

### Step 4: Start Services

```bash
# Start application
npm run start:production

# Or with PM2 for production
npm install -g pm2
pm2 start ecosystem.config.js
```

### Step 5: Initial Setup

1. Access web interface: `http://localhost:3000`
2. Complete setup wizard (see DEPLOYMENT.md)
3. Configure integrations and credentials

## Docker Installation

### Single Container

```bash
# Build image
docker build -t idrac-orchestrator .

# Run container
docker run -d \
  --name idrac-orchestrator \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  idrac-orchestrator
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Kubernetes Installation

```bash
# Apply manifests
kubectl apply -f k8s-manifests/

# Check status
kubectl get pods -n idrac-orchestrator

# Port forward for testing
kubectl port-forward svc/idrac-orchestrator 3000:80 -n idrac-orchestrator
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `ENCRYPTION_KEY` | Data encryption key | Required |
| `SERVER_PORT` | Application port | 3000 |
| `SSL_CERT_PATH` | SSL certificate path | Optional |
| `SSL_KEY_PATH` | SSL private key path | Optional |

### Database Configuration

**postgresql.conf optimizations:**
```ini
# Connection settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
```

## Verification

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Service status
systemctl status idrac-orchestrator
```

### Smoke Tests

1. Login to web interface
2. Add test vCenter connection
3. Discover test server
4. Upload firmware package
5. Create maintenance window
6. Schedule test update job

## Troubleshooting

### Database Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Test connection
psql -h localhost -U idrac_admin -d idrac_orchestrator -c "\dt"
```

### Application Issues

```bash
# Check application logs
tail -f /var/log/idrac-orchestrator/app.log

# Check process status
ps aux | grep node

# Test API endpoints
curl -v http://localhost:3000/api/health
```

### Network Issues

```bash
# Test vCenter connectivity
curl -k https://vcenter.example.com/rest/com/vmware/cis/session

# Test iDRAC connectivity  
curl -k https://idrac.example.com/redfish/v1/Systems

# Check firewall
sudo ufw status
sudo iptables -L
```

## Backup and Recovery

### Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/idrac-orchestrator

# Firmware files
tar -czf $BACKUP_DIR/firmware_$DATE.tar.gz /opt/firmware
```

### Recovery Process

```bash
# Restore database
psql $DATABASE_URL < /opt/backups/db_YYYYMMDD_HHMMSS.sql

# Restore application
tar -xzf /opt/backups/app_YYYYMMDD_HHMMSS.tar.gz -C /

# Restore firmware files
tar -xzf /opt/backups/firmware_YYYYMMDD_HHMMSS.tar.gz -C /
```

## Security

### SSL Setup

```bash
# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Or use Let's Encrypt (production)
certbot certonly --standalone -d your-domain.com
```

### Firewall Configuration

```bash
# Allow required ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 5432  # PostgreSQL (if external)

# Enable firewall
sudo ufw enable
```

### User Management

```sql
-- Create read-only user
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE idrac_orchestrator TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Create backup user
CREATE USER backup_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE idrac_orchestrator TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

## Maintenance

### Regular Tasks

```bash
# Update application
git pull origin main
npm install
npm run build
pm2 restart idrac-orchestrator

# Database maintenance
psql $DATABASE_URL -c "VACUUM ANALYZE;"
psql $DATABASE_URL -c "REINDEX DATABASE idrac_orchestrator;"

# Log rotation
logrotate -f /etc/logrotate.d/idrac-orchestrator

# Cleanup old files
find /opt/firmware -name "*.exe" -mtime +90 -delete
find /opt/backups -name "*.sql" -mtime +30 -delete
```

### Monitoring Setup

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Setup log monitoring
tail -f /var/log/idrac-orchestrator/app.log | grep -E "(ERROR|WARN)"

# Database monitoring
psql $DATABASE_URL -c "
SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins DESC;"
```

## Next Steps

1. Complete the setup wizard in the web interface
2. Configure VMware vCenter connections  
3. Set up credential profiles for Dell servers
4. Define datacenters and maintenance windows
5. Upload initial firmware packages
6. Test with non-critical servers first
7. Set up monitoring and alerting
8. Schedule regular backups
9. Review security hardening checklist
10. Train operators on the interface

For detailed configuration options, see [DEPLOYMENT.md](DEPLOYMENT.md).