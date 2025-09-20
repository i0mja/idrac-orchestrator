# Troubleshooting Guide

## Common Issues & Solutions

### Installation Problems

#### Docker Installation Issues

**Problem**: Docker containers fail to start
```bash
Error: Cannot connect to the Docker daemon
```

**Solutions**:
1. **Check Docker Service**:
   ```bash
   # Linux
   sudo systemctl status docker
   sudo systemctl start docker
   
   # Windows
   # Restart Docker Desktop
   ```

2. **Verify Docker Permissions**:
   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   # Logout and login again
   ```

3. **Check Port Conflicts**:
   ```bash
   # Find processes using port 3000
   lsof -i :3000
   # Kill conflicting processes or change port
   ```

#### Database Connection Failures

**Problem**: Cannot connect to PostgreSQL
```
Error: Connection refused to database
```

**Solutions**:
1. **Check Database Status**:
   ```bash
   # Local development
   docker-compose ps
   
   # Production
   systemctl status postgresql
   ```

2. **Verify Connection String**:
   ```bash
   # Test connection
   psql "postgresql://user:pass@localhost:5432/dbname"
   ```

3. **Check Firewall Rules**:
   ```bash
   # Allow PostgreSQL port
   sudo ufw allow 5432
   ```

### Supabase Integration Issues

#### Authentication Problems

**Problem**: JWT token invalid or expired
```
Error: Invalid JWT token
```

**Solutions**:
1. **Refresh Token**:
   ```typescript
   const { error } = await supabase.auth.refreshSession();
   if (error) {
     // Redirect to login
     window.location.href = '/auth';
   }
   ```

2. **Check Environment Variables**:
   ```bash
   # Verify Supabase configuration
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

