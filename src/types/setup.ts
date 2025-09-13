import type { DatabaseConfig, InfrastructureConfig } from './database';

// Enhanced setup configuration types
export interface SetupConfig {
  backend_mode: 'supabase' | 'on_premise';
  organization_name: string;
  admin_email: string;
  deployment_type: 'cloud' | 'on_premise' | 'hybrid';
  database?: DatabaseConfig;
  infrastructure?: InfrastructureConfig;
}

export interface CompletedSetupConfig extends SetupConfig {
  setup_completed: boolean;
  setup_completed_at: string;
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  required?: boolean;
  validateStep?: (config: Partial<SetupConfig>) => boolean;
}