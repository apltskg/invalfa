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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accountant_magic_links: {
        Row: {
          accessed_count: number | null
          created_at: string | null
          expires_at: string
          id: string
          last_accessed_at: string | null
          month_year: string
          token: string
        }
        Insert: {
          accessed_count?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          month_year: string
          token: string
        }
        Update: {
          accessed_count?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          month_year?: string
          token?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          needs_invoice: boolean
          package_id: string | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          needs_invoice?: boolean
          package_id?: string | null
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          needs_invoice?: boolean
          package_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      export_logs: {
        Row: {
          id: string
          invoices_included: number
          month_year: string
          packages_included: number
          sent_at: string
        }
        Insert: {
          id?: string
          invoices_included?: number
          month_year: string
          packages_included?: number
          sent_at?: string
        }
        Update: {
          id?: string
          invoices_included?: number
          month_year?: string
          packages_included?: number
          sent_at?: string
        }
        Relationships: []
      }
      invoice_transaction_matches: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          matched_at: string
          status: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          matched_at?: string
          status?: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          matched_at?: string
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_transaction_matches_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_transaction_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["invoice_category"]
          created_at: string
          extracted_data: Json | null
          file_name: string
          file_path: string
          id: string
          invoice_date: string | null
          merchant: string | null
          package_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["invoice_category"]
          created_at?: string
          extracted_data?: Json | null
          file_name: string
          file_path: string
          id?: string
          invoice_date?: string | null
          merchant?: string | null
          package_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["invoice_category"]
          created_at?: string
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          invoice_date?: string | null
          merchant?: string | null
          package_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          client_name: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["package_status"]
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["package_status"]
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          updated_at?: string
        }
        Relationships: []
      }
      proforma_invoices: {
        Row: {
          accept_bank_transfer: boolean
          accept_cash: boolean
          client_address: string | null
          client_email: string | null
          client_name: string | null
          client_vat_number: string | null
          created_at: string
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string | null
          subtotal: number
          tax_amount: number
          tax_percent: number
          total: number
          updated_at: string
        }
        Insert: {
          accept_bank_transfer?: boolean
          accept_cash?: boolean
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_vat_number?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total?: number
          updated_at?: string
        }
        Update: {
          accept_bank_transfer?: boolean
          accept_cash?: boolean
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_vat_number?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          subtotal?: number
          tax_amount?: number
          tax_percent?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
      invoice_category: "airline" | "hotel" | "tolls" | "other"
      package_status: "active" | "completed"
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
      app_role: ["admin", "staff"],
      invoice_category: ["airline", "hotel", "tolls", "other"],
      package_status: ["active", "completed"],
    },
  },
} as const
