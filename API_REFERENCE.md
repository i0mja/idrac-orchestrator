# API Reference

## Overview

The iDRAC Updater Orchestrator provides comprehensive APIs across multiple layers:

- **Supabase Edge Functions**: Cloud-native serverless functions for core orchestration
- **Local Fastify API**: On-premise REST API for direct server integration
- **Supabase Database API**: Auto-generated REST API with real-time subscriptions
- **WebSocket API**: Real-time status updates and notifications

## Authentication

### Supabase Authentication
All Supabase APIs use JWT-based authentication:

```bash
# Login and get JWT token
curl -X POST 'https://hrqzmjjpnylcmunyaovj.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Use token in subsequent requests
curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY' \
  'https://hrqzmjjpnylcmunyaovj.supabase.co/rest/v1/hosts'
```

### Local API Authentication
Local API uses API key authentication:

## Quick Examples

### Complete Firmware Update Workflow

```bash
# 1. List available servers
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/hosts

# 2. Discover server details
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/hosts/server-001/discover

# 3. Upload custom firmware (optional)
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -F "firmware=@dell-bios-update.exe" \
  http://localhost:3001/api/uploads/firmware

# 4. Create comprehensive update plan
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 BIOS Security Update",
    "description": "Critical security patches for Dell PowerEdge servers",
    "targets": ["server-001", "server-002", "server-003"],
    "artifacts": [
      {
        "component": "BIOS",
        "imageUri": "https://downloads.dell.com/bios/R750_1.15.0.exe",
        "version": "1.15.0",
        "criticality": "critical"
      },
      {
        "component": "iDRAC",
        "imageUri": "https://downloads.dell.com/idrac/iDRAC_6.10.30.00.exe",
        "version": "6.10.30.00",
        "criticality": "recommended"
      }
    ],
    "policy": {
      "maintenance_window": "02:00-04:00",
      "max_parallel": 2,
      "rollback_on_failure": true,
      "cluster_constraints": {
        "respect_drs": true,
        "maintain_ha": true,
        "max_cluster_impact": "50%"
      },
      "health_checks": {
        "pre_update": true,
        "post_update": true,
        "timeout_minutes": 30
      }
    },
    "schedule": {
      "start_time": "2024-01-15T02:00:00Z",
      "timezone": "UTC"
    }
  }' \
  http://localhost:3001/api/plans

# 5. Monitor plan execution
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/plans/plan-123/status

# 6. Get detailed server status
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/hosts/server-001/status
```

### VMware vCenter Integration

```bash
# Add vCenter connection
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production vCenter",
    "hostname": "vcenter.example.com",
    "username": "administrator@vsphere.local",
    "password": "secure-password",
    "port": 443,
    "ignore_ssl": false,
    "datacenter": "Production-DC",
    "clusters": ["Cluster-01", "Cluster-02"]
  }' \
  http://localhost:3001/api/vcenters

# Sync hosts from vCenter
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/vcenters/vc-001/sync

# Get cluster health status
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/vcenters/vc-001/clusters/cluster-001/health
```

### Dell OpenManage Enterprise (OME) Integration

```bash
# Create OME connection
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dell OME Production",
    "baseUrl": "https://ome.example.com",
    "username": "admin",
    "password": "admin-password",
    "vaultPath": "/credentials/ome-prod"
  }' \
  http://localhost:3001/api/ome/connections

# Run server discovery with filtering
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": "Model eq '\''PowerEdge R750'\'' and SystemGeneration eq 15",
    "includeDetails": true,
    "syncInventory": true
  }' \
  http://localhost:3001/api/ome/ome-001/discover/run

# Schedule automated discovery
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 2 * * *",
    "filter": "Status eq '\''Normal'\''",
    "autoSync": true
  }' \
  http://localhost:3001/api/ome/ome-001/schedule
```

### Advanced Query Examples

```bash
# Get servers by firmware version
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3001/api/hosts?filter=firmware_version<1.15.0"

# Get cluster impact analysis
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3001/api/analysis/cluster-impact?targets=server-001,server-002"

# Get maintenance window recommendations
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3001/api/analysis/maintenance-windows?cluster=cluster-001"

# Bulk server operations
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "health_check",
    "targets": ["server-001", "server-002", "server-003"],
    "parallel": true,
    "timeout": 300
  }' \
  http://localhost:3001/api/hosts/bulk-action
```

