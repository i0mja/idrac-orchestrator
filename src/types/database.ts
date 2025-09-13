// Database backend configuration types
export interface DatabaseConfig {
  type: 'mssql' | 'mysql' | 'postgresql' | 'oracle' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  trustServerCertificate?: boolean; // For SQL Server
  connectionTimeout?: number;
  requestTimeout?: number;
  autoCreateDatabase?: boolean; // New: auto-create database if it doesn't exist
  adminUsername?: string; // For database creation (optional, defaults to username)
  adminPassword?: string; // For database creation (optional, defaults to password)
  pool?: {
    min: number;
    max: number;
    idleTimeout: number;
  };
}

export interface DatabaseAdapter {
  testConnection(): Promise<{ success: boolean; error?: string; version?: string }>;
  createDatabase(): Promise<{ success: boolean; error?: string; created?: boolean }>;
  initializeSchema(): Promise<{ success: boolean; error?: string }>;
  executeQuery(query: string, params?: any[]): Promise<any>;
  migrate(scripts: string[]): Promise<{ success: boolean; error?: string }>;
}

export interface InfrastructureConfig {
  datacenters: Array<{
    name: string;
    location: string;
    timezone: string;
    ipScopes: Array<{
      subnet: string;
      description: string;
      credentialProfileId?: string; // Reference to credential profile for this IP range
    }>;
    maintenanceWindow: {
      start: string; // HH:MM format for daily maintenance window start
      end: string;   // HH:MM format for daily maintenance window end
    };
  }>;
  credentialProfiles: Array<{
    id: string; // Unique identifier for referencing from IP scopes
    name: string;
    username: string;
    password: string;
    port: number;
    protocol: 'https' | 'http';
    isDefault: boolean;
    description?: string; // Optional description of what this profile is for
  }>;
  vcenters: Array<{
    name: string;
    hostname: string;
    username: string;
    password: string;
    port: number;
    ignoreSsl: boolean;
  }>;
  discoverySettings: {
    enabled: boolean;
    intervalHours: number;
    autoAssignDatacenters: boolean;
  };
}