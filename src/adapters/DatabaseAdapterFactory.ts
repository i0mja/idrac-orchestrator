import type { DatabaseConfig, DatabaseAdapter } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

export class SupabaseDatabaseAdapter implements DatabaseAdapter {
  constructor(private config: DatabaseConfig) {}

  async testConnection(): Promise<{ success: boolean; error?: string; version?: string }> {
    try {
      // Test Supabase connection
      const response = await fetch(`https://${this.config.host}/rest/v1/`, {
        headers: {
          'apikey': this.config.password, // Using password field for API key
          'Authorization': `Bearer ${this.config.password}`
        }
      });
      
      return {
        success: response.ok,
        version: 'Supabase Cloud',
        error: response.ok ? undefined : 'Failed to connect to Supabase'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async createDatabase(): Promise<{ success: boolean; error?: string; created?: boolean }> {
    // Supabase database already exists
    return { success: true, created: false };
  }

  async initializeSchema(): Promise<{ success: boolean; error?: string }> {
    // Supabase schema is already initialized
    return { success: true };
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    throw new Error('Raw SQL not supported in Supabase adapter');
  }

  async migrate(scripts: string[]): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

export class SqlServerAdapter implements DatabaseAdapter {
  constructor(private config: DatabaseConfig) {}

  async testConnection(): Promise<{ success: boolean; error?: string; version?: string }> {
    try {
      // This will be handled by an edge function
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: this.config
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  async createDatabase(): Promise<{ success: boolean; error?: string; created?: boolean }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-database', {
        body: this.config
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database creation failed'
      };
    }
  }

  async initializeSchema(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('initialize-database-schema', {
        body: this.config
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schema initialization failed'
      };
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      const response = await fetch('/api/execute-database-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: this.config, query, params })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async migrate(scripts: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/migrate-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: this.config, scripts })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }
}

export class DatabaseAdapterFactory {
  static create(config: DatabaseConfig): DatabaseAdapter {
    switch (config.type) {
      case 'postgresql':
        if (config.host.includes('supabase')) {
          return new SupabaseDatabaseAdapter(config);
        }
        // Fall through to SQL Server adapter for now (can be extended)
      case 'mssql':
        return new SqlServerAdapter(config);
      case 'mysql':
      case 'oracle':
      case 'sqlite':
        return new SqlServerAdapter(config); // Generic adapter for now
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
}