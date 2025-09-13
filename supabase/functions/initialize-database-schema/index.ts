import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DatabaseConfig {
  type: 'mssql' | 'mysql' | 'postgresql' | 'oracle' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  trustServerCertificate?: boolean;
}

// SQL Server schema creation scripts
const sqlServerSchema = `
-- Create core tables for iDRAC Updater Orchestrator

-- System configuration table
CREATE TABLE system_config (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [key] NVARCHAR(255) NOT NULL UNIQUE,
    value NVARCHAR(MAX),
    description NVARCHAR(1000),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Datacenters table
CREATE TABLE datacenters (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    location NVARCHAR(500),
    timezone NVARCHAR(100) DEFAULT 'UTC',
    ip_scopes NVARCHAR(MAX), -- JSON array of IP scopes
    maintenance_window_start TIME,
    maintenance_window_end TIME,
    contact_email NVARCHAR(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Credential profiles table
CREATE TABLE credential_profiles (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(1000),
    username NVARCHAR(255) NOT NULL,
    password_encrypted NVARCHAR(1000) NOT NULL,
    protocol NVARCHAR(10) DEFAULT 'https',
    port INT DEFAULT 443,
    is_default BIT DEFAULT 0,
    priority_order INT DEFAULT 100,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by NVARCHAR(255)
);

-- Servers table
CREATE TABLE servers (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    hostname NVARCHAR(255) NOT NULL,
    ip_address NVARCHAR(45) NOT NULL, -- Supports IPv6
    model NVARCHAR(255),
    service_tag NVARCHAR(255),
    idrac_version NVARCHAR(100),
    bios_version NVARCHAR(100),
    operating_system NVARCHAR(255),
    os_version NVARCHAR(255),
    os_eol_date DATE,
    cpu_cores INT,
    memory_gb INT,
    storage_gb INT,
    rack_location NVARCHAR(255),
    datacenter NVARCHAR(255),
    environment NVARCHAR(50) DEFAULT 'production',
    criticality NVARCHAR(20) DEFAULT 'medium',
    cost_center NVARCHAR(100),
    site_id NVARCHAR(100),
    timezone NVARCHAR(100) DEFAULT 'UTC',
    security_risk_level NVARCHAR(20) DEFAULT 'medium',
    cluster_name NVARCHAR(255),
    host_type NVARCHAR(50) DEFAULT 'standalone',
    discovery_source NVARCHAR(50) DEFAULT 'manual',
    domain NVARCHAR(255),
    purchase_date DATE,
    warranty_end_date DATE,
    ism_installed BIT DEFAULT 0,
    [status] NVARCHAR(20) DEFAULT 'unknown',
    vcenter_id UNIQUEIDENTIFIER,
    last_discovered DATETIME2,
    last_updated DATETIME2,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- vCenter connections table
CREATE TABLE vcenters (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    hostname NVARCHAR(255) NOT NULL,
    username NVARCHAR(255) NOT NULL,
    password NVARCHAR(1000),
    port INT DEFAULT 443,
    ignore_ssl BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Firmware packages table
CREATE TABLE firmware_packages (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    version NVARCHAR(100) NOT NULL,
    component_name NVARCHAR(255),
    firmware_type NVARCHAR(50) NOT NULL,
    file_path NVARCHAR(1000),
    file_size BIGINT,
    checksum NVARCHAR(255),
    applicable_models NVARCHAR(MAX), -- JSON array
    description NVARCHAR(MAX),
    release_date DATE,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Update jobs table
CREATE TABLE update_jobs (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    server_id UNIQUEIDENTIFIER NOT NULL,
    firmware_package_id UNIQUEIDENTIFIER NOT NULL,
    [status] NVARCHAR(20) DEFAULT 'pending',
    progress INT DEFAULT 0,
    scheduled_at DATETIME2,
    started_at DATETIME2,
    completed_at DATETIME2,
    error_message NVARCHAR(MAX),
    logs NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by NVARCHAR(255),
    FOREIGN KEY (server_id) REFERENCES servers(id),
    FOREIGN KEY (firmware_package_id) REFERENCES firmware_packages(id)
);

-- System events table
CREATE TABLE system_events (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    event_type NVARCHAR(100) NOT NULL,
    severity NVARCHAR(20) DEFAULT 'info',
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    metadata NVARCHAR(MAX), -- JSON
    acknowledged BIT DEFAULT 0,
    acknowledged_at DATETIME2,
    acknowledged_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    created_by UNIQUEIDENTIFIER
);

-- Create indexes for better performance
CREATE INDEX IX_servers_ip_address ON servers(ip_address);
CREATE INDEX IX_servers_hostname ON servers(hostname);
CREATE INDEX IX_servers_datacenter ON servers(datacenter);
CREATE INDEX IX_system_events_event_type ON system_events(event_type);
CREATE INDEX IX_update_jobs_status ON update_jobs([status]);
CREATE INDEX IX_system_config_key ON system_config([key]);

-- Insert initial system configuration
INSERT INTO system_config ([key], value, description) VALUES
('setup_completed', 'true', 'Initial setup completion status'),
('app_version', '1.0.0', 'Application version'),
('created_at', GETUTCDATE(), 'Installation timestamp');
`;

