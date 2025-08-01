export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
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
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
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
          last_discovered: string | null
          last_updated: string | null
          memory_gb: number | null
          model: string | null
          purchase_date: string | null
          rack_location: string | null
          service_tag: string | null
          status: Database["public"]["Enums"]["server_status"] | null
          storage_gb: number | null
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
          last_discovered?: string | null
          last_updated?: string | null
          memory_gb?: number | null
          model?: string | null
          purchase_date?: string | null
          rack_location?: string | null
          service_tag?: string | null
          status?: Database["public"]["Enums"]["server_status"] | null
          storage_gb?: number | null
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
          last_discovered?: string | null
          last_updated?: string | null
          memory_gb?: number | null
          model?: string | null
          purchase_date?: string | null
          rack_location?: string | null
          service_tag?: string | null
          status?: Database["public"]["Enums"]["server_status"] | null
          storage_gb?: number | null
          updated_at?: string
          vcenter_id?: string | null
          warranty_end_date?: string | null
        }
        Relationships: []
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
          cluster_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step: number | null
          execution_interval_months: number | null
          id: string
          is_auto_generated: boolean | null
          name: string
          next_execution_date: string | null
          overwritten_plan_id: string | null
          rollback_plan: Json | null
          safety_checks: Json
          server_ids: string[]
          started_at: string | null
          status: string | null
          total_steps: number | null
          update_sequence: Json
          updated_at: string
          vmware_settings: Json | null
        }
        Insert: {
          cluster_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          execution_interval_months?: number | null
          id?: string
          is_auto_generated?: boolean | null
          name: string
          next_execution_date?: string | null
          overwritten_plan_id?: string | null
          rollback_plan?: Json | null
          safety_checks: Json
          server_ids: string[]
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          update_sequence: Json
          updated_at?: string
          vmware_settings?: Json | null
        }
        Update: {
          cluster_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          execution_interval_months?: number | null
          id?: string
          is_auto_generated?: boolean | null
          name?: string
          next_execution_date?: string | null
          overwritten_plan_id?: string | null
          rollback_plan?: Json | null
          safety_checks?: Json
          server_ids?: string[]
          started_at?: string | null
          status?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
