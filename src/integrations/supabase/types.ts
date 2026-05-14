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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blood_tickets: {
        Row: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          created_at: string
          created_by: string
          expires_at: string
          hospital_id: string
          id: string
          latitude: number
          longitude: number
          patient_context: string | null
          search_radius_km: number
          status: Database["public"]["Enums"]["ticket_status"]
          units_fulfilled: number
          units_needed: number
          updated_at: string
          urgency: Database["public"]["Enums"]["ticket_urgency"]
        }
        Insert: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          created_at?: string
          created_by: string
          expires_at?: string
          hospital_id: string
          id?: string
          latitude: number
          longitude: number
          patient_context?: string | null
          search_radius_km?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          units_fulfilled?: number
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["ticket_urgency"]
        }
        Update: {
          blood_type?: Database["public"]["Enums"]["blood_type"]
          created_at?: string
          created_by?: string
          expires_at?: string
          hospital_id?: string
          id?: string
          latitude?: number
          longitude?: number
          patient_context?: string | null
          search_radius_km?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          units_fulfilled?: number
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["ticket_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_tickets_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          donated_at: string
          donor_id: string
          hospital_id: string
          id: string
          points_awarded: number
          ticket_id: string | null
          units: number
          verified_by: string | null
        }
        Insert: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          donated_at?: string
          donor_id: string
          hospital_id: string
          id?: string
          points_awarded?: number
          ticket_id?: string | null
          units?: number
          verified_by?: string | null
        }
        Update: {
          blood_type?: Database["public"]["Enums"]["blood_type"]
          donated_at?: string
          donor_id?: string
          hospital_id?: string
          id?: string
          points_awarded?: number
          ticket_id?: string | null
          units?: number
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "blood_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_staff: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          position: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          position?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          position?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string
          city: string | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          phone: string | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          phone?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          hospital_id: string
          id: string
          units: number
          updated_at: string
        }
        Insert: {
          blood_type: Database["public"]["Enums"]["blood_type"]
          hospital_id: string
          id?: string
          units?: number
          updated_at?: string
        }
        Update: {
          blood_type?: Database["public"]["Enums"]["blood_type"]
          hospital_id?: string
          id?: string
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blood_type: Database["public"]["Enums"]["blood_type"] | null
          cooldown_until: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          is_available: boolean
          last_donation_at: string | null
          latitude: number | null
          longitude: number | null
          onboarded: boolean
          phone: string | null
          points: number
          total_donations: number
          updated_at: string
        }
        Insert: {
          blood_type?: Database["public"]["Enums"]["blood_type"] | null
          cooldown_until?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id: string
          is_available?: boolean
          last_donation_at?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarded?: boolean
          phone?: string | null
          points?: number
          total_donations?: number
          updated_at?: string
        }
        Update: {
          blood_type?: Database["public"]["Enums"]["blood_type"] | null
          cooldown_until?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          is_available?: boolean
          last_donation_at?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarded?: boolean
          phone?: string | null
          points?: number
          total_donations?: number
          updated_at?: string
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          check_in_code: string
          checked_in_at: string | null
          donated_at: string | null
          donor_id: string
          id: string
          responded_at: string
          status: Database["public"]["Enums"]["response_status"]
          ticket_id: string
        }
        Insert: {
          check_in_code?: string
          checked_in_at?: string | null
          donated_at?: string | null
          donor_id: string
          id?: string
          responded_at?: string
          status?: Database["public"]["Enums"]["response_status"]
          ticket_id: string
        }
        Update: {
          check_in_code?: string
          checked_in_at?: string | null
          donated_at?: string | null
          donor_id?: string
          id?: string
          responded_at?: string
          status?: Database["public"]["Enums"]["response_status"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "blood_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compatible_donor_types: {
        Args: { _recipient: Database["public"]["Enums"]["blood_type"] }
        Returns: Database["public"]["Enums"]["blood_type"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_staff_of: { Args: { _hospital_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "donor" | "hospital_staff" | "admin"
      blood_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      response_status:
        | "accepted"
        | "declined"
        | "checked_in"
        | "donated"
        | "no_show"
      ticket_status:
        | "open"
        | "in_progress"
        | "fulfilled"
        | "cancelled"
        | "expired"
      ticket_urgency: "low" | "medium" | "high" | "critical"
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
      app_role: ["donor", "hospital_staff", "admin"],
      blood_type: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      response_status: [
        "accepted",
        "declined",
        "checked_in",
        "donated",
        "no_show",
      ],
      ticket_status: [
        "open",
        "in_progress",
        "fulfilled",
        "cancelled",
        "expired",
      ],
      ticket_urgency: ["low", "medium", "high", "critical"],
    },
  },
} as const