// MySQL schema (adapted from SQL Server)
const mySqlSchema = `
-- Create core tables for iDRAC Updater Orchestrator

CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    \`key\` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datacenters (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    timezone VARCHAR(100) DEFAULT 'UTC',
    ip_scopes JSON,
    maintenance_window_start TIME,
    maintenance_window_end TIME,
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credential_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    protocol VARCHAR(10) DEFAULT 'https',
    port INT DEFAULT 443,
    is_default BOOLEAN DEFAULT FALSE,
    priority_order INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS servers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    hostname VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    model VARCHAR(255),
    service_tag VARCHAR(255),
    idrac_version VARCHAR(100),
    bios_version VARCHAR(100),
    operating_system VARCHAR(255),
    os_version VARCHAR(255),
    os_eol_date DATE,
    cpu_cores INT,
    memory_gb INT,
    storage_gb INT,
    rack_location VARCHAR(255),
    datacenter VARCHAR(255),
    environment VARCHAR(50) DEFAULT 'production',
    criticality VARCHAR(20) DEFAULT 'medium',
    cost_center VARCHAR(100),
    site_id VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    security_risk_level VARCHAR(20) DEFAULT 'medium',
    cluster_name VARCHAR(255),
    host_type VARCHAR(50) DEFAULT 'standalone',
    discovery_source VARCHAR(50) DEFAULT 'manual',
    domain VARCHAR(255),
    purchase_date DATE,
    warranty_end_date DATE,
    ism_installed BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'unknown',
    vcenter_id VARCHAR(36),
    last_discovered TIMESTAMP,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO system_config (\`key\`, value, description) VALUES
('setup_completed', 'true', 'Initial setup completion status'),
('app_version', '1.0.0', 'Application version');
`;

// PostgreSQL schema
const postgreSqlSchema = `
-- Create core tables for iDRAC Updater Orchestrator

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datacenters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    timezone VARCHAR(100) DEFAULT 'UTC',
    ip_scopes JSONB,
    maintenance_window_start TIME,
    maintenance_window_end TIME,
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_config (key, value, description) VALUES
('setup_completed', 'true', 'Initial setup completion status'),
('app_version', '1.0.0', 'Application version')
ON CONFLICT (key) DO NOTHING;
`;

async function initializeDatabaseSchema(config: DatabaseConfig) {
  try {
    console.log(`Initializing ${config.type} database schema`);

    // Since we can't directly execute SQL from edge functions against external databases,
    // we'll return the appropriate schema scripts for the client to execute
    let schemaScript: string;
    
    switch (config.type) {
      case 'mssql':
        schemaScript = sqlServerSchema;
        break;
      case 'mysql':
        schemaScript = mySqlSchema;
        break;
      case 'postgresql':
        schemaScript = postgreSqlSchema;
        break;
      case 'oracle':
        schemaScript = "-- Oracle schema initialization would go here";
        break;
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }

    return {
      success: true,
      message: `Schema script generated for ${config.type}`,
      schemaScript: schemaScript,
      instructions: [
        "Execute the provided schema script in your database management tool",
        "Verify all tables were created successfully", 
        "Check that initial system_config entries exist",
        "The application will be ready to use once schema is applied"
      ]
    };

  } catch (error) {
    console.error('Database schema initialization error:', error);
    return {
      success: false,
      error: error.message || 'Schema initialization failed'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: DatabaseConfig = await req.json();
    const result = await initializeDatabaseSchema(config);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Database schema initialization error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});