## Authentication

### API Key Authentication

## Supabase Edge Functions

Base URL: `https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/`

### Server Discovery

#### `POST /discover-servers`
Initiates network discovery for Dell servers.

**Request:**
```json
{
  "networkRanges": ["192.168.1.0/24", "10.0.0.0/16"],
  "credentialProfileId": "uuid-here",
  "discoveryOptions": {
    "scanPorts": [443, 623],
    "timeout": 30,
    "concurrent": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "discoveryId": "uuid-here",
  "message": "Discovery initiated",
  "estimatedDuration": 300
}
```

#### `GET /discover-servers/{discoveryId}/status`
Get discovery job status and results.

**Response:**
```json
{
  "discoveryId": "uuid-here",
  "status": "running|completed|failed",
  "progress": {
    "percentage": 75,
    "currentRange": "192.168.1.0/24",
    "serversFound": 12,
    "totalAddresses": 256
  },
  "results": [
    {
      "ip": "192.168.1.100",
      "fqdn": "server01.example.com",
      "model": "PowerEdge R740",
      "serviceTag": "ABCD123",
      "managementType": "redfish"
    }
  ]
}
```

### Firmware Management

#### `POST /redfish-update`
Execute firmware update on target servers.

**Request:**
```json
{
  "planId": "uuid-here",
  "hostIds": ["uuid1", "uuid2"],
  "updateMode": "LATEST_FROM_CATALOG|SPECIFIC_PACKAGE|MULTIPART_FILE",
  "policy": {
    "maxConcurrent": 2,
    "requireMaintenanceMode": true,
    "rollbackOnFailure": true
  },
  "artifacts": [
    {
      "component": "BIOS",
      "imageUri": "https://example.com/firmware.exe",
      "version": "2.8.1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "planId": "uuid-here",
  "executionId": "uuid-here",
  "message": "Update plan queued for execution",
  "estimatedDuration": 1800
}
```

#### `GET /redfish-update/{executionId}/status`
Monitor firmware update progress.

**Response:**
```json
{
  "executionId": "uuid-here",
  "planId": "uuid-here",
  "status": "running",
  "overall": {
    "percentage": 45,
    "phase": "installing",
    "startTime": "2024-01-15T10:30:00Z",
    "estimatedCompletion": "2024-01-15T11:00:00Z"
  },
  "hosts": [
    {
      "hostId": "uuid1",
      "hostname": "server01.example.com",
      "status": "completed",
      "progress": 100,
      "phase": "verified",
      "startTime": "2024-01-15T10:30:00Z",
      "endTime": "2024-01-15T10:45:00Z",
      "results": {
        "previousVersion": "2.7.3",
        "currentVersion": "2.8.1",
        "rebootRequired": true
      }
    },
    {
      "hostId": "uuid2",
      "hostname": "server02.example.com",
      "status": "running",
      "progress": 75,
      "phase": "installing",
      "startTime": "2024-01-15T10:32:00Z",
      "currentOperation": "Installing BIOS firmware"
    }
  ]
}
```

### vCenter Integration

#### `POST /vcenter-integration`
Synchronize servers from vCenter inventory.

**Request:**
```json
{
  "vcenterId": "uuid-here",
  "clusters": ["cluster1", "cluster2"],
  "syncOptions": {
    "includeHardwareInfo": true,
    "validateCredentials": true,
    "updateExisting": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "syncId": "uuid-here",
  "vcenterId": "uuid-here",
  "clustersQueued": 2,
  "estimatedDuration": 600
}
```

#### `POST /vsphere-cluster-health`
Check vSphere cluster health before updates.

**Request:**
```json
{
  "clusterId": "domain-c123",
  "vcenterId": "uuid-here",
  "checkTypes": ["ha_status", "drs_status", "vm_distribution", "resource_usage"]
}
```

