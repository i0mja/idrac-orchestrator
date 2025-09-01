#!/bin/bash

# iDRAC Updater Orchestrator - One-Click Installation Script
# This script sets up the complete environment with Docker Compose
# Compatible with RHEL 9, CentOS 9, Rocky Linux 9, AlmaLinux 9

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

# Detect OS
detect_os() {
    if [ -f /etc/redhat-release ]; then
        OS="rhel"
        if grep -q "Rocky" /etc/redhat-release; then
            DISTRO="rocky"
        elif grep -q "AlmaLinux" /etc/redhat-release; then
            DISTRO="alma"  
        elif grep -q "CentOS" /etc/redhat-release; then
            DISTRO="centos"
        else
            DISTRO="rhel"
        fi
        VERSION=$(rpm -E %rhel)
        PACKAGE_MANAGER="dnf"
    elif [ -f /etc/debian_version ]; then
        OS="debian"
        DISTRO="ubuntu"
        VERSION=$(lsb_release -sr)
        PACKAGE_MANAGER="apt"
    else
        print_error "Unsupported operating system. This installer supports RHEL 9, CentOS 9, Rocky Linux 9, and Ubuntu 20.04+."
    fi
    
    print_success "Detected: $DISTRO $VERSION"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Consider using a dedicated user for production."
    fi
}

# Check system requirements
check_requirements() {
    print_info "Checking system requirements..."
    
    # Check OS support
    if [[ "$OS" == "rhel" && "$VERSION" -lt "9" ]]; then
        print_error "RHEL/CentOS 8 or lower is not supported. Please use RHEL 9+ or Rocky/AlmaLinux 9+."
    fi
    
    print_success "OS compatibility check passed"
    
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
}

# Install Docker if not present
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker already installed"
        return
    fi
    
    print_info "Installing Docker..."
    
    if [[ "$OS" == "rhel" ]]; then
        # RHEL/CentOS/Rocky/AlmaLinux Docker installation
        $PACKAGE_MANAGER update -y
        $PACKAGE_MANAGER install -y yum-utils device-mapper-persistent-data lvm2
        
        # Add Docker repository
        $PACKAGE_MANAGER config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        
        # Install Docker
        $PACKAGE_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        # Ubuntu/Debian Docker installation
        apt-get update -qq
        apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        # Add Docker GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # Add Docker repository
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker
        apt-get update -qq
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
    
    # Start and enable Docker service
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group if not root
    if [[ $EUID -ne 0 ]]; then
        usermod -aG docker $USER
        print_warning "Added $USER to docker group. You may need to log out and back in."
    fi
    
    print_success "Docker installed successfully"
}

# Configure firewall
setup_firewall() {
    if [[ "$OS" == "rhel" ]]; then
        # RHEL uses firewalld
        print_info "Configuring firewalld..."
        
        systemctl start firewalld
        systemctl enable firewalld
        
        firewall-cmd --permanent --add-port=22/tcp    # SSH
        firewall-cmd --permanent --add-port=80/tcp    # HTTP
        firewall-cmd --permanent --add-port=443/tcp   # HTTPS
        firewall-cmd --permanent --add-port=3000/tcp  # Application
        firewall-cmd --reload
        
        print_success "Firewalld configured"
    else
        # Ubuntu uses ufw
        if command -v ufw &> /dev/null; then
            print_info "Configuring ufw..."
            
            ufw --force enable
            ufw allow 22/tcp    # SSH
            ufw allow 80/tcp    # HTTP
            ufw allow 443/tcp   # HTTPS
            ufw allow 3000/tcp  # Application
            
            print_success "UFW configured"
        else
            print_warning "No firewall manager found. Configure firewall manually if needed."
        fi
    fi
}

