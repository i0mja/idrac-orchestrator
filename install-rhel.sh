#!/bin/bash

# iDRAC Updater Orchestrator - RHEL 9 Optimized Installation Script
# Specifically designed for RedHat Enterprise Linux 9, Rocky Linux 9, AlmaLinux 9

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/idrac-orchestrator"
CONFIG_DIR="/etc/idrac-orchestrator"
LOG_FILE="/var/log/idrac-orchestrator-install.log"
SYSTEMD_SERVICE="/etc/systemd/system/idrac-orchestrator.service"

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a $LOG_FILE
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

# Detect RHEL variant
detect_rhel_variant() {
    if [ ! -f /etc/redhat-release ]; then
        print_error "This script is for RHEL-based systems only. Use install.sh for other distributions."
    fi
    
    if grep -q "Rocky" /etc/redhat-release; then
        DISTRO="Rocky Linux"
    elif grep -q "AlmaLinux" /etc/redhat-release; then
        DISTRO="AlmaLinux"  
    elif grep -q "CentOS" /etc/redhat-release; then
        DISTRO="CentOS Stream"
    elif grep -q "Red Hat" /etc/redhat-release; then
        DISTRO="Red Hat Enterprise Linux"
    else
        DISTRO="Unknown RHEL variant"
    fi
    
    VERSION=$(rpm -E %rhel)
    
    if [ "$VERSION" -lt "9" ]; then
        print_error "RHEL/CentOS 8 or lower is not supported. Please upgrade to RHEL 9 or use Rocky/AlmaLinux 9."
    fi
    
    print_success "Detected: $DISTRO $VERSION"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root on RHEL systems. Use: sudo $0"
    fi
    print_info "Running as root - proceeding with system installation"
}

# Check system requirements
check_requirements() {
    print_info "Checking RHEL 9 system requirements..."
    
    # Check subscription status (for RHEL)
    if grep -q "Red Hat Enterprise Linux" /etc/redhat-release; then
        if ! subscription-manager status &> /dev/null; then
            print_warning "RHEL subscription not active. Some packages may not install correctly."
        else
            print_success "RHEL subscription is active"
        fi
    fi
    
    # Check memory
    MEM_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [ $MEM_GB -lt 4 ]; then
        print_warning "System has ${MEM_GB}GB RAM. Minimum 4GB recommended."
    else
        print_success "Memory check passed (${MEM_GB}GB available)"
    fi
    
    # Check disk space
    DISK_GB=$(df / | awk 'NR==2{printf "%.0f", $4/1024/1024}')
    if [ $DISK_GB -lt 20 ]; then
        print_warning "Low disk space: ${DISK_GB}GB available. 20GB recommended."
    else
        print_success "Disk space check passed (${DISK_GB}GB available)"
    fi
    
    # Check if EPEL is available
    if ! dnf repolist | grep -q epel; then
        print_info "EPEL repository not found. Will install it."
    fi
}

# Configure RHEL repositories
configure_repositories() {
    print_info "Configuring RHEL repositories..."
    
    # Update system packages
    dnf update -y
    
    # Install EPEL repository
    if ! dnf repolist | grep -q epel; then
        dnf install -y epel-release
        print_success "EPEL repository installed"
    fi
    
    # Install additional development tools
    dnf groupinstall -y "Development Tools"
    dnf install -y curl wget git vim nano htop
    
    print_success "System repositories configured"
}

# Install Docker on RHEL 9
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker already installed"
        docker --version
        return
    fi
    
    print_info "Installing Docker on RHEL 9..."
    
    # Remove any old Docker packages
    dnf remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine podman runc || true
    
    # Install required packages
    dnf install -y yum-utils device-mapper-persistent-data lvm2
    
    # Add Docker repository
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # Install Docker Engine
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Test Docker installation
    docker run hello-world &> /dev/null && print_success "Docker installation verified" || print_error "Docker installation failed"
    
    # Create docker group and add current user if not root installation
    if ! getent group docker > /dev/null; then
        groupadd docker
    fi
    
    print_success "Docker installed successfully"
    docker --version
}