**Response:**
```json
{
  "clusterId": "domain-c123",
  "clusterName": "Production-Cluster-01",
  "overallHealth": "healthy|warning|critical",
  "checks": {
    "ha_status": {
      "status": "healthy",
      "enabled": true,
      "failoverLevel": 1,
      "hostsCanFail": 1
    },
    "drs_status": {
      "status": "healthy",
      "enabled": true,
      "automationLevel": "fullyAutomated"
    },
    "vm_distribution": {
      "status": "warning",
      "totalVms": 45,
      "imbalance": "moderate",
      "recommendations": ["Migrate VM vm-123 to host esxi-02"]
    },
    "resource_usage": {
      "status": "healthy",
      "cpu": {"usage": 45, "available": 55},
      "memory": {"usage": 62, "available": 38}
    }
  },
  "updateRecommendations": {
    "maxConcurrentHosts": 1,
    "preferredOrder": ["esxi-03", "esxi-01", "esxi-02"],
    "maintenanceWindow": "required"
  }
}
```

### Maintenance Windows

#### `POST /maintenance-windows`
Create or update maintenance window definitions.

**Request:**
```json
{
  "name": "Weekly Production Maintenance",
  "datacenterId": "uuid-here",
  "schedule": {
    "timezone": "America/New_York",
    "recurrence": "weekly",
    "dayOfWeek": 6,
    "startTime": "02:00",
    "duration": 240,
    "excludeDates": ["2024-12-25", "2024-01-01"]
  },
  "policies": {
    "requireApproval": true,
    "maxConcurrentUpdates": 5,
    "emergencyOverride": true
  }
}
```

#### `GET /maintenance-windows/current`
Get currently active maintenance windows.

**Response:**
```json
{
  "activeWindows": [
    {
      "id": "uuid-here",
      "name": "Weekly Production Maintenance",
      "datacenterId": "uuid-here",
      "startTime": "2024-01-15T07:00:00Z",
      "endTime": "2024-01-15T11:00:00Z",
      "remainingMinutes": 180,
      "policies": {
        "maxConcurrentUpdates": 5,
        "currentUpdates": 2
      }
    }
  ],
  "upcomingWindows": [
    {
      "id": "uuid-here",
      "name": "Emergency Patching Window",
      "startTime": "2024-01-16T03:00:00Z",
      "endTime": "2024-01-16T05:00:00Z"
    }
  ]
}
```

### Background Jobs

#### `POST /background-job-processor`
Process pending background jobs.

**Response:**
```json
{
  "success": true,
  "processed": 15,
  "queued": 3,
  "failed": 1,
  "statistics": {
    "avgProcessingTime": 45.2,
    "successRate": 94.2
  }
}
```

#### `GET /background-job-processor/stats`
Get job processing statistics.

**Response:**
```json
{
  "currentJobs": {
    "queued": 8,
    "running": 3,
    "completed": 156,
    "failed": 4
  },
  "performance": {
    "last24Hours": {
      "processed": 234,
      "avgDuration": 38.5,
      "successRate": 96.8
    },
    "last7Days": {
      "processed": 1678,
      "avgDuration": 42.1,
      "successRate": 95.4
    }
  },
  "jobTypes": [
    {"type": "firmware_update", "count": 45, "avgDuration": 480},
    {"type": "discovery", "count": 12, "avgDuration": 120},
    {"type": "health_check", "count": 189, "avgDuration": 15}
  ]
}
```

## Local Fastify API

Base URL: `http://localhost:8081/api/`

### Server Management

#### `GET /hosts`
List all discovered servers with filtering.

