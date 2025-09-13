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
  pool?: {
    min: number;
    max: number;
    idleTimeout: number;
  };
}

export interface DatabaseAdapter {
  testConnection(): Promise<{ success: boolean; error?: string; version?: string }>;
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
    }>;
    maintenanceWindow: {
      start: string;
      end: string;
    };
  }>;
  credentialProfiles: Array<{
    name: string;
    username: string;
    password: string;
    port: number;
    protocol: 'https' | 'http';
    isDefault: boolean;
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