# Configure SELinux for Docker
configure_selinux() {
    print_info "Configuring SELinux for Docker and application..."
    
    # Install SELinux tools
    dnf install -y policycoreutils-python-utils setools-console
    
    # Set SELinux booleans for Docker
    setsebool -P container_manage_cgroup on
    setsebool -P virt_use_execmem on
    setsebool -P virt_sandbox_use_all_caps on
    
    # Allow Docker to bind to network ports
    semanage port -a -t container_port_t -p tcp 3000 2>/dev/null || semanage port -m -t container_port_t -p tcp 3000
    semanage port -a -t container_port_t -p tcp 5432 2>/dev/null || semanage port -m -t container_port_t -p tcp 5432
    
    # Set file contexts for application directories
    semanage fcontext -a -t container_file_t "$INSTALL_DIR(/.*)?" 2>/dev/null || true
    semanage fcontext -a -t container_file_t "$CONFIG_DIR(/.*)?" 2>/dev/null || true
    semanage fcontext -a -t container_file_t "/opt/firmware(/.*)?" 2>/dev/null || true
    
    # Restore contexts
    restorecon -R $INSTALL_DIR $CONFIG_DIR /opt/firmware 2>/dev/null || true
    
    print_success "SELinux configured for containerized applications"
}

# Configure firewalld (RHEL's default firewall)
configure_firewall() {
    print_info "Configuring firewalld..."
    
    # Start and enable firewalld
    systemctl start firewalld
    systemctl enable firewalld
    
    # Configure firewall rules
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=5432/tcp
    
    # Create custom service for iDRAC Orchestrator
    cat > /etc/firewalld/services/idrac-orchestrator.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>iDRAC Orchestrator</short>
  <description>Dell iDRAC firmware management orchestrator</description>
  <port protocol="tcp" port="3000"/>
  <port protocol="tcp" port="5432"/>
</service>
EOF

    firewall-cmd --permanent --add-service=idrac-orchestrator
    firewall-cmd --reload
    
    print_success "Firewalld configured with custom iDRAC Orchestrator service"
    
    # Show active zones and services
    firewall-cmd --list-all
}

# Create installation directories with proper ownership
create_directories() {
    print_info "Creating application directories..."
    
    # Create main directories
    mkdir -p $INSTALL_DIR
    mkdir -p $CONFIG_DIR
    mkdir -p /var/log/idrac-orchestrator
    mkdir -p /opt/firmware
    mkdir -p /var/lib/idrac-orchestrator
    
    # Create application user if it doesn't exist
    if ! id "idrac" &>/dev/null; then
        useradd -r -d $INSTALL_DIR -s /bin/false -c "iDRAC Orchestrator Service" idrac
        print_success "Created idrac service user"
    fi
    
    # Set proper ownership and permissions
    chown -R idrac:idrac $INSTALL_DIR $CONFIG_DIR /opt/firmware /var/lib/idrac-orchestrator
    chown -R idrac:idrac /var/log/idrac-orchestrator
    chmod 755 $INSTALL_DIR $CONFIG_DIR
    chmod 750 /var/log/idrac-orchestrator
    chmod 775 /opt/firmware
    
    print_success "Directories created with proper RHEL permissions"
}

# Generate RHEL-specific configuration
generate_config() {
    print_info "Generating RHEL-optimized configuration..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Create docker-compose.yml optimized for RHEL
    cat > $INSTALL_DIR/docker-compose.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: idrac-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: idrac_orchestrator
      POSTGRES_USER: idrac_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - $INSTALL_DIR/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"  # Bind to localhost only for security
    networks:
      - idrac_network
    security_opt:
      - label:type:container_runtime_t
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U idrac_admin -d idrac_orchestrator"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    build: .
    container_name: idrac-orchestrator
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://idrac_admin:${DB_PASSWORD}@postgres:5432/idrac_orchestrator
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      TZ: America/New_York
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - firmware_storage:/opt/firmware
      - app_logs:/app/logs
      - /etc/localtime:/etc/localtime:ro
    networks:
      - idrac_network
    security_opt:
      - label:type:container_runtime_t
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: idrac-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - $INSTALL_DIR/nginx.conf:/etc/nginx/nginx.conf:ro
      - $INSTALL_DIR/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      app:
        condition: service_healthy
    networks:
      - idrac_network
    security_opt:
      - label:type:container_runtime_t

volumes:
  postgres_data:
    driver: local
  firmware_storage:
    driver: local
  app_logs:
    driver: local
  nginx_logs:
    driver: local

networks:
  idrac_network:
    driver: bridge
EOF

    # Create environment file with RHEL-specific settings
    cat > $CONFIG_DIR/environment << EOF
# iDRAC Orchestrator Configuration for RHEL 9
# Generated on $(date)

# Database Configuration
DATABASE_URL=postgresql://idrac_admin:${DB_PASSWORD}@localhost:5432/idrac_orchestrator

# Security
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Application Settings
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# RHEL Specific Settings
TZ=America/New_York
SYSTEMD_SERVICE=true

# Storage Configuration
FIRMWARE_STORAGE_PATH=/opt/firmware
MAX_FIRMWARE_SIZE=2GB
BACKUP_PATH=/var/lib/idrac-orchestrator/backups

# Logging (RHEL uses journald)
LOG_LEVEL=info
LOG_TO_JOURNAL=true
LOG_RETENTION_DAYS=30

# SELinux
SELINUX_ENABLED=true
CONTAINER_SELINUX_CONTEXT=container_runtime_t
EOF

    chmod 600 $CONFIG_DIR/environment
    chown idrac:idrac $CONFIG_DIR/environment
    
    print_success "RHEL-optimized configuration generated"
}

