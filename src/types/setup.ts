// Unified setup configuration types
export interface SetupConfig {
  backend_mode: 'supabase' | 'on_premise';
  organization_name: string;
  admin_email: string;
  deployment_type: 'cloud' | 'on_premise' | 'hybrid';
}

export interface CompletedSetupConfig extends SetupConfig {
  setup_completed: boolean;
  setup_completed_at: string;
}