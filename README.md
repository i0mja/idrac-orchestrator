# iDRAC Updater Orchestrator

A comprehensive enterprise-grade solution for orchestrating firmware updates across Dell server infrastructure with VMware vCenter integration. This system ensures zero-downtime rolling updates while maintaining cluster availability and respecting maintenance windows.

## 🚀 Quick Start (5 Minutes)

Get up and running instantly with our one-click installation:

### Option 1: RHEL 9 Optimized (Recommended)
```bash
# RedHat Enterprise Linux 9, Rocky Linux 9, AlmaLinux 9
curl -fsSL https://install.idrac-orchestrator.com/rhel.sh | sudo bash
```
**✅ Optimized for RHEL 9 • ✅ SELinux configured • ✅ systemd integration • ✅ Enterprise ready**

### Option 2: Docker (Universal)
```bash
curl -fsSL https://install.idrac-orchestrator.com/docker.sh | bash
```
**✅ Works on any platform • ✅ Complete setup in 5 minutes • ✅ Auto-configures everything**

### Option 3: Windows Server
```powershell
# Run as Administrator in PowerShell
Invoke-WebRequest -Uri "https://install.idrac-orchestrator.com/install-windows.ps1" -OutFile "install.ps1"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\install.ps1
```

### Option 4: Try Demo Mode  
```bash
npx idrac-orchestrator-demo
```
**✅ No installation • ✅ Sample data included • ✅ Ready in 1 minute**