# Create systemd service for RHEL
create_systemd_service() {
    print_info "Creating systemd service for RHEL..."
    
    cat > $SYSTEMD_SERVICE << EOF
[Unit]
Description=iDRAC Updater Orchestrator
Documentation=https://github.com/your-org/idrac-orchestrator
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=root
Group=docker
WorkingDirectory=$INSTALL_DIR
Environment="COMPOSE_PROJECT_NAME=idrac-orchestrator"
ExecStartPre=/usr/bin/docker compose -f $INSTALL_DIR/docker-compose.yml pull --quiet
ExecStart=/usr/bin/docker compose -f $INSTALL_DIR/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f $INSTALL_DIR/docker-compose.yml down
ExecReload=/usr/bin/docker compose -f $INSTALL_DIR/docker-compose.yml restart
TimeoutStartSec=300
TimeoutStopSec=60

# Security settings for RHEL
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$INSTALL_DIR $CONFIG_DIR /opt/firmware /var/lib/idrac-orchestrator /var/log/idrac-orchestrator

# Restart policy
Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable idrac-orchestrator
    
    print_success "Systemd service created and enabled"
}

# Download and prepare application files
download_application() {
    print_info "Downloading application files..."
    
    cd $INSTALL_DIR
    
    # Copy database initialization script from project
    if [ -f /tmp/init.sql ]; then
        cp /tmp/init.sql init.sql
    else
        echo "Warning: init.sql not found, creating minimal schema"
        cat > init.sql << 'EOSQL'
-- Minimal database schema for iDRAC Orchestrator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL
    fi
    
    # Create nginx configuration optimized for RHEL
    cat > nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    upstream app {
        server app:3000;
        keepalive 32;
    }
    
    server {
        listen 80;
        server_name _;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name _;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        
        # Modern configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://app/api/health;
        }
    }
}
EOF

    chown -R idrac:idrac $INSTALL_DIR
    print_success "Application files prepared"
}

# Generate SSL certificates for RHEL
generate_ssl() {
    print_info "Generating SSL certificates..."
    
    mkdir -p $INSTALL_DIR/ssl
    cd $INSTALL_DIR/ssl
    
    # Generate private key
    openssl genrsa -out key.pem 4096
    
    # Generate certificate with SAN for RHEL environments
    openssl req -new -x509 -key key.pem -out cert.pem -days 365 \
        -config <(cat <<EOF
[req]
default_bits = 4096
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C=US
ST=State
L=City
O=Organization
CN=localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $(hostname)
DNS.3 = $(hostname -f)
IP.1 = 127.0.0.1
IP.2 = $(hostname -I | awk '{print $1}')
EOF
    )
    
    # Set proper permissions
    chmod 600 key.pem
    chmod 644 cert.pem
    chown idrac:idrac key.pem cert.pem
    
    print_success "SSL certificates generated with RHEL hostname support"
}

# Start services and verify
start_services() {
    print_info "Starting iDRAC Orchestrator services..."
    
    cd $INSTALL_DIR
    
    # Start the systemd service
    systemctl start idrac-orchestrator
    
    # Wait for services to be ready
    print_info "Waiting for services to start (this may take a few minutes)..."
    
    local retries=0
    local max_retries=30
    
    while [ $retries -lt $max_retries ]; do
        if docker compose ps | grep -q "Up"; then
            break
        fi
        sleep 10
        retries=$((retries + 1))
        print_info "Waiting for containers to start... ($retries/$max_retries)"
    done
    
    if [ $retries -eq $max_retries ]; then
        print_error "Services failed to start within expected time. Check logs: journalctl -u idrac-orchestrator"
    fi
    
    # Verify application health
    sleep 20
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Application health check passed"
    else
        print_warning "Application may still be starting. Check status: systemctl status idrac-orchestrator"
    fi
    
    print_success "Services started successfully"
}

