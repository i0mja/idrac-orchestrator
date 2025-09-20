export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          campaign_id: string | null
          event_type: string
          id: string
          properties: Json | null
          server_id: string | null
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          event_type: string
          id?: string
          properties?: Json | null
          server_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          event_type?: string
          id?: string
          properties?: Json | null
          server_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          permissions: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          permissions?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          permissions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_orchestration_config: {
        Row: {
          cluster_priority_order: string[] | null
          created_at: string
          enabled: boolean | null
          execution_interval_months: number | null
          id: string
          maintenance_window_end: string | null
          maintenance_window_start: string | null
          update_interval_minutes: number | null
          updated_at: string
        }
        Insert: {
          cluster_priority_order?: string[] | null
          created_at?: string
          enabled?: boolean | null
          execution_interval_months?: number | null
          id?: string
          maintenance_window_end?: string | null
          maintenance_window_start?: string | null
          update_interval_minutes?: number | null
          updated_at?: string
        }
        Update: {
          cluster_priority_order?: string[] | null
          created_at?: string
          enabled?: boolean | null
          execution_interval_months?: number | null
          id?: string
          maintenance_window_end?: string | null
          maintenance_window_start?: string | null
          update_interval_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          host_run_id: string | null
          id: string
          job_type: string
          logs: string | null
          max_retries: number
          metadata: Json | null
          priority: number
          progress: number
          retry_count: number
          scheduled_at: string
          server_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          host_run_id?: string | null
          id?: string
          job_type: string
          logs?: string | null
          max_retries?: number
          metadata?: Json | null
          priority?: number
          progress?: number
          retry_count?: number
          scheduled_at?: string
          server_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          host_run_id?: string | null
          id?: string
          job_type?: string
          logs?: string | null
          max_retries?: number
          metadata?: Json | null
          priority?: number
          progress?: number
          retry_count?: number
          scheduled_at?: string
          server_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      backup_config: {
        Row: {
          backup_type: string
          compression_enabled: boolean | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          encryption_enabled: boolean | null
          id: string
          last_backup_at: string | null
          last_backup_size: number | null
          last_backup_status: string | null
          name: string
          next_scheduled_at: string | null
          retention_days: number | null
          schedule_cron: string
          storage_config: Json | null
          storage_location: string | null
          updated_at: string | null
        }
        Insert: {
          backup_type: string
          compression_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          encryption_enabled?: boolean | null
          id?: string
          last_backup_at?: string | null
          last_backup_size?: number | null
          last_backup_status?: string | null
          name: string
          next_scheduled_at?: string | null
          retention_days?: number | null
          schedule_cron: string
          storage_config?: Json | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_type?: string
          compression_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          encryption_enabled?: boolean | null
          id?: string
          last_backup_at?: string | null
          last_backup_size?: number | null
          last_backup_status?: string | null
          name?: string
          next_scheduled_at?: string | null
          retention_days?: number | null
          schedule_cron?: string
          storage_config?: Json | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_approvals: {
        Row: {
          approval_level: number | null
          approver_id: string
          approver_name: string
          campaign_id: string
          comments: string | null
          created_at: string | null
          id: string
          status: string
        }
        Insert: {
          approval_level?: number | null
          approver_id: string
          approver_name: string
          campaign_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          status: string
        }
        Update: {
          approval_level?: number | null
          approver_id?: string
          approver_name?: string
          campaign_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_approvals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "update_orchestration_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_execution_logs: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          log_level: string
          message: string
          metadata: Json | null
          server_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          log_level?: string
          message: string
          metadata?: Json | null
          server_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          log_level?: string
          message?: string
          metadata?: Json | null
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_execution_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "update_orchestration_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_template: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      compatibility_matrix: {
        Row: {
          bios_version: string | null
          created_at: string
          esxi_version: string
          id: string
          idrac_version: string | null
          last_validated: string | null
          nic_firmware: string | null
          server_model: string
          storage_firmware: string | null
          updated_at: string
          validation_notes: string | null
          validation_status: string | null
          vmware_hcl_verified: boolean | null
        }
        Insert: {
          bios_version?: string | null
          created_at?: string
          esxi_version: string
          id?: string
          idrac_version?: string | null
          last_validated?: string | null
          nic_firmware?: string | null
          server_model: string
          storage_firmware?: string | null
          updated_at?: string
          validation_notes?: string | null
          validation_status?: string | null
          vmware_hcl_verified?: boolean | null
        }
        Update: {
          bios_version?: string | null
          created_at?: string
          esxi_version?: string
          id?: string
          idrac_version?: string | null
          last_validated?: string | null
          nic_firmware?: string | null
          server_model?: string
          storage_firmware?: string | null
          updated_at?: string
          validation_notes?: string | null
          validation_status?: string | null
          vmware_hcl_verified?: boolean | null
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          generated_at: string | null
          generated_by: string | null
          id: string
          organization_id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          status: string | null
        }
        Insert: {
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          status?: string | null
        }
        Update: {
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          report_data?: Json
          report_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_assignments: {
        Row: {
          created_at: string
          credential_profile_id: string
          datacenter_id: string | null
          id: string
          ip_range_cidr: unknown | null
          ip_range_end: unknown | null
          ip_range_start: unknown | null
          is_active: boolean | null
          priority_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_profile_id: string
          datacenter_id?: string | null
          id?: string
          ip_range_cidr?: unknown | null
          ip_range_end?: unknown | null
          ip_range_start?: unknown | null
          is_active?: boolean | null
          priority_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_profile_id?: string
          datacenter_id?: string | null
          id?: string
          ip_range_cidr?: unknown | null
          ip_range_end?: unknown | null
          ip_range_start?: unknown | null
          is_active?: boolean | null
          priority_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_assignments_credential_profile_id_fkey"
            columns: ["credential_profile_id"]
            isOneToOne: false
            referencedRelation: "credential_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_assignments_datacenter_id_fkey"
            columns: ["datacenter_id"]
            isOneToOne: false
            referencedRelation: "datacenters"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          password_encrypted: string
          port: number | null
          priority_order: number | null
          protocol: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          password_encrypted: string
          port?: number | null
          priority_order?: number | null
          protocol?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          password_encrypted?: string
          port?: number | null
          priority_order?: number | null
          protocol?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      datacenters: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          ip_scopes: Json | null
          is_active: boolean | null
          location: string | null
          maintenance_window_end: string | null
          maintenance_window_start: string | null
          name: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          ip_scopes?: Json | null
          is_active?: boolean | null
          location?: string | null
          maintenance_window_end?: string | null
          maintenance_window_start?: string | null
          name: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          ip_scopes?: Json | null
          is_active?: boolean | null
          location?: string | null
          maintenance_window_end?: string | null
          maintenance_window_start?: string | null
          name?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dell_update_packages: {
        Row: {
          checksum_md5: string | null
          checksum_sha256: string | null
          component_type: string
          created_at: string
          criticality: string | null
          dell_part_number: string | null
          dependencies: string[] | null
          esxi_version_compatibility: string[] | null
          file_path: string | null
          file_size: number | null
          id: string
          known_issues: string | null
          package_name: string
          release_date: string | null
          requires_reboot: boolean | null
          service_tag_compatibility: string[] | null
          update_sequence_order: number | null
          updated_at: string
          version: string
        }
        Insert: {
          checksum_md5?: string | null
          checksum_sha256?: string | null
          component_type: string
          created_at?: string
          criticality?: string | null
          dell_part_number?: string | null
          dependencies?: string[] | null
          esxi_version_compatibility?: string[] | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          known_issues?: string | null
          package_name: string
          release_date?: string | null
          requires_reboot?: boolean | null
          service_tag_compatibility?: string[] | null
          update_sequence_order?: number | null
          updated_at?: string
          version: string
        }
        Update: {
          checksum_md5?: string | null
          checksum_sha256?: string | null
          component_type?: string
          created_at?: string
          criticality?: string | null
          dell_part_number?: string | null
          dependencies?: string[] | null
          esxi_version_compatibility?: string[] | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          known_issues?: string | null
          package_name?: string
          release_date?: string | null
          requires_reboot?: boolean | null
          service_tag_compatibility?: string[] | null
          update_sequence_order?: number | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      eol_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          recommendation: string | null
          server_id: string | null
          severity: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          recommendation?: string | null
          server_id?: string | null
          severity?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          recommendation?: string | null
          server_id?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eol_alerts_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      firmware_packages: {
        Row: {
          applicable_models: string[] | null
          checksum: string | null
          component_name: string | null
          created_at: string
          description: string | null
          file_path: string | null
          file_size: number | null
          firmware_type: Database["public"]["Enums"]["firmware_type"]
          id: string
          name: string
          release_date: string | null
          updated_at: string
          version: string
        }
        Insert: {
          applicable_models?: string[] | null
          checksum?: string | null
          component_name?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          firmware_type: Database["public"]["Enums"]["firmware_type"]
          id?: string
          name: string
          release_date?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          applicable_models?: string[] | null
          checksum?: string | null
          component_name?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          firmware_type?: Database["public"]["Enums"]["firmware_type"]
          id?: string
          name?: string
          release_date?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      governance_policies: {
        Row: {
          created_at: string | null
          created_by: string | null
          enforcement_level: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          policy_name: string
          policy_rules: Json
          policy_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enforcement_level?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          policy_name: string
          policy_rules?: Json
          policy_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enforcement_level?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          policy_name?: string
          policy_rules?: Json
          policy_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      health_check_results: {
        Row: {
          check_type: string
          checked_at: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          recommendations: Json | null
          status: string
          target_id: string | null
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          recommendations?: Json | null
          status: string
          target_id?: string | null
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          recommendations?: Json | null
          status?: string
          target_id?: string | null
        }
        Relationships: []
      }
      health_scoring_config: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          metric_name: string
          thresholds: Json | null
          updated_at: string | null
          weight: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          metric_name: string
          thresholds?: Json | null
          updated_at?: string | null
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          metric_name?: string
          thresholds?: Json | null
          updated_at?: string | null
          weight?: number
        }
        Relationships: []
      }
      host_credential_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          credential_profile_id: string
          id: string
          ip_address: unknown
          server_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credential_profile_id: string
          id?: string
          ip_address: unknown
          server_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credential_profile_id?: string
          id?: string
          ip_address?: unknown
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_credential_overrides_credential_profile_id_fkey"
            columns: ["credential_profile_id"]
            isOneToOne: false
            referencedRelation: "credential_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_credential_overrides_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: true
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      host_runs: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string
          error_message: string | null
          id: string
          server_id: string | null
          started_at: string | null
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          error_message?: string | null
          id: string
          server_id?: string | null
          started_at?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          server_id?: string | null
          started_at?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ldap_config: {
        Row: {
          bind_dn: string | null
          bind_password: string | null
          created_at: string | null
          group_search_base: string | null
          group_search_filter: string | null
          id: string
          is_active: boolean | null
          name: string
          server_url: string
          updated_at: string | null
          user_search_base: string
          user_search_filter: string | null
        }
        Insert: {
          bind_dn?: string | null
          bind_password?: string | null
          created_at?: string | null
          group_search_base?: string | null
          group_search_filter?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          server_url: string
          updated_at?: string | null
          user_search_base: string
          user_search_filter?: string | null
        }
        Update: {
          bind_dn?: string | null
          bind_password?: string | null
          created_at?: string | null
          group_search_base?: string | null
          group_search_filter?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          server_url?: string
          updated_at?: string | null
          user_search_base?: string
          user_search_filter?: string | null
        }
        Relationships: []
      }
      maintenance_windows: {
        Row: {
          created_at: string
          created_by: string | null
          datacenter_id: string | null
          description: string | null
          end_time: string
          id: string
          max_concurrent_updates: number | null
          metadata: Json | null
          name: string
          next_occurrence: string | null
          notification_hours_before: number | null
          recurrence: string | null
          scheduled_date: string
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          datacenter_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          max_concurrent_updates?: number | null
          metadata?: Json | null
          name: string
          next_occurrence?: string | null
          notification_hours_before?: number | null
          recurrence?: string | null
          scheduled_date: string
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          datacenter_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          max_concurrent_updates?: number | null
          metadata?: Json | null
          name?: string
          next_occurrence?: string | null
          notification_hours_before?: number | null
          recurrence?: string | null
          scheduled_date?: string
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_windows_datacenter_id_fkey"
            columns: ["datacenter_id"]
            isOneToOne: false
            referencedRelation: "datacenters"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          channel_type: string
          configuration: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          channel_type: string
          configuration?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          channel_type?: string
          configuration?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          organization_id: string
          permissions: Json | null
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id: string
          permissions?: Json | null
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_servers: number | null
          max_users: number | null
          name: string
          settings: Json | null
          slug: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_servers?: number | null
          max_users?: number | null
          name: string
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_servers?: number | null
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      os_compatibility: {
        Row: {
          created_at: string
          eol_date: string | null
          id: string
          ism_compatible: boolean | null
          operating_system: string
          os_version: string
          recommendations: string | null
          risk_level: string | null
          server_model: string | null
          support_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          eol_date?: string | null
          id?: string
          ism_compatible?: boolean | null
          operating_system: string
          os_version: string
          recommendations?: string | null
          risk_level?: string | null
          server_model?: string | null
          support_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          eol_date?: string | null
          id?: string
          ism_compatible?: boolean | null
          operating_system?: string
          os_version?: string
          recommendations?: string | null
          risk_level?: string | null
          server_model?: string | null
          support_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          organization_id: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      server_backups: {
        Row: {
          backup_data: Json
          backup_size: number | null
          backup_type: string
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          server_id: string | null
        }
        Insert: {
          backup_data: Json
          backup_size?: number | null
          backup_type: string
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          server_id?: string | null
        }
        Update: {
          backup_data?: Json
          backup_size?: number | null
          backup_type?: string
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_backups_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_credentials: {
        Row: {
          connection_method: Database["public"]["Enums"]["connection_method"]
          created_at: string
          id: string
          port: number | null
          server_id: string
          updated_at: string
          username: string
        }
        Insert: {
          connection_method: Database["public"]["Enums"]["connection_method"]
          created_at?: string
          id?: string
          port?: number | null
          server_id: string
          updated_at?: string
          username: string
        }
        Update: {
          connection_method?: Database["public"]["Enums"]["connection_method"]
          created_at?: string
          id?: string
          port?: number | null
          server_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_credentials_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_notes: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          server_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          server_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          server_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_notes_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_readiness_checks: {
        Row: {
          blocking_issues: Json | null
          check_timestamp: string | null
          connectivity_status: string
          created_at: string | null
          credential_status: string
          firmware_capability_status: string
          id: string
          last_successful_update: string | null
          maintenance_mode_capable: boolean | null
          overall_readiness: string
          readiness_score: number | null
          server_id: string
          vcenter_integration_status: string | null
          warnings: Json | null
        }
        Insert: {
          blocking_issues?: Json | null
          check_timestamp?: string | null
          connectivity_status: string
          created_at?: string | null
          credential_status: string
          firmware_capability_status: string
          id?: string
          last_successful_update?: string | null
          maintenance_mode_capable?: boolean | null
          overall_readiness: string
          readiness_score?: number | null
          server_id: string
          vcenter_integration_status?: string | null
          warnings?: Json | null
        }
        Update: {
          blocking_issues?: Json | null
          check_timestamp?: string | null
          connectivity_status?: string
          created_at?: string | null
          credential_status?: string
          firmware_capability_status?: string
          id?: string
          last_successful_update?: string | null
          maintenance_mode_capable?: boolean | null
          overall_readiness?: string
          readiness_score?: number | null
          server_id?: string
          vcenter_integration_status?: string | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "server_readiness_checks_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          bios_version: string | null
          cluster_name: string | null
          cost_center: string | null
          cpu_cores: number | null
          created_at: string
          criticality: string | null
          datacenter: string | null
          discovery_source: string | null
          domain: string | null
          environment: string | null
          host_type: string | null
          hostname: string
          id: string
          idrac_version: string | null
          ip_address: unknown
          ism_installed: boolean | null
          last_discovered: string | null
          last_updated: string | null
          memory_gb: number | null
          model: string | null
          operating_system: string | null
          organization_id: string | null
          os_eol_date: string | null
          os_version: string | null
          purchase_date: string | null
          rack_location: string | null
          security_risk_level: string | null
          service_tag: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["server_status"] | null
          storage_gb: number | null
          timezone: string | null
          updated_at: string
          vcenter_id: string | null
          warranty_end_date: string | null
        }
        Insert: {
          bios_version?: string | null
          cluster_name?: string | null
          cost_center?: string | null
          cpu_cores?: number | null
          created_at?: string
          criticality?: string | null
          datacenter?: string | null
          discovery_source?: string | null
          domain?: string | null
          environment?: string | null
          host_type?: string | null
          hostname: string
          id?: string
          idrac_version?: string | null
          ip_address: unknown
          ism_installed?: boolean | null
          last_discovered?: string | null
          last_updated?: string | null
          memory_gb?: number | null
          model?: string | null
          operating_system?: string | null
          organization_id?: string | null
          os_eol_date?: string | null
          os_version?: string | null
          purchase_date?: string | null
          rack_location?: string | null
          security_risk_level?: string | null
          service_tag?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["server_status"] | null
          storage_gb?: number | null
          timezone?: string | null
          updated_at?: string
          vcenter_id?: string | null
          warranty_end_date?: string | null
        }
        Update: {
          bios_version?: string | null
          cluster_name?: string | null
          cost_center?: string | null
          cpu_cores?: number | null
          created_at?: string
          criticality?: string | null
          datacenter?: string | null
          discovery_source?: string | null
          domain?: string | null
          environment?: string | null
          host_type?: string | null
          hostname?: string
          id?: string
          idrac_version?: string | null
          ip_address?: unknown
          ism_installed?: boolean | null
          last_discovered?: string | null
          last_updated?: string | null
          memory_gb?: number | null
          model?: string | null
          operating_system?: string | null
          organization_id?: string | null
          os_eol_date?: string | null
          os_version?: string | null
          purchase_date?: string | null
          rack_location?: string | null
          security_risk_level?: string | null
          service_tag?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["server_status"] | null
          storage_gb?: number | null
          timezone?: string | null
          updated_at?: string
          vcenter_id?: string | null
          warranty_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          configuration: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          provider_name: string
          provider_type: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          provider_name: string
          provider_type: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          provider_name?: string
          provider_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      system_events: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      system_insights: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_resources: Json | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          insight_type: string
          recommendations: Json | null
          severity: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_resources?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          insight_type: string
          recommendations?: Json | null
          severity?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_resources?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          recommendations?: Json | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_insights_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      update_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          firmware_package_id: string
          id: string
          logs: string | null
          progress: number | null
          scheduled_at: string | null
          server_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["update_job_status"] | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          firmware_package_id: string
          id?: string
          logs?: string | null
          progress?: number | null
          scheduled_at?: string | null
          server_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["update_job_status"] | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          firmware_package_id?: string
          id?: string
          logs?: string | null
          progress?: number | null
          scheduled_at?: string | null
          server_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["update_job_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_jobs_firmware_package_id_fkey"
            columns: ["firmware_package_id"]
            isOneToOne: false
            referencedRelation: "firmware_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_jobs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      update_orchestration_plans: {
        Row: {
          actual_duration: unknown | null
          approval_comments: string | null
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          cluster_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step: number | null
          estimated_duration: unknown | null
          execution_interval_months: number | null
          failure_reason: string | null
          id: string
          is_auto_generated: boolean | null
          max_retries: number | null
          name: string
          next_execution_date: string | null
          overwritten_plan_id: string | null
          retry_count: number | null
          rollback_plan: Json | null
          safety_checks: Json
          server_ids: string[]
          started_at: string | null
          status: string | null
          tags: string[] | null
          template_id: string | null
          total_steps: number | null
          update_sequence: Json
          updated_at: string
          vmware_settings: Json | null
        }
        Insert: {
          actual_duration?: unknown | null
          approval_comments?: string | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          cluster_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          estimated_duration?: unknown | null
          execution_interval_months?: number | null
          failure_reason?: string | null
          id?: string
          is_auto_generated?: boolean | null
          max_retries?: number | null
          name: string
          next_execution_date?: string | null
          overwritten_plan_id?: string | null
          retry_count?: number | null
          rollback_plan?: Json | null
          safety_checks: Json
          server_ids: string[]
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          template_id?: string | null
          total_steps?: number | null
          update_sequence: Json
          updated_at?: string
          vmware_settings?: Json | null
        }
        Update: {
          actual_duration?: unknown | null
          approval_comments?: string | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          cluster_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          estimated_duration?: unknown | null
          execution_interval_months?: number | null
          failure_reason?: string | null
          id?: string
          is_auto_generated?: boolean | null
          max_retries?: number | null
          name?: string
          next_execution_date?: string | null
          overwritten_plan_id?: string | null
          retry_count?: number | null
          rollback_plan?: Json | null
          safety_checks?: Json
          server_ids?: string[]
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          template_id?: string | null
          total_steps?: number | null
          update_sequence?: Json
          updated_at?: string
          vmware_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "update_orchestration_plans_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "vcenter_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vcenter_clusters: {
        Row: {
          active_hosts: number | null
          created_at: string
          drs_enabled: boolean | null
          ha_enabled: boolean | null
          id: string
          maintenance_mode_policy: string | null
          name: string
          total_hosts: number | null
          updated_at: string
          vcenter_id: string | null
        }
        Insert: {
          active_hosts?: number | null
          created_at?: string
          drs_enabled?: boolean | null
          ha_enabled?: boolean | null
          id?: string
          maintenance_mode_policy?: string | null
          name: string
          total_hosts?: number | null
          updated_at?: string
          vcenter_id?: string | null
        }
        Update: {
          active_hosts?: number | null
          created_at?: string
          drs_enabled?: boolean | null
          ha_enabled?: boolean | null
          id?: string
          maintenance_mode_policy?: string | null
          name?: string
          total_hosts?: number | null
          updated_at?: string
          vcenter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vcenter_clusters_vcenter_id_fkey"
            columns: ["vcenter_id"]
            isOneToOne: false
            referencedRelation: "vcenters"
            referencedColumns: ["id"]
          },
        ]
      }
      vcenters: {
        Row: {
          created_at: string
          hostname: string
          id: string
          ignore_ssl: boolean | null
          name: string
          password: string | null
          port: number | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          ignore_ssl?: boolean | null
          name: string
          password?: string | null
          port?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          ignore_ssl?: boolean | null
          name?: string
          password?: string | null
          port?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      virtual_machines: {
        Row: {
          cpu_count: number | null
          created_at: string
          id: string
          is_template: boolean | null
          memory_mb: number | null
          power_state: string | null
          server_id: string | null
          storage_gb: number | null
          updated_at: string
          vm_id: string
          vm_name: string
          vm_tools_status: string | null
        }
        Insert: {
          cpu_count?: number | null
          created_at?: string
          id?: string
          is_template?: boolean | null
          memory_mb?: number | null
          power_state?: string | null
          server_id?: string | null
          storage_gb?: number | null
          updated_at?: string
          vm_id: string
          vm_name: string
          vm_tools_status?: string | null
        }
        Update: {
          cpu_count?: number | null
          created_at?: string
          id?: string
          is_template?: boolean | null
          memory_mb?: number | null
          power_state?: string | null
          server_id?: string | null
          storage_gb?: number | null
          updated_at?: string
          vm_id?: string
          vm_name?: string
          vm_tools_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_machines_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          context: Json | null
          error_message: string | null
          execution_log: Json | null
          id: string
          organization_id: string | null
          started_at: string | null
          status: string | null
          template_id: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          template_id: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          steps: Json
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          steps: Json
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_os_eol_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      claim_jobs: {
        Args: { max_jobs?: number; processor_id?: string }
        Returns: {
          completed_at: string
          created_at: string
          error_message: string
          host_run_id: string
          id: string
          job_type: string
          logs: string
          max_retries: number
          metadata: Json
          priority: number
          progress: number
          retry_count: number
          scheduled_at: string
          server_id: string
          started_at: string
          status: string
          updated_at: string
        }[]
      }
      get_credentials_for_ip: {
        Args: { target_ip: unknown }
        Returns: {
          assignment_type: string
          credential_profile_id: string
          name: string
          password_encrypted: string
          port: number
          priority_order: number
          protocol: string
          username: string
        }[]
      }
      get_datacenter_for_ip: {
        Args: { ip_addr: unknown }
        Returns: string
      }
      get_host_runs: {
        Args: { limit_count?: number }
        Returns: Json
      }
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_permission: {
        Args: {
          perm: Database["public"]["Enums"]["app_permission"]
          user_uuid: string
        }
        Returns: boolean
      }
      ip_in_datacenter_scope: {
        Args: { datacenter_id: string; ip_addr: unknown }
        Returns: boolean
      }
      is_organization_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_error_message?: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type?: string
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      track_analytics_event: {
        Args: {
          p_campaign_id?: string
          p_event_type: string
          p_properties?: Json
          p_server_id?: string
          p_session_id?: string
          p_user_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_permission:
        | "system:admin"
        | "users:read"
        | "users:write"
        | "users:delete"
        | "servers:read"
        | "servers:write"
        | "servers:delete"
        | "firmware:read"
        | "firmware:write"
        | "firmware:deploy"
        | "jobs:read"
        | "jobs:write"
        | "jobs:execute"
        | "jobs:cancel"
        | "alerts:read"
        | "alerts:acknowledge"
        | "alerts:manage"
        | "settings:read"
        | "settings:write"
        | "analytics:read"
        | "analytics:export"
        | "backup:read"
        | "backup:write"
        | "backup:restore"
        | "audit:read"
      connection_method: "redfish" | "racadm" | "vcenter"
      firmware_type: "idrac" | "bios" | "storage" | "network" | "other"
      server_status: "online" | "offline" | "updating" | "error" | "unknown"
      update_job_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_permission: [
        "system:admin",
        "users:read",
        "users:write",
        "users:delete",
        "servers:read",
        "servers:write",
        "servers:delete",
        "firmware:read",
        "firmware:write",
        "firmware:deploy",
        "jobs:read",
        "jobs:write",
        "jobs:execute",
        "jobs:cancel",
        "alerts:read",
        "alerts:acknowledge",
        "alerts:manage",
        "settings:read",
        "settings:write",
        "analytics:read",
        "analytics:export",
        "backup:read",
        "backup:write",
        "backup:restore",
        "audit:read",
      ],
      connection_method: ["redfish", "racadm", "vcenter"],
      firmware_type: ["idrac", "bios", "storage", "network", "other"],
      server_status: ["online", "offline", "updating", "error", "unknown"],
      update_job_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