**Query Parameters:**
- `datacenter`: Filter by datacenter ID
- `cluster`: Filter by vCenter cluster
- `status`: Filter by connectivity status
- `model`: Filter by server model
- `limit`: Pagination limit (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "hosts": [
    {
      "id": "uuid-here",
      "fqdn": "server01.example.com",
      "mgmt_ip": "192.168.1.100",
      "model": "PowerEdge R740",
      "service_tag": "ABCD123",
      "mgmt_kind": "redfish",
      "vcenter_url": "vcenter.example.com",
      "cluster_moid": "domain-c123",
      "connectivity": {
        "status": "online",
        "lastCheck": "2024-01-15T10:45:00Z",
        "responseTime": 45
      },
      "firmware": {
        "bios": "2.8.1",
        "idrac": "4.20.20.20",
        "lastUpdated": "2024-01-10T08:30:00Z"
      }
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### `GET /hosts/{hostId}/health`
Get detailed server health information.

**Response:**
```json
{
  "hostId": "uuid-here",
  "hostname": "server01.example.com",
  "health": {
    "overall": "healthy|warning|critical",
    "lastCheck": "2024-01-15T10:45:00Z",
    "connectivity": {
      "redfish": {"status": "online", "responseTime": 45},
      "ping": {"status": "online", "responseTime": 2},
      "ssh": {"status": "online", "responseTime": 123}
    },
    "hardware": {
      "temperature": {"status": "normal", "value": 32, "unit": "C"},
      "fans": {"status": "normal", "count": 6, "failed": 0},
      "power": {"status": "normal", "consumption": 245, "unit": "W"},
      "memory": {"status": "normal", "total": 64, "failed": 0},
      "storage": {"status": "warning", "drives": 8, "failed": 1}
    },
    "alerts": [
      {
        "severity": "warning",
        "component": "storage",
        "message": "Drive 2 in RAID controller 1 has failed",
        "timestamp": "2024-01-15T09:30:00Z"
      }
    ]
  }
}
```

### Update Plans

#### `POST /plans`
Create a new update plan.

**Request:**
```json
{
  "name": "Q1 BIOS Updates",
  "description": "Quarterly BIOS updates for production servers",
  "targets": ["uuid1", "uuid2", "uuid3"],
  "artifacts": [
    {
      "component": "BIOS",
      "imageUri": "file:///var/firmware/bios_2.8.1.exe",
      "version": "2.8.1",
      "checksum": "sha256:abc123..."
    }
  ],
  "policy": {
    "updateMode": "SPECIFIC_PACKAGE",
    "maxConcurrent": 1,
    "requireMaintenanceMode": true,
    "rollbackOnFailure": true,
    "maintenanceWindow": {
      "required": true,
      "windowId": "uuid-here"
    },
    "notifications": {
      "onStart": ["admin@example.com"],
      "onComplete": ["admin@example.com"],
      "onFailure": ["admin@example.com", "oncall@example.com"]
    }
  },
  "scheduledFor": "2024-01-20T02:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "planId": "uuid-here",
  "name": "Q1 BIOS Updates",
  "status": "draft",
  "targetCount": 3,
  "estimatedDuration": 2700,
  "createdAt": "2024-01-15T10:45:00Z"
}
```

#### `POST /plans/{planId}/start`
Start execution of an update plan.

**Response:**
```json
{
  "success": true,
  "planId": "uuid-here",
  "executionId": "uuid-here",  
  "status": "running",
  "startedAt": "2024-01-15T10:45:00Z",
  "estimatedCompletion": "2024-01-15T11:30:00Z"
}
```

#### `GET /plans/{planId}/status`
Get detailed plan execution status.

**Response:**
```json
{
  "planId": "uuid-here",
  "executionId": "uuid-here",
  "name": "Q1 BIOS Updates",
  "status": "running",
  "progress": {
    "percentage": 33,
    "completedHosts": 1,
    "totalHosts": 3,
    "currentPhase": "installing"
  },
  "timing": {
    "startedAt": "2024-01-15T10:45:00Z",
    "estimatedCompletion": "2024-01-15T11:30:00Z",
    "elapsedMinutes": 15
  },
  "hostRuns": [
    {
      "hostId": "uuid1",
      "hostname": "server01.example.com",
      "status": "completed",
      "progress": 100,
      "startedAt": "2024-01-15T10:45:00Z",
      "completedAt": "2024-01-15T10:58:00Z",
      "results": {
        "previousVersion": "2.7.3",
        "currentVersion": "2.8.1",
        "rebootTime": 180
      }
    },
    {
      "hostId": "uuid2", 
      "hostname": "server02.example.com",
      "status": "running",
      "progress": 65,
      "phase": "installing",
      "startedAt": "2024-01-15T10:59:00Z",
      "currentOperation": "Installing BIOS firmware"
    },
    {
      "hostId": "uuid3",
      "hostname": "server03.example.com", 
      "status": "queued",
      "progress": 0,
      "estimatedStart": "2024-01-15T11:15:00Z"
    }
  ]
}
```

### System Health

#### `GET /health`
Get overall system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:45:00Z",
  "components": {
    "database": {"status": "healthy", "responseTime": 12},
    "redis": {"status": "healthy", "responseTime": 3},
    "jobQueue": {"status": "healthy", "queueSize": 5},
    "externalApis": {
      "vcenter": {"status": "healthy", "responseTime": 89},
      "supabase": {"status": "healthy", "responseTime": 156}
    }
  },
  "statistics": {
    "totalHosts": 156,
    "onlineHosts": 154,
    "activeUpdates": 3,
    "queuedJobs": 8
  }
}
```

## Database REST API (Supabase)

Base URL: `https://hrqzmjjpnylcmunyaovj.supabase.co/rest/v1/`

### Auto-Generated REST Endpoints

All database tables are automatically exposed as REST endpoints with full CRUD operations:

#### Hosts Table
```bash
# Get all hosts
GET /hosts

# Get specific host
GET /hosts?id=eq.uuid-here

# Create new host
POST /hosts

# Update host
PATCH /hosts?id=eq.uuid-here

# Delete host
DELETE /hosts?id=eq.uuid-here
```

#### Advanced Queries
```bash
# Filter and sort
GET /hosts?mgmt_kind=eq.redfish&order=created_at.desc

# Join with credentials
GET /hosts?select=*,credentials(*)

# Aggregate functions
GET /hosts?select=model,count

# Full-text search
GET /hosts?fqdn=fts.server
```

### Real-time Subscriptions

WebSocket endpoint: `wss://hrqzmjjpnylcmunyaovj.supabase.co/realtime/v1/websocket`

**Subscribe to table changes:**
```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to host updates
const subscription = supabase
  .channel('hosts')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'hosts'
  }, (payload) => {
    console.log('Host changed:', payload);
  })
  .subscribe();

// Subscribe to update plan progress
const planUpdates = supabase
  .channel('host_runs')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public', 
    table: 'host_runs',
    filter: 'plan_id=eq.uuid-here'
  }, (payload) => {
    console.log('Update progress:', payload.new);
  })
  .subscribe();
```

## Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "networkRanges",
      "reason": "Invalid CIDR format"
    },
    "timestamp": "2024-01-15T10:45:00Z",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | Missing or invalid auth token | 401 |
| `AUTHORIZATION_DENIED` | Insufficient permissions | 403 |
| `VALIDATION_ERROR` | Invalid request parameters | 400 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `MAINTENANCE_WINDOW_VIOLATION` | Operation outside maintenance window | 409 |
| `CLUSTER_CAPACITY_INSUFFICIENT` | Cannot maintain cluster requirements | 409 |
| `EXTERNAL_SERVICE_ERROR` | External API failure | 502 |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | 500 |

## Rate Limiting

### Limits by API Type

| API Type | Requests/Minute | Burst Limit |
|----------|-----------------|-------------|
| Supabase Edge Functions | 60 | 10 |
| Local API | 120 | 20 |
| Database REST API | 100 | 15 |
| Real-time Subscriptions | No limit | N/A |

### Rate Limit Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642678800
```

## SDKs and Client Libraries

### JavaScript/TypeScript Client
```typescript
import { createClient } from '@supabase/supabase-js';
import { ApiClient } from './api-client';

// Supabase client
const supabase = createClient(
  'https://hrqzmjjpnylcmunyaovj.supabase.co',
  'your-anon-key'
);

// Local API client  
const api = new ApiClient({
  baseUrl: 'http://localhost:8081/api',
  apiKey: 'your-api-key'
});

// Usage examples
const hosts = await supabase.from('hosts').select('*');
const plan = await api.plans.create({...});
```

### Python Client Example
```python
import requests
from supabase import create_client

# Supabase client
supabase = create_client(
    "https://hrqzmjjpnylcmunyaovj.supabase.co",
    "your-anon-key"
)

# Local API client
class ApiClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {'X-API-Key': api_key}
    
    def get_hosts(self):
        response = requests.get(
            f"{self.base_url}/hosts",
            headers=self.headers
        )
        return response.json()

api = ApiClient("http://localhost:8081/api", "your-api-key")
hosts = api.get_hosts()
```

This comprehensive API reference provides all the information needed to integrate with and extend the iDRAC Updater Orchestrator system.