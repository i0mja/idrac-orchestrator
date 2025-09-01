# iDRAC Updater Orchestrator

A comprehensive enterprise-grade solution for orchestrating firmware updates across Dell server infrastructure with VMware vCenter integration. This system ensures zero-downtime rolling updates while maintaining cluster availability and respecting maintenance windows.

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

- Node.js 18+ and npm/yarn
- Supabase account and project
- VMware vCenter access with API credentials
- Dell servers with iDRAC access
- Network connectivity between orchestrator and target infrastructure

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd idrac-updater-orchestrator
npm install
```

### 2. Configure Environment

The application uses Supabase for backend services. Update your Supabase configuration:

```bash
# Update src/integrations/supabase/client.ts with your project details
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Setup

Run the included migrations to set up the database schema:

```sql
-- Core tables for servers, credentials, firmware packages
-- VMware integration tables (vcenters, vcenter_clusters)  
-- Orchestration tables (update_orchestration_plans, update_jobs)
-- Monitoring tables (system_events, eol_alerts)
```

### 4. Configure Credentials

Set up credential profiles for your infrastructure:

1. Navigate to Settings → Credential Management
2. Create credential profiles for iDRAC access
3. Assign profiles to IP ranges or specific servers
4. Configure vCenter connections

### 5. Discovery and Initial Sync

1. Configure your vCenter connections in Settings
2. Run initial discovery to populate server inventory
3. Verify connectivity and credential assignments
4. Configure datacenters and maintenance windows

## 🎯 Usage Guide

### Dashboard Overview

The main dashboard provides:
- **Fleet Health Status** - Real-time server health indicators
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

## 🔍 API Reference

### Edge Functions

| Function | Purpose | Authentication |
|----------|---------|----------------|
| `orchestrator-start-rolling-update` | Initiate cluster-aware rolling updates | Required |
| `health-check` | Comprehensive server health validation | Required |
| `firmware-management` | Firmware upload/download/compatibility | Required |
| `orchestration-control` | Control running orchestrations | Required |
| `process-update-job` | Execute individual firmware updates | Internal |
| `sync-vcenter-hosts` | Synchronize vCenter inventory | Required |

### Database Schema

Key tables and relationships:
- `servers` - Server inventory and metadata
- `credential_profiles` - Authentication credentials  
- `firmware_packages` - Firmware library
- `update_orchestration_plans` - Orchestration definitions
- `update_jobs` - Individual update tasks
- `system_events` - Audit and monitoring events

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

## 🆘 Support

For technical support and questions:
- Review the troubleshooting guide above
- Check existing GitHub issues
- Create a new issue with detailed information
- Contact your system administrator for infrastructure access

---

**⚠️ Important**: This system manages critical infrastructure components. Always test updates in non-production environments and follow your organization's change management procedures.