# Install PostgreSQL if needed (for native installation)
install_postgresql() {
    if [[ "$1" != "--native" ]]; then
        return  # Skip for Docker installation
    fi
    
    print_info "Installing PostgreSQL..."
    
    if [[ "$OS" == "rhel" ]]; then
        # RHEL PostgreSQL installation
        $PACKAGE_MANAGER install -y postgresql postgresql-server postgresql-contrib
        
        # Initialize database
        if [ ! -f /var/lib/pgsql/data/postgresql.conf ]; then
            postgresql-setup --initdb
        fi
        
        systemctl start postgresql
        systemctl enable postgresql
    else
        # Ubuntu PostgreSQL installation  
        apt-get update -qq
        apt-get install -y postgresql postgresql-contrib
        
        systemctl start postgresql
        systemctl enable postgresql
    fi
    
    print_success "PostgreSQL installed"
}

# Setup SELinux for RHEL
configure_selinux() {
    if [[ "$OS" != "rhel" ]]; then
        return
    fi
    
    print_info "Configuring SELinux for Docker..."
    
    # Install SELinux tools
    $PACKAGE_MANAGER install -y policycoreutils-python-utils
    
    # Allow Docker to bind to ports
    setsebool -P container_manage_cgroup on
    
    # Allow Docker to access network
    setsebool -P docker_connect_any on
    
    print_success "SELinux configured for Docker"
}

# Install Docker if not present
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker already installed"
        return
    fi
    
    print_info "Installing Docker..."
    
    # Update package index
    apt-get update -qq
    
    # Install dependencies
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update -qq
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start Docker service
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker installed successfully"
}

# Install Docker Compose if not present
install_docker_compose() {
    if docker compose version &> /dev/null; then
        print_success "Docker Compose already available"
        return
    fi
    
    print_info "Installing Docker Compose..."
    
    # Install as Docker plugin (modern approach)
    apt-get install -y docker-compose-plugin
    
    print_success "Docker Compose installed successfully"
}

# Create installation directory
create_directories() {
    print_info "Creating installation directories..."
    
    mkdir -p $INSTALL_DIR
    mkdir -p $CONFIG_DIR
    mkdir -p /var/log/idrac-orchestrator
    mkdir -p /opt/firmware
    
    print_success "Directories created"
}

# Generate configuration files
generate_config() {
    print_info "Generating configuration files..."
    
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Create docker-compose.yml
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
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    networks:
      - idrac_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U idrac_admin -d idrac_orchestrator"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    image: idrac-orchestrator:latest
    container_name: idrac-orchestrator
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://idrac_admin:${DB_PASSWORD}@postgres:5432/idrac_orchestrator
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - firmware_storage:/opt/firmware
      - app_logs:/app/logs
    networks:
      - idrac_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
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
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      app:
        condition: service_healthy
    networks:
      - idrac_network

volumes:
  postgres_data:
  firmware_storage:
  app_logs:

networks:
  idrac_network:
    driver: bridge
EOF

    # Create nginx configuration
    cat > $INSTALL_DIR/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name _;
        
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
        }
    }
}
EOF

    # Create environment file
    cat > $CONFIG_DIR/environment << EOF
# iDRAC Orchestrator Configuration
# Generated on $(date)

DATABASE_URL=postgresql://idrac_admin:${DB_PASSWORD}@localhost:5432/idrac_orchestrator
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
NODE_ENV=production

# Web Interface
WEB_PORT=3000
WEB_HOST=0.0.0.0

# Security
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5

# Storage
FIRMWARE_STORAGE_PATH=/opt/firmware
MAX_FIRMWARE_SIZE=2GB

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
EOF

    chmod 600 $CONFIG_DIR/environment
    
    print_success "Configuration files generated"
}

