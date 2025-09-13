# iDRAC Updater Orchestrator API Documentation

Complete reference for the iDRAC Updater Orchestrator API endpoints.

## Base Configuration

**Base URL:** `https://hrqzmjjpnylcmunyaovj.supabase.co`

**Authentication:** Most endpoints require Bearer token authentication using your API key from Settings > Security & Authentication.

```bash
Authorization: Bearer YOUR_API_KEY
```

**Rate Limiting:** API calls are limited to 100 requests per minute per API key. Rate limit headers are included in responses.

## API Endpoints

### 🔒 Auto Orchestration
**Endpoint:** `POST /functions/v1/auto-orchestration`  
**Authentication:** Required

Automatically generates and schedules update orchestration plans based on server configurations and maintenance windows.

**Example Response:**
```json
{
  "success": true,
  "plans_created": 3,
  "servers_processed": 45
}
```

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/auto-orchestration"
```

---

### 🔒 Discover Servers
**Endpoint:** `POST /functions/v1/discover-servers`  
**Authentication:** Required

Performs network discovery to identify Dell servers and their configurations via Redfish API.

**Parameters:**
- `ip_ranges` (string[], required): Array of IP ranges to scan (CIDR notation)
- `credential_profile_id` (string, optional): UUID of credential profile to use for authentication

**Example Request:**
```json
{
  "ip_ranges": ["10.0.1.0/24", "10.0.2.0/24"],
  "credential_profile_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Example Response:**
```json
{
  "success": true,
  "servers_discovered": 12,
  "servers_added": 8,
  "servers_updated": 4
}
```

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_ranges": ["10.0.1.0/24", "10.0.2.0/24"],
    "credential_profile_id": "123e4567-e89b-12d3-a456-426614174000"
  }' \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/discover-servers"
```

---

### 🔒 Firmware Management
**Endpoint:** `POST /functions/v1/firmware-management`  
**Authentication:** Required

Handles firmware package uploads, validation, and deployment scheduling for Dell servers.

**Parameters:**
- `action` (string, required): Action to perform: 'upload', 'validate', 'schedule', or 'deploy'
- `server_ids` (string[], optional): Array of server UUIDs to target

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "validate", "server_ids": ["uuid1", "uuid2"]}' \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/firmware-management"
```

---

### 🔒 Execute Remote Command
**Endpoint:** `POST /functions/v1/execute-remote-command`  
**Authentication:** Required

Executes remote commands on servers via SSH, WinRM, or iDRAC out-of-band management.

**Parameters:**
- `server_id` (string, required): UUID of the target server
- `command` (string, required): Command to execute
- `method` (string, optional): Execution method: 'ssh', 'winrm', or 'idrac'

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "123e4567-e89b-12d3-a456-426614174000",
    "command": "systemctl status",
    "method": "ssh"
  }' \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/execute-remote-command"
```

---

### 🔒 Maintenance Orchestrator
**Endpoint:** `POST /functions/v1/maintenance-orchestrator`  
**Authentication:** Required

Orchestrates maintenance operations across server clusters with VMware integration and safety checks.

**Parameters:**
- `plan_id` (string, required): UUID of the orchestration plan to execute
- `dry_run` (boolean, optional): Perform validation without executing changes

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "123e4567-e89b-12d3-a456-426614174000",
    "dry_run": true
  }' \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/maintenance-orchestrator"
```

---

### 🔒 VCenter Host Sync
**Endpoint:** `POST /functions/v1/sync-vcenter-hosts`  
**Authentication:** Required

Synchronizes server inventory with VMware vCenter, updating cluster and VM information.

**Parameters:**
- `vcenter_id` (string, optional): UUID of specific vCenter to sync (omit to sync all)

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"vcenter_id": "123e4567-e89b-12d3-a456-426614174000"}' \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/sync-vcenter-hosts"
```

---

### 🔒 Dell Firmware Search
**Endpoint:** `GET /functions/v1/search-dell-firmware`  
**Authentication:** Required

Searches Dell's firmware catalog for updates compatible with your server models.

**Parameters:**
- `model` (string, optional): Server model to search for
- `service_tag` (string, optional): Service tag for specific server

**cURL Example:**
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/search-dell-firmware?model=PowerEdge R740&service_tag=ABC123"
```

---

### 🔓 Health Check
**Endpoint:** `GET /functions/v1/health-check`  
**Authentication:** Not Required

Performs system health checks and returns status of all components and dependencies.

**Example Response:**
```json
{
  "status": "healthy",
  "components": {
    "database": "healthy",
    "external_apis": "healthy",
    "storage": "healthy"
  },
  "timestamp": "2025-01-09T12:00:00Z"
}
```

**cURL Example:**
```bash
curl -X GET \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/health-check"
```

---

## Quick Start Guide

### 1. Get your API Key
Find your API key in the application under Settings > Security & Authentication.

### 2. Test connectivity
Start with the health check endpoint (no authentication required):
```bash
curl https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/health-check
```

### 3. Discover servers
Use the discover-servers endpoint to scan your network:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_ranges": ["10.0.1.0/24"],
    "credential_profile_id": "YOUR_CREDENTIAL_PROFILE_ID"
  }' \
  "https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/discover-servers"
```

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

Error responses include a JSON object with an `error` field:
```json
{
  "error": "Invalid API key"
}
```

## Support

For additional help or feature requests, please refer to the application documentation or contact your system administrator.