3. **Validate RLS Policies**:
   ```sql
   -- Check if RLS is enabled
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

#### Real-time Subscription Failures

**Problem**: Real-time updates not working
```
Error: WebSocket connection failed
```

**Solutions**:
1. **Check WebSocket Connection**:
   ```typescript
   const channel = supabase.channel('test')
     .on('broadcast', { event: 'test' }, () => {
       console.log('Real-time working');
     })
     .subscribe((status) => {
       console.log('Subscription status:', status);
     });
   ```

2. **Enable Real-time for Tables**:
   ```sql
   -- Enable real-time for specific table
   ALTER TABLE hosts REPLICA IDENTITY FULL;
   
   -- Add to real-time publication
   BEGIN;
   DROP PUBLICATION IF EXISTS supabase_realtime;
   CREATE PUBLICATION supabase_realtime;
   ALTER PUBLICATION supabase_realtime ADD TABLE hosts;
   COMMIT;
   ```

### Server Discovery Issues

#### Network Discovery Failures

**Problem**: Servers not discovered on network scan
```
Error: No servers found in network range
```

**Solutions**:
1. **Verify Network Connectivity**:
   ```bash
   # Test ping to management network
   ping 192.168.1.100
   
   # Test port connectivity
   telnet 192.168.1.100 443
   ```

2. **Check Credential Profiles**:
   ```typescript
   // Verify credentials are assigned correctly
   const { data: credentials } = await supabase
     .from('credentials')
     .select('*')
     .eq('host_id', hostId);
   ```

3. **Review Discovery Logs**:
   ```bash
   # Check Supabase function logs
   # Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions/discover-servers/logs
   ```

#### iDRAC Connection Problems

**Problem**: Cannot connect to iDRAC interface
```
Error: SSL certificate verification failed
```

**Solutions**:
1. **Accept Self-Signed Certificates**:
   ```typescript
   // Configure Redfish client for self-signed certs
   const redfishOptions = {
     rejectUnauthorized: false,
     timeout: 30000
   };
   ```

2. **Verify iDRAC Settings**:
   ```bash
   # Test direct iDRAC access
   curl -k -u username:password https://idrac-ip/redfish/v1/
   ```

3. **Check Network Routing**:
   ```bash
   # Trace route to iDRAC
   traceroute 192.168.1.100
   ```

### VMware vCenter Integration

#### vCenter API Connection Issues

**Problem**: vCenter authentication failure
```
Error: Invalid login credentials
```

**Solutions**:
1. **Verify vCenter Credentials**:
   ```bash
   # Test with PowerCLI
   Connect-VIServer -Server vcenter.example.com -User username -Password password
   ```

2. **Check Certificate Trust**:
   ```typescript
   // Configure vCenter client
   const vcenterClient = new VCenterClient({
     host: 'vcenter.example.com',
     username: 'service-account',
     password: 'password',
     rejectUnauthorized: false
   });
   ```

3. **Validate Permissions**:
   - Ensure service account has required vCenter permissions
   - Check role assignments in vSphere Client

#### Host Synchronization Problems

**Problem**: vCenter hosts not syncing correctly
```
Error: Host not found in vCenter inventory
```

**Solutions**:
1. **Verify Host Registration**:
   ```bash
   # Check host status in vCenter
   Get-VMHost | Where-Object {$_.Name -eq "host.example.com"}
   ```

2. **Update Cluster Associations**:
   ```sql
   -- Fix cluster associations
   UPDATE hosts 
   SET cluster_moid = 'domain-c123' 
   WHERE vcenter_url = 'vcenter.example.com';
   ```

### Firmware Update Failures

#### Update Process Errors

**Problem**: Firmware update fails during installation
```
Error: Update failed with code 2
```

**Solutions**:
1. **Check Server Prerequisites**:
   - Verify server is in maintenance mode
   - Ensure sufficient disk space
   - Confirm compatible firmware version

2. **Review Update Logs**:
   ```typescript
   // Check host run details
   const { data: hostRun } = await supabase
     .from('host_runs')
     .select('*')
     .eq('id', hostRunId)
     .single();
   
   console.log('Error details:', hostRun.ctx.error);
   ```

3. **Verify Firmware Package**:
   ```bash
   # Check firmware integrity
   sha256sum firmware-package.exe
   ```

#### Redfish API Errors

**Problem**: Redfish operations timeout
```
Error: Task timeout after 30 minutes
```

**Solutions**:
1. **Increase Timeout Values**:
   ```typescript
   const updateConfig = {
     timeout: 3600000, // 1 hour
     retryAttempts: 3,
     retryDelay: 60000
   };
   ```

2. **Monitor Task Progress**:
   ```bash
   # Check Redfish task status
   curl -k -u user:pass https://idrac-ip/redfish/v1/TaskService/Tasks/JID_123456789
   ```

### Performance Issues

#### Slow Query Performance

**Problem**: Database queries taking too long
```
Error: Query timeout after 30 seconds
```

**Solutions**:
1. **Add Missing Indexes**:
   ```sql
   -- Create composite indexes for common queries
   CREATE INDEX idx_hosts_mgmt_ip_cluster ON hosts (mgmt_ip, cluster_moid);
   CREATE INDEX idx_host_runs_plan_status ON host_runs (plan_id, status);
   ```

2. **Optimize Queries**:
   ```typescript
   // Use select with specific columns
   const { data } = await supabase
     .from('hosts')
     .select('id, fqdn, mgmt_ip, status') // Only needed columns
     .limit(50);
   ```

3. **Implement Pagination**:
   ```typescript
   // Use range for pagination
   const { data } = await supabase
     .from('hosts')
     .select('*')
     .range(0, 49); // First 50 records
   ```

#### Memory Usage Issues

**Problem**: High memory consumption
```
Error: JavaScript heap out of memory
```

**Solutions**:
1. **Increase Node.js Memory**:
   ```bash
   # Start with more memory
   node --max-old-space-size=4096 index.js
   ```

2. **Optimize React Components**:
   ```typescript
   // Use memo for expensive components
   const ExpensiveComponent = React.memo(({ data }) => {
     return <div>{/* component logic */}</div>;
   });
   
   // Implement virtual scrolling for large lists
   import { FixedSizeList as List } from 'react-window';
   ```

### Security & Authentication Issues

#### Permission Denied Errors

**Problem**: User cannot access certain features
```
Error: Insufficient permissions
```

**Solutions**:
1. **Check User Roles**:
   ```sql
   -- Verify user role assignment
   SELECT u.email, u.raw_user_meta_data->>'role' as role
   FROM auth.users u
   WHERE u.email = 'user@example.com';
   ```

2. **Review RLS Policies**:
   ```sql
   -- Check which policies apply
   SELECT schemaname, tablename, policyname, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