# Create backup and monitoring scripts for RHEL
create_rhel_scripts() {
    print_info "Creating RHEL management scripts..."
    
    # Create backup script
    cat > /usr/local/bin/idrac-backup << 'EOF'
#!/bin/bash
# iDRAC Orchestrator backup script for RHEL

BACKUP_DIR="/var/lib/idrac-orchestrator/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec idrac-postgres pg_dump -U idrac_admin idrac_orchestrator | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/idrac-orchestrator /opt/idrac-orchestrator

# Backup firmware files
tar -czf $BACKUP_DIR/firmware_$DATE.tar.gz /opt/firmware

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

    # Create monitoring script
    cat > /usr/local/bin/idrac-status << 'EOF'
#!/bin/bash
# iDRAC Orchestrator status script for RHEL

echo "=== iDRAC Orchestrator Status ==="
echo "Date: $(date)"
echo

echo "=== Systemd Service ==="
systemctl status idrac-orchestrator --no-pager

echo "=== Docker Containers ==="
docker compose -f /opt/idrac-orchestrator/docker-compose.yml ps

echo "=== Application Health ==="
curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo "Health check failed"

echo "=== Disk Usage ==="
df -h /opt/firmware /var/lib/idrac-orchestrator

echo "=== Recent Logs ==="
journalctl -u idrac-orchestrator --no-pager -n 10
EOF

    chmod +x /usr/local/bin/idrac-backup /usr/local/bin/idrac-status
    
    # Create logrotate configuration
    cat > /etc/logrotate.d/idrac-orchestrator << 'EOF'
/var/log/idrac-orchestrator/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 idrac idrac
    postrotate
        systemctl reload idrac-orchestrator
    endscript
}
EOF

    # Create cron job for backups
    cat > /etc/cron.d/idrac-backup << 'EOF'
# Daily backup at 2 AM
0 2 * * * root /usr/local/bin/idrac-backup >> /var/log/idrac-orchestrator/backup.log 2>&1
EOF

    print_success "RHEL management scripts created"
}

# Main installation function
main() {
    echo "=========================================="
    echo "  iDRAC Orchestrator - RHEL 9 Installer"
    echo "=========================================="
    echo ""
    
    # Create log file
    touch $LOG_FILE
    
    print_info "Starting RHEL 9 optimized installation..."
    
    # Run installation steps
    detect_rhel_variant
    check_root
    check_requirements
    configure_repositories
    install_docker
    configure_selinux
    create_directories
    generate_config
    download_application
    generate_ssl
    create_systemd_service
    configure_firewall
    start_services
    create_rhel_scripts
    
    echo ""
    echo "=========================================="
    print_success "RHEL 9 Installation completed successfully!"
    echo "=========================================="
    echo ""
    echo "🎉 Your iDRAC Orchestrator is now running!"
    echo ""
    echo "📋 Access Information:"
    echo "   Web Interface: https://$(hostname):443 or https://$(hostname -I | awk '{print $1}'):443"
    echo "   Local Access:  http://localhost:3000"
    echo "   Default Admin: admin@localhost (password in setup wizard)"
    echo ""
    echo "🔧 Management Commands:"
    echo "   Status:     systemctl status idrac-orchestrator"
    echo "   Start:      systemctl start idrac-orchestrator"
    echo "   Stop:       systemctl stop idrac-orchestrator"
    echo "   Restart:    systemctl restart idrac-orchestrator"
    echo "   Logs:       journalctl -u idrac-orchestrator -f"
    echo "   Health:     idrac-status"
    echo "   Backup:     idrac-backup"
    echo ""
    echo "📁 Important Paths:"
    echo "   Application:  $INSTALL_DIR"
    echo "   Configuration: $CONFIG_DIR"
    echo "   Firmware:     /opt/firmware"
    echo "   Logs:         /var/log/idrac-orchestrator"
    echo "   Backups:      /var/lib/idrac-orchestrator/backups"
    echo ""
    echo "🔥 Firewall Configuration:"
    echo "   HTTP (80), HTTPS (443), and Application (3000) ports are open"
    echo "   Custom firewalld service: idrac-orchestrator"
    echo ""
    echo "🛡️ Security Notes:"
    echo "   - SELinux is configured and enabled"
    echo "   - SSL certificates are self-signed (replace for production)"
    echo "   - Database is accessible only from localhost"
    echo "   - Service runs with restricted permissions"
    echo ""
    echo "📖 Next Steps:"
    echo "   1. Access the web interface and complete setup wizard"
    echo "   2. Configure VMware vCenter connections"
    echo "   3. Set up Dell server credential profiles"
    echo "   4. Run server discovery and health checks"
    echo ""
}

# Run main function
main "$@"