### Option 5: Advanced Setup
See [QUICK_START.md](QUICK_START.md) for detailed options or [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment.

---

## 🚀 Features

### Core Capabilities
- **Cluster-Aware Rolling Updates** - Intelligent firmware orchestration that respects VMware DRS/HA constraints
- **Real-time Health Monitoring** - Comprehensive server health checks via Redfish API and vCenter integration
- **Maintenance Window Enforcement** - Automatic scheduling and compliance with datacenter maintenance policies
- **Credential Management** - Secure, hierarchical credential profiles with IP-based assignment
- **Firmware Library** - Centralized firmware package management with compatibility validation
- **Multi-Datacenter Support** - Geographic distribution awareness with timezone handling

### Enterprise Integration
- **VMware vCenter** - Native REST API integration for cluster synchronization and host management
- **Dell iDRAC** - Redfish API integration for firmware updates and hardware monitoring  
- **LDAP/Active Directory** - Enterprise authentication and user management
- **Supabase Backend** - Real-time database with edge functions for scalable operations

### Safety & Compliance
- **Preflight Checks** - Comprehensive validation before initiating updates
- **Rollback Capabilities** - Automated recovery procedures for failed updates
- **Audit Logging** - Complete audit trail of all operations and system events
- **Role-Based Access Control** - Granular permissions for operations and configuration

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web UI │────│  Supabase Edge  │────│   Dell iDRAC    │
│                 │    │    Functions    │    │   Redfish API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         └──────────────│  PostgreSQL DB  │─────────────┘
                        │   + Realtime    │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │  VMware vCenter │
                        │    REST API     │
                        └─────────────────┘
```

### Technology Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with Row Level Security
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for firmware files
- **APIs**: VMware vCenter REST API, Dell Redfish API

## 📋 Prerequisites

**For One-Click Installation:**
- Docker Desktop or Docker Engine (recommended)
- OR Windows Server 2016+ / Linux Ubuntu 18.04+
- 4GB RAM, 20GB disk space
- Network access to Dell servers and VMware vCenter

**For Manual Setup:**
- Node.js 18+ and npm/yarn
- PostgreSQL 15+ database server
- VMware vCenter access with API credentials
- Dell servers with iDRAC access
- Network connectivity between orchestrator and target infrastructure

## 🛠️ Installation & Setup

### Quick Start (Recommended)

**1. Run One-Click Installer**
```bash
# RHEL 9 / Rocky Linux 9 / AlmaLinux 9 (Recommended for Enterprise)
curl -fsSL https://install.idrac-orchestrator.com/rhel.sh | sudo bash

# Docker (works everywhere)
curl -fsSL https://install.idrac-orchestrator.com/docker.sh | bash

# Other Linux distributions
curl -fsSL https://install.idrac-orchestrator.com/linux.sh | sudo bash
```

**2. Access Web Interface**
```
http://localhost:3000
Default login: admin@localhost (password generated during setup)
```

**3. Complete 2-Minute Setup Wizard**
- Configure VMware vCenter connections
- Set up Dell server credential profiles  
- Define datacenters and maintenance windows
- Test connectivity and start managing servers

### Alternative Installation Methods

| Method | Time | Best For |
|--------|------|----------|
| **[RHEL 9 Optimized](QUICK_START.md#option-4-linux-native)** | 8 min | RHEL/Rocky/AlmaLinux 9 (recommended) |
| **[One-Click Docker](QUICK_START.md#option-1-docker-recommended)** | 5 min | Universal compatibility |
| **[Windows PowerShell](QUICK_START.md#option-4-windows-server)** | 10 min | Windows Server environments |
| **[Demo Mode](QUICK_START.md#option-2-demo-mode)** | 1 min | Testing and evaluation |
| **[Cloud Deployment](DEPLOYMENT.md#option-3-kubernetes-deployment)** | 15 min | AWS, Azure, GCP |
| **[Manual Setup](INSTALLATION.md)** | 30 min | Custom configurations |

### Legacy/Manual Installation

For custom deployments or development environments, see the detailed guides:
- **[INSTALLATION.md](INSTALLATION.md)** - Detailed manual installation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[Docker Compose](docker-compose.prod.yml)** - Self-hosted containers

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| **[QUICK_START.md](QUICK_START.md)** | 5-minute installation options |
| **[INSTALLATION.md](INSTALLATION.md)** | Detailed manual setup |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Production deployment |
| **[agents.md](agents.md)** | Technical architecture |

## 🎯 Post-Installation

After installation, complete the setup wizard:
**1. Complete Setup Wizard** (2 minutes)
- Organization settings and timezone
- VMware vCenter connections  
- Dell server credential profiles
- Network discovery and datacenters

**2. Verify Connectivity**
- Test vCenter API access
- Validate iDRAC credentials
- Run server discovery
- Check health status

**3. Upload Firmware Packages**
- Download Dell firmware from support site
- Or use built-in Dell firmware downloader
- Validate compatibility matrices
- Organize by server models

**4. Configure Maintenance Windows**
- Define datacenter maintenance schedules
- Set timezone-aware windows
- Configure approval workflows
- Test emergency override procedures

**5. Schedule First Update**
- Start with non-production servers
- Create rolling update plan
- Review orchestration settings
- Monitor progress in real-time

### Main Interface Areas

**Dashboard Overview**
- Fleet health status indicators
- **Active Operations** - Currently running update jobs and orchestrations  
- **Maintenance Windows** - Upcoming scheduled maintenance
- **Recent Events** - System activity and alerts

### Server Management

**Global Inventory** (`/inventory`)
- View all discovered servers across datacenters
- Check connectivity status and credential assignments
- Access server details and health information
- Initiate individual server operations

**Discovery** (`/discovery`) 
- Automated server discovery via network scanning
- vCenter host synchronization
- Credential validation and assignment

### Firmware Management

**Firmware Packages** (`/firmware`)
- Upload and manage firmware packages
- View compatibility matrices
- Download Dell firmware packages
- Schedule fleet-wide updates

### Orchestration

**Update Scheduling** (`/scheduler`)
- Create rolling update plans
- Configure maintenance windows  
- Set cluster update policies
- Monitor orchestration progress

**Command Center** (`/scheduler/command`)
- Real-time orchestration control
- Pause/resume/cancel operations
- View detailed job progress
- Emergency stop capabilities

### Monitoring & Alerts

**Health Checks** (`/health`)
- Comprehensive server health monitoring
- Redfish API status validation
- vCenter connectivity checks
- Hardware status aggregation

**System Events** (`/alerts`)
- Real-time system alerts and notifications
- Event acknowledgment and management
- Audit trail and compliance reporting

## 🔧 Configuration

### Credential Profiles

Configure hierarchical credential assignment:

```yaml
Priority Order:
1. Host-specific overrides
2. IP range assignments  
3. Datacenter defaults
4. Global defaults
```

### Maintenance Windows

Set up datacenter maintenance policies:

```yaml
Datacenter Configuration:
  - Timezone handling
  - Maintenance window schedules
  - Emergency override policies
  - Notification preferences
```

### Update Policies

Configure rolling update behavior:

```yaml
Cluster Policies:
  - Maximum concurrent hosts
  - Minimum hosts online
  - DRS/HA requirements
  - Rollback triggers
```

## 📋 System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB  
- **Storage**: 20GB
- **OS**: Linux, Windows Server, or macOS with Docker

### Recommended Production
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB SSD
- **OS**: Linux Ubuntu 20.04+ or Windows Server 2019+
- **Network**: Gigabit connectivity to server management networks

### Supported Platforms
| Platform | Installation Method | Status |
|----------|-------------------|---------|
| **Docker** | One-click script | ✅ Recommended |
| **RHEL 9 / Rocky 9 / AlmaLinux 9** | Optimized native install | ✅ **Primary Support** |
| **Ubuntu 20.04+** | Native install | ✅ Supported |
| **CentOS Stream 9** | RHEL script | ✅ Supported |  
| **Windows Server 2019+** | PowerShell script | ✅ Supported |
| **AWS/Azure/GCP** | Cloud templates | ✅ Supported |
| **Kubernetes** | Helm charts | ✅ Supported |

## 🛡️ Security

### Authentication & Authorization
- Supabase Auth integration with role-based access control
- Row Level Security (RLS) policies on all tables
- Encrypted credential storage with hierarchical access

### Network Security  
- TLS encryption for all API communications
- Credential-based authentication for device access
- Network segmentation support for management interfaces

### Audit & Compliance
- Complete audit trail of all operations
- Immutable event logging
- Compliance reporting for enterprise requirements

## 🚨 Troubleshooting

### Common Issues

**Connection Problems**
- Verify network connectivity to iDRAC interfaces
- Check credential assignments and authentication
- Validate certificate trust for SSL connections

**Orchestration Failures**
- Review preflight check results
- Verify cluster health and DRS/HA status
- Check maintenance window compliance

**Performance Issues**
- Monitor concurrent operation limits
- Review database query performance
- Check edge function execution logs

### Monitoring

Access detailed logs through:
- Supabase Functions logs for edge function execution
- System Events table for application-level events  
- PostgreSQL logs for database operations
- Browser developer tools for frontend issues

## 📊 Monitoring & Observability

### Real-time Dashboards
- Server health status across all datacenters
- Active update job progress and status
- Orchestration plan execution monitoring
- System performance metrics

### Alerting
- Failed update notifications
- Server health degradation alerts
- Maintenance window violations
- Security and access anomalies

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Install dependencies and set up local Supabase
4. Make your changes with appropriate tests
5. Submit a pull request with detailed description

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier configuration
- Comprehensive error handling
- Real-time update patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Getting Help

### Quick Support Options
- 📖 **[Quick Start Guide](QUICK_START.md)** - Get running in 5 minutes
- 🔧 **[Installation Guide](INSTALLATION.md)** - Detailed setup instructions  
- 🚀 **[Deployment Guide](DEPLOYMENT.md)** - Production deployment
- 🏗️ **[Architecture Guide](agents.md)** - Technical deep-dive

### Community & Support  
- 💬 [Discussion Forum](https://github.com/i0mja/idrac-orchestrator/discussions)
- 🐛 [Report Issues](https://github.com/i0mja/idrac-orchestrator/issues)
- 📧 [Enterprise Support](mailto:support@idrac-orchestrator.com)
- 📚 [Documentation](https://docs.idrac-orchestrator.com)

### Common Solutions
| Issue | Quick Fix |
|-------|-----------|
| **Port 3000 busy** | `docker stop $(docker ps -q)` or use different port |
| **Database connection failed** | Run `docker-compose restart postgres` |  
| **vCenter SSL errors** | Enable "Ignore SSL" in vCenter settings |
| **Permission denied** | Run installer as administrator/root |

---

**⚠️ Important**: This system manages critical infrastructure. Always test in non-production environments first and follow your organization's change management procedures.