# Quick Reference Guide

## 🚀 Common Operations

### Firmware Update Workflow
```bash
# 1. Discover servers
POST /api/hosts/{id}/discover

# 2. Create update plan
POST /api/plans
{
  "name": "Monthly BIOS Update",
  "targets": ["server1", "server2"],
  "artifacts": [{"component": "BIOS", "imageUri": "firmware-url"}]
}

# 3. Start execution
POST /api/plans/{id}/start
```

### vCenter Integration
```javascript
// Add vCenter connection
const vcenter = await createVCenter({
  name: "Production vCenter",
  hostname: "vcenter.example.com",
  username: "administrator@vsphere.local",
  password: "password",
  port: 443,
  ignore_ssl: false
});

// Sync hosts from vCenter
await syncVCenterHosts(vcenter.id);
```

### OME Integration
```javascript
// Create OME connection
const ome = await createOmeConnection({
  name: "Dell OME",
  baseUrl: "https://ome.example.com",
  vaultPath: "/credentials/ome"
});

// Run discovery
const result = await omeDiscoverRun(ome.id, "Model eq PowerEdge R750");
```

## 📋 Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hosts` | List all managed servers |
| `POST` | `/api/hosts/{id}/discover` | Discover server details |
| `GET` | `/api/plans` | List firmware update plans |
| `POST` | `/api/plans` | Create new update plan |
| `POST` | `/api/plans/{id}/start` | Execute update plan |
| `GET` | `/api/vcenters` | List vCenter connections |
| `POST` | `/api/vcenters` | Add vCenter connection |

## 🔧 Configuration Files

### Environment Variables (.env)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_KEY=your-api-key

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### System Config (JSON)
```json
{
  "setup_completed": true,
  "ldap_enabled": false,
  "maintenance_windows": {
    "default": "02:00-04:00",
    "timezone": "UTC"
  },
  "notifications": {
    "email_enabled": true,
    "smtp_server": "smtp.example.com"
  }
}
```

## 🛠️ Development Commands

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

### Backend API
```bash
pnpm api:dev         # Start API development server
pnpm api:build       # Build API for production
pnpm api:start       # Start production API server
```

### Supabase Local
```bash
./start-supabase-local.sh    # Start local Supabase stack
supabase db reset           # Reset local database
supabase functions serve    # Serve edge functions locally
```

## 🎯 Component Quick Reference

### Core Components
```typescript
// Dashboard
<DashboardOverview />
<ModernEnterpriseDashboard />

// Server Management
<UnifiedServerManagement />
<GlobalInventoryDashboard />

// Scheduling
<CommandControlCenter />
<MaintenanceSchedulingDialog />

// Settings
<SettingsPage />
<UserManagement />
```

### Custom Hooks
```typescript
// Server management
const { servers, loading } = useServers();
const { inventory } = useHostInventory();

// System state
const { config } = useSystemConfig();
const { user } = useAuth();

// vCenter integration
const { clusters } = useVCenterService();
const { health } = useVCenterClusterHealth();
```

## 🔐 Security Quick Reference

### RBAC Roles
- **Super Admin**: Full system access
- **Admin**: System configuration and user management
- **Operator**: Server management and updates
- **Viewer**: Read-only access to dashboards

### Authentication Methods
- **Local**: Built-in user accounts
- **LDAP/AD**: Active Directory integration
- **Red Hat IDM**: Identity Management integration

### API Authentication
```bash
# Bearer token authentication
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3001/api/hosts
```

## 🚨 Troubleshooting

### Common Issues
```bash
# Check API server status
curl http://localhost:3001/api/health

# Check Supabase connection
supabase status

# View application logs
docker logs idrac-orchestrator
pm2 logs idrac-orchestrator
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=idrac:*
npm run dev

# Check database connectivity
npm run db:test
```

## 📊 Monitoring

### Health Endpoints
- `/api/health` - API server health
- `/api/system/status` - System status overview
- `/health` - Application health check

### Key Metrics
- Server discovery success rate
- Firmware update completion rate
- Average update duration
- Cluster availability during updates

---

## 🔗 Links

- [Full Documentation](./README.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Security Guide](./SECURITY.md)
- [Troubleshooting](./TROUBLESHOOTING.md)