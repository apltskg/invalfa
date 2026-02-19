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
      agency_settings: {
        Row: {
          address: string | null
          bank_name: string | null
          company_name: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          logo_url: string | null
          phone: string | null
          swift: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bank_name?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          swift?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bank_name?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          swift?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      bank_statements: {
        Row: {
          bank_id: string | null
          bank_name: string
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          statement_month: string | null
          transaction_count: number | null
          upload_date: string | null
        }
        Insert: {
          bank_id?: string | null
          bank_name: string
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          statement_month?: string | null
          transaction_count?: number | null
          upload_date?: string | null
        }
        Update: {
          bank_id?: string | null
          bank_name?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          statement_month?: string | null
          transaction_count?: number | null
          upload_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_id: string | null
          bank_name: string | null
          category_type: string | null
          confidence_score: number | null
          created_at: string
          description: string
          folder_id: string | null
          id: string
          match_status: string | null
          matched_record_id: string | null
          matched_record_type: string | null
          needs_invoice: boolean
          notes: string | null
          package_id: string | null
          statement_id: string | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          bank_name?: string | null
          category_type?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          folder_id?: string | null
          id?: string
          match_status?: string | null
          matched_record_id?: string | null
          matched_record_type?: string | null
          needs_invoice?: boolean
          notes?: string | null
          package_id?: string | null
          statement_id?: string | null
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          bank_name?: string | null
          category_type?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          match_status?: string | null
          matched_record_id?: string | null
          matched_record_type?: string | null
          needs_invoice?: boolean
          notes?: string | null
          package_id?: string | null
          statement_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          brand_color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          name_el: string
        }
        Insert: {
          brand_color: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          name_el: string
        }
        Update: {
          brand_color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          name_el?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_office: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_office?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_office?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      excel_imports: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          mapped_columns: Json | null
          matched_count: number | null
          row_count: number | null
          upload_date: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          mapped_columns?: Json | null
          matched_count?: number | null
          row_count?: number | null
          upload_date?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mapped_columns?: Json | null
          matched_count?: number | null
          row_count?: number | null
          upload_date?: string | null
        }
        Relationships: []
      }
      excel_invoice_rows: {
        Row: {
          client_name: string | null
          created_at: string | null
          id: string
          import_id: string | null
          invoice_date: string | null
          invoice_number: string | null
          match_status: string | null
          matched_income_id: string | null
          net_amount: number | null
          total_amount: number | null
          vat_amount: number | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          id?: string
          import_id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          matched_income_id?: string | null
          net_amount?: number | null
          total_amount?: number | null
          vat_amount?: number | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          id?: string
          import_id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          matched_income_id?: string | null
          net_amount?: number | null
          total_amount?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "excel_invoice_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "excel_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excel_invoice_rows_matched_income_id_fkey"
            columns: ["matched_income_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          is_operational: boolean | null
          name: string
          name_el: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_operational?: boolean | null
          name: string
          name_el: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          is_operational?: boolean | null
          name?: string
          name_el?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      income_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          name_el: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          name_el: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          name_el?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      hub_shares: {
        Row: {
          id: string
          invoice_id: string
          customer_id: string | null
          customer_email: string
          customer_name: string | null
          message: string | null
          access_token: string | null
          email_sent_at: string | null
          viewed_at: string | null
          status: string
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          customer_id?: string | null
          customer_email: string
          customer_name?: string | null
          message?: string | null
          access_token?: string | null
          email_sent_at?: string | null
          viewed_at?: string | null
          status?: string
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          customer_id?: string | null
          customer_email?: string
          customer_name?: string | null
          message?: string | null
          access_token?: string | null
          email_sent_at?: string | null
          viewed_at?: string | null
          status?: string
          created_at?: string | null
          created_by?: string | null
        }
        Relationships: []
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
      invoice_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          invoice_id: string | null
          is_doubt: boolean | null
          is_read: boolean | null
          shareable_link_id: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          is_doubt?: boolean | null
          is_read?: boolean | null
          shareable_link_id?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          is_doubt?: boolean | null
          is_read?: boolean | null
          shareable_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_comments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_comments_shareable_link_id_fkey"
            columns: ["shareable_link_id"]
            isOneToOne: false
            referencedRelation: "shareable_links"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_list_imports: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          matched_count: number | null
          period_month: string | null
          row_count: number | null
          total_gross: number | null
          total_net: number | null
          total_vat: number | null
          upload_date: string | null
          validated_totals: boolean | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          matched_count?: number | null
          period_month?: string | null
          row_count?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
          upload_date?: string | null
          validated_totals?: boolean | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          matched_count?: number | null
          period_month?: string | null
          row_count?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_vat?: number | null
          upload_date?: string | null
          validated_totals?: boolean | null
        }
        Relationships: []
      }
      invoice_list_items: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_vat: string | null
          created_at: string | null
          id: string
          import_id: string | null
          invoice_date: string | null
          invoice_number: string | null
          match_status: string | null
          matched_folder_id: string | null
          matched_income_id: string | null
          mydata_code: string | null
          mydata_mark: string | null
          net_amount: number | null
          notes: string | null
          total_amount: number | null
          vat_amount: number | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          client_vat?: string | null
          created_at?: string | null
          id?: string
          import_id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          matched_folder_id?: string | null
          matched_income_id?: string | null
          mydata_code?: string | null
          mydata_mark?: string | null
          net_amount?: number | null
          notes?: string | null
          total_amount?: number | null
          vat_amount?: number | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          client_vat?: string | null
          created_at?: string | null
          id?: string
          import_id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          match_status?: string | null
          matched_folder_id?: string | null
          matched_income_id?: string | null
          mydata_code?: string | null
          mydata_mark?: string | null
          net_amount?: number | null
          notes?: string | null
          total_amount?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_list_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_list_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "invoice_list_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_list_items_matched_folder_id_fkey"
            columns: ["matched_folder_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_list_items_matched_income_id_fkey"
            columns: ["matched_income_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
          customer_id: string | null
          expense_category_id: string | null
          extracted_data: Json | null
          file_name: string
          file_path: string
          id: string
          invoice_date: string | null
          merchant: string | null
          package_id: string | null
          supplier_id: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["invoice_category"]
          created_at?: string
          customer_id?: string | null
          expense_category_id?: string | null
          extracted_data?: Json | null
          file_name: string
          file_path: string
          id?: string
          invoice_date?: string | null
          merchant?: string | null
          package_id?: string | null
          supplier_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["invoice_category"]
          created_at?: string
          customer_id?: string | null
          expense_category_id?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          invoice_date?: string | null
          merchant?: string | null
          package_id?: string | null
          supplier_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          client_name: string
          created_at: string
          customer_id: string | null
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["package_status"]
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          customer_id?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["package_status"]
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          customer_id?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
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
      shareable_links: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          month_year: string | null
          package_id: string | null
          proforma_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          month_year?: string | null
          package_id?: string | null
          proforma_id?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          month_year?: string | null
          package_id?: string | null
          proforma_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareable_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shareable_links_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proforma_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          default_category_id: string | null
          email: string | null
          iban: string | null
          id: string
          invoice_instructions: string | null
          name: string
          notes: string | null
          phone: string | null
          tax_office: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          default_category_id?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          invoice_instructions?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tax_office?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          default_category_id?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          invoice_instructions?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tax_office?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized_user: { Args: { _user_id: string }; Returns: boolean }
      update_magic_link_access: {
        Args: { _link_id: string }
        Returns: undefined
      }
      validate_magic_link_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          id: string
          is_valid: boolean
          month_year: string
        }[]
      }
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