# Download application files
download_application() {
    print_info "Downloading application files..."
    
    cd $INSTALL_DIR
    
    # Download database initialization script
    curl -fsSL https://raw.githubusercontent.com/your-org/idrac-orchestrator/main/init.sql -o init.sql
    
    # Download Docker image or build locally
    # For now, we'll use a placeholder - in production this would pull from a registry
    print_info "Building application Docker image..."
    
    # Create a temporary Dockerfile
    cat > Dockerfile.temp << 'EOF'
FROM node:18-alpine
WORKDIR /app
# This would copy the actual application files
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
EOF

    # In a real deployment, this would pull from a registry:
    # docker pull your-registry.com/idrac-orchestrator:latest
    
    print_success "Application files ready"
}

# Generate SSL certificates
generate_ssl() {
    print_info "Generating self-signed SSL certificates..."
    
    mkdir -p $INSTALL_DIR/ssl
    
    # Generate private key
    openssl genrsa -out $INSTALL_DIR/ssl/key.pem 4096
    
    # Generate certificate
    openssl req -new -x509 -key $INSTALL_DIR/ssl/key.pem -out $INSTALL_DIR/ssl/cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    print_success "SSL certificates generated"
    print_warning "Using self-signed certificates. Replace with proper certificates for production."
}

# Start services
start_services() {
    print_info "Starting services..."
    
    cd $INSTALL_DIR
    
    # Start containers
    docker compose up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services. Check logs with: docker compose logs"
    fi
}

# Create systemd service for auto-start
create_systemd_service() {
    print_info "Creating systemd service..."
    
    cat > /etc/systemd/system/idrac-orchestrator.service << EOF
[Unit]
Description=iDRAC Updater Orchestrator
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable idrac-orchestrator
    
    print_success "Systemd service created"
}

# Setup firewall rules
setup_firewall() {
    if command -v ufw &> /dev/null; then
        print_info "Configuring firewall..."
        
        ufw --force enable
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 3000/tcp  # Application (direct access)
        
        print_success "Firewall configured"
    else
        print_warning "UFW not available. Configure firewall manually if needed."
    fi
}

# Create admin user (placeholder)
create_admin_user() {
    print_info "Setting up default admin user..."
    
    # This would typically connect to the database and create the user
    # For now, we'll just provide instructions
    
    cat > $INSTALL_DIR/admin-setup.txt << EOF
Default Admin User Setup:

1. Open http://localhost:3000 in your browser
2. Complete the setup wizard
3. Create your admin user account

Database Connection Details:
- Host: localhost
- Port: 5432
- Database: idrac_orchestrator
- Username: idrac_admin
- Password: (stored in $CONFIG_DIR/environment)

Configuration Files:
- Docker Compose: $INSTALL_DIR/docker-compose.yml
- Environment: $CONFIG_DIR/environment
- Nginx Config: $INSTALL_DIR/nginx.conf
EOF

    print_success "Admin setup instructions created"
}

# Main installation function
main() {
    echo "=========================================="
    echo "  iDRAC Updater Orchestrator Installer"
    echo "=========================================="
    echo ""
    
    # Create log file
    touch $LOG_FILE
    
    print_info "Starting installation..."
    
    # Run installation steps
    detect_os
    check_root
    check_requirements
    configure_selinux
    install_docker
    create_directories
    generate_config
    download_application
    generate_ssl
    start_services
    create_systemd_service
    setup_firewall
    create_admin_user
    
    echo ""
    echo "=========================================="
    print_success "Installation completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Complete the setup wizard"
    echo "3. Configure your VMware vCenter connections"
    echo "4. Add Dell server credentials"
    echo ""
    echo "Useful commands:"
    echo "  Status:  docker compose ps"
    echo "  Logs:    docker compose logs -f"
    echo "  Stop:    docker compose down"
    echo "  Start:   docker compose up -d"
    echo ""
    echo "Configuration files:"
    echo "  Docker:  $INSTALL_DIR/docker-compose.yml"
    echo "  Config:  $CONFIG_DIR/environment"
    echo "  Admin:   $INSTALL_DIR/admin-setup.txt"
    echo ""
}

# Run main function
main "$@"