3. **Update User Permissions**:
   ```typescript
   // Update user metadata
   const { error } = await supabase.auth.admin.updateUserById(
     userId,
     { user_metadata: { role: 'infrastructure_admin' } }
   );
   ```

## Debugging Tools & Techniques

### Enable Debug Logging

#### Frontend Debugging
```typescript
// Enable debug mode
localStorage.setItem('debug', 'true');

// Custom debug logger
const debug = (message: string, data?: any) => {
  if (localStorage.getItem('debug') === 'true') {
    console.log(`[DEBUG] ${message}`, data);
  }
};
```

#### Backend API Debugging
```typescript
// Add request logging middleware
app.register(require('@fastify/sensible'));
app.addHook('onRequest', async (request, reply) => {
  request.log.info({ 
    method: request.method, 
    url: request.url,
    headers: request.headers 
  }, 'Incoming request');
});
```

### Database Query Analysis

#### Slow Query Identification
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Index Usage Analysis
```sql
-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

### Network Diagnostics

#### API Connectivity Testing
```bash
# Test API endpoints
curl -I http://localhost:8081/api/health
curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/hosts

# Test WebSocket connections
wscat -c ws://localhost:8081/ws
```

#### Network Latency Testing
```bash
# Ping test with statistics
ping -c 10 -i 0.2 192.168.1.100

# Test port connectivity with timeout
timeout 5 bash -c '</dev/tcp/192.168.1.100/443' && echo "Port open" || echo "Port closed"
```

## Log Analysis

### Log Locations
| Component | Log Location | Format |
|-----------|--------------|--------|
| React App | Browser Console | JSON/Text |
| Fastify API | `logs/api.log` | JSON |
| Supabase Functions | Dashboard | JSON |
| PostgreSQL | `/var/log/postgresql/` | Text |
| Nginx | `/var/log/nginx/` | Combined |

### Common Log Patterns

#### Error Pattern Matching
```bash
# Find authentication errors
grep "authentication failed" /var/log/app.log

# Find database connection errors
grep -E "(connection.*refused|timeout)" /var/log/api.log

# Find rate limiting
grep "rate.*limit" /var/log/nginx/access.log
```

#### Performance Monitoring
```bash
# Monitor response times
tail -f /var/log/nginx/access.log | grep -E "[0-9]+\.[0-9]{3}"

# Track memory usage
watch -n 1 'ps aux | grep node | head -5'
```

## Recovery Procedures

### Database Recovery

#### Point-in-Time Recovery
```bash
# Restore from backup
pg_restore -d idrac_orchestrator backup_file.sql

# Apply transaction logs if available
pg_waldump 000000010000000000000001
```

#### Failed Migration Recovery
```sql
-- Rollback failed migration
BEGIN;
-- Manual rollback steps here
ROLLBACK;

-- Reset migration state
UPDATE schema_migrations 
SET dirty = false 
WHERE version = 'failed_version';
```

### Service Recovery

#### Application Recovery
```bash
# Restart services
systemctl restart nginx
systemctl restart postgresql
docker-compose restart

# Check service status
systemctl status --all
```

#### Data Consistency Check
```sql
-- Verify data integrity
SELECT COUNT(*) FROM hosts WHERE mgmt_ip IS NULL;
SELECT COUNT(*) FROM credentials WHERE vault_path IS NULL;
SELECT COUNT(*) FROM host_runs WHERE state NOT IN ('pending', 'running', 'completed', 'failed', 'cancelled');
```

## Getting Additional Help

### Support Channels
- **GitHub Issues**: [Repository Issues](https://github.com/i0mja/idrac-orchestrator/issues)
- **Documentation**: [Complete Documentation](README.md)
- **Community Forum**: Enterprise support available

### Diagnostic Information Collection
```bash
# Collect system information
./scripts/collect-diagnostics.sh

# Generate support bundle
docker-compose logs > support-bundle.log
kubectl logs -l app=idrac-orchestrator >> support-bundle.log
```

### Emergency Contacts
- **Critical Issues**: Priority support queue
- **Security Issues**: security@example.com
- **Infrastructure Issues**: ops@example.com