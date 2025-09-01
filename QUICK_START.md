# Quick Start Guide

Get your iDRAC Updater Orchestrator running in minutes with these simple options.

## 🚀 One-Click Installation Options

### Option 1: RHEL 9 Enterprise (Recommended)
**⏱️ 8 minutes | 🏢 Enterprise-ready | 🛡️ SELinux + systemd**

```bash
# RedHat Enterprise Linux 9, Rocky Linux 9, AlmaLinux 9
curl -fsSL https://install.idrac-orchestrator.com/rhel.sh | sudo bash
```

**Enterprise features:**
- ✅ Native RHEL 9 optimization with DNF package management
- ✅ SELinux policies configured for secure container operations
- ✅ systemd service integration with proper hardening
- ✅ firewalld configuration with custom service definitions
- ✅ Automated backup scripts and log rotation
- ✅ Production-ready with monitoring and health checks

### Option 2: Docker Universal
**⏱️ 5 minutes | 🔧 Automatic setup | 💻 Works everywhere**

```bash
# For other Linux distributions and universal compatibility
curl -fsSL https://install.idrac-orchestrator.com/docker.sh | bash
```

**What it does:**
- ✅ Downloads and configures everything automatically
- ✅ Sets up PostgreSQL database
- ✅ Configures SSL certificates  
- ✅ Creates admin user
- ✅ Starts all services

### Option 3: Demo Mode
**⏱️ 1 minute | 🎮 Try it now | 🌐 No installation needed**

```bash
npx idrac-orchestrator-demo
```

**Perfect for:**
- Quick testing and evaluation
- Learning the interface
- Proof of concept demos

### Option 4: Windows Installer
**⏱️ 10 minutes | 🖱️ GUI installer | 🪟 Windows Server**

1. Download: [iDRAC-Orchestrator-Setup.msi](https://releases.idrac-orchestrator.com/latest/windows)
2. Right-click → "Run as Administrator"
3. Follow the installation wizard
4. Open http://localhost:3000

### Option 5: Other Linux Distributions
**⏱️ 8 minutes | 🐧 Direct install | ⚡ Best performance**

```bash
# Ubuntu / Debian / CentOS Stream / Other distributions
curl -fsSL https://install.idrac-orchestrator.com/linux.sh | sudo bash
```

## 🎯 Quick Setup Wizard

After installation, complete the 2-minute setup wizard:

### Step 1: Database Connection (Auto-detected)
- ✅ PostgreSQL connection verified
- ✅ Database schema created
- ✅ Security configured

### Step 2: Organization Settings
- Company name and contact info
- Timezone and datacenter locations
- Default maintenance windows

### Step 3: VMware Integration
- Add your vCenter servers
- Test API connectivity
- Configure cluster policies

### Step 4: Dell Server Credentials  
- Set default iDRAC login credentials
- Configure credential profiles by IP range
- Test server connectivity

### Step 5: Ready to Use!
- Discover servers automatically
- Upload firmware packages
- Schedule maintenance updates

## 🔍 What's Included

Every installation includes:

| Component | Description |
|-----------|-------------|
| **Web Interface** | Modern React-based dashboard |
| **PostgreSQL Database** | Optimized schema with RLS security |
| **VMware Integration** | Native vCenter REST API support |
| **Dell iDRAC Support** | Redfish API for all PowerEdge servers |
| **Security Suite** | SSL, encryption, RBAC, audit logs |
| **Monitoring** | Real-time health checks and alerting |
| **Backup System** | Automated configuration backups |

## 🏃‍♂️ Next Steps (5 minutes)

1. **Access Web Interface**
   ```
   http://localhost:3000
   Default login: admin@localhost / (generated password)
   ```

2. **Add Your Infrastructure**
   - Go to Settings → vCenter Connections
   - Add your vCenter servers
   - Configure datacenter scopes

3. **Discover Servers**
   - Navigate to Discovery
   - Run network scan or sync from vCenter
   - Verify connectivity and credentials

4. **Upload Firmware**
   - Go to Firmware → Packages
   - Upload Dell .EXE packages or download from Dell
   - Review compatibility matrix

5. **Schedule Updates**
   - Navigate to Scheduler
   - Create maintenance windows
   - Schedule rolling updates

## 🆘 Need Help?

### Auto-Detection Failed?
The installer automatically detects your environment. If something isn't detected:

- **Docker**: Install Docker Desktop or Docker Engine
- **PostgreSQL**: The installer can set this up for you  
- **Network**: Check firewall settings (ports 3000, 5432)

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 busy | Stop existing services or use custom port |
| Permission denied | Run installer as administrator/root |
| Database connection failed | Check PostgreSQL service is running |
| vCenter SSL errors | Enable "Ignore SSL" in connection settings |

### Get Support
- 📖 [Full Documentation](DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/your-org/idrac-orchestrator/issues)
- 💬 [Community Forum](https://community.idrac-orchestrator.com)
- 📧 [Enterprise Support](mailto:support@idrac-orchestrator.com)

## 🔒 Production Deployment

For production environments:

1. **Security Hardening**
   ```bash
   # Use the production installer with security hardening
   curl -fsSL https://install.idrac-orchestrator.com/production.sh | sudo bash
   ```

2. **High Availability Setup**
   ```bash
   # Deploy with load balancer and database cluster
   curl -fsSL https://install.idrac-orchestrator.com/ha.sh | sudo bash
   ```

3. **Cloud Deployment**
   - [AWS CloudFormation Template](https://templates.idrac-orchestrator.com/aws)
   - [Azure ARM Template](https://templates.idrac-orchestrator.com/azure)  
   - [Google Cloud Deployment Manager](https://templates.idrac-orchestrator.com/gcp)

## 🎉 Success!

You now have a fully functional iDRAC Updater Orchestrator that can:

- ✅ Manage firmware updates across your entire Dell server fleet
- ✅ Integrate with VMware vCenter for cluster-aware operations  
- ✅ Respect maintenance windows and business policies
- ✅ Provide audit trails and compliance reporting
- ✅ Scale from small labs to enterprise datacenters

**Ready to orchestrate your first firmware update? Let's go! 🚀**