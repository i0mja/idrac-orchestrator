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
      servers: {
        Row: {
          bios_version: string | null
          created_at: string
          datacenter: string | null
          environment: string | null
          hostname: string
          id: string
          idrac_version: string | null
          ip_address: unknown
          last_discovered: string | null
          last_updated: string | null
          model: string | null
          rack_location: string | null
          service_tag: string | null
          status: Database["public"]["Enums"]["server_status"] | null
          updated_at: string
          vcenter_id: string | null
        }
        Insert: {
          bios_version?: string | null
          created_at?: string
          datacenter?: string | null
          environment?: string | null
          hostname: string
          id?: string
          idrac_version?: string | null
          ip_address: unknown
          last_discovered?: string | null
          last_updated?: string | null
          model?: string | null
          rack_location?: string | null
          service_tag?: string | null
          status?: Database["public"]["Enums"]["server_status"] | null
          updated_at?: string
          vcenter_id?: string | null
        }
        Update: {
          bios_version?: string | null
          created_at?: string
          datacenter?: string | null
          environment?: string | null
          hostname?: string
          id?: string
          idrac_version?: string | null
          ip_address?: unknown
          last_discovered?: string | null
          last_updated?: string | null
          model?: string | null
          rack_location?: string | null
          service_tag?: string | null
          status?: Database["public"]["Enums"]["server_status"] | null
          updated_at?: string
          vcenter_id?: string | null
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
      vcenters: {
        Row: {
          created_at: string
          hostname: string
          id: string
          ignore_ssl: boolean | null
          name: string
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
          port?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
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
