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
      invoices: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          gross_amount: number | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          net_amount: number | null
          ocr_confidence: number | null
          ocr_raw_text: string | null
          ocr_status: string | null
          updated_at: string
          user_id: string
          vat_amount: number | null
          vat_category: string | null
          vat_rate: number | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          gross_amount?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          net_amount?: number | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          ocr_status?: string | null
          updated_at?: string
          user_id: string
          vat_amount?: number | null
          vat_category?: string | null
          vat_rate?: number | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          gross_amount?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          net_amount?: number | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          ocr_status?: string | null
          updated_at?: string
          user_id?: string
          vat_amount?: number | null
          vat_category?: string | null
          vat_rate?: number | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      uva_periods: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          kz000_netto: number | null
          kz000_ust: number | null
          kz001_netto: number | null
          kz001_ust: number | null
          kz006_netto: number | null
          kz006_ust: number | null
          kz007_netto: number | null
          kz007_ust: number | null
          kz008_netto: number | null
          kz008_ust: number | null
          kz011_netto: number | null
          kz012_netto: number | null
          kz015_netto: number | null
          kz016_netto: number | null
          kz017_netto: number | null
          kz018_netto: number | null
          kz019_netto: number | null
          kz020_netto: number | null
          kz021_netto: number | null
          kz021_ust: number | null
          kz022_netto: number | null
          kz022_ust: number | null
          kz029_netto: number | null
          kz029_ust: number | null
          kz032_ust: number | null
          kz037_netto: number | null
          kz037_ust: number | null
          kz044_ust: number | null
          kz048_ust: number | null
          kz052_netto: number | null
          kz052_ust: number | null
          kz056_ust: number | null
          kz057_ust: number | null
          kz060_vorsteuer: number | null
          kz061_vorsteuer: number | null
          kz062_vorsteuer: number | null
          kz063_vorsteuer: number | null
          kz064_vorsteuer: number | null
          kz065_vorsteuer: number | null
          kz066_vorsteuer: number | null
          kz067_vorsteuer: number | null
          kz070_netto: number | null
          kz071_netto: number | null
          kz072_netto: number | null
          kz072_ust: number | null
          kz073_netto: number | null
          kz073_ust: number | null
          kz076_netto: number | null
          kz077_netto: number | null
          kz082_vorsteuer: number | null
          kz083_vorsteuer: number | null
          kz087_vorsteuer: number | null
          kz088_netto: number | null
          kz088_ust: number | null
          kz089_vorsteuer: number | null
          kz090_betrag: number | null
          kz095_betrag: number | null
          period_month: number
          period_year: number
          status: string | null
          updated_at: string
          user_id: string
          zahllast: number | null
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          kz000_netto?: number | null
          kz000_ust?: number | null
          kz001_netto?: number | null
          kz001_ust?: number | null
          kz006_netto?: number | null
          kz006_ust?: number | null
          kz007_netto?: number | null
          kz007_ust?: number | null
          kz008_netto?: number | null
          kz008_ust?: number | null
          kz011_netto?: number | null
          kz012_netto?: number | null
          kz015_netto?: number | null
          kz016_netto?: number | null
          kz017_netto?: number | null
          kz018_netto?: number | null
          kz019_netto?: number | null
          kz020_netto?: number | null
          kz021_netto?: number | null
          kz021_ust?: number | null
          kz022_netto?: number | null
          kz022_ust?: number | null
          kz029_netto?: number | null
          kz029_ust?: number | null
          kz032_ust?: number | null
          kz037_netto?: number | null
          kz037_ust?: number | null
          kz044_ust?: number | null
          kz048_ust?: number | null
          kz052_netto?: number | null
          kz052_ust?: number | null
          kz056_ust?: number | null
          kz057_ust?: number | null
          kz060_vorsteuer?: number | null
          kz061_vorsteuer?: number | null
          kz062_vorsteuer?: number | null
          kz063_vorsteuer?: number | null
          kz064_vorsteuer?: number | null
          kz065_vorsteuer?: number | null
          kz066_vorsteuer?: number | null
          kz067_vorsteuer?: number | null
          kz070_netto?: number | null
          kz071_netto?: number | null
          kz072_netto?: number | null
          kz072_ust?: number | null
          kz073_netto?: number | null
          kz073_ust?: number | null
          kz076_netto?: number | null
          kz077_netto?: number | null
          kz082_vorsteuer?: number | null
          kz083_vorsteuer?: number | null
          kz087_vorsteuer?: number | null
          kz088_netto?: number | null
          kz088_ust?: number | null
          kz089_vorsteuer?: number | null
          kz090_betrag?: number | null
          kz095_betrag?: number | null
          period_month: number
          period_year: number
          status?: string | null
          updated_at?: string
          user_id: string
          zahllast?: number | null
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          kz000_netto?: number | null
          kz000_ust?: number | null
          kz001_netto?: number | null
          kz001_ust?: number | null
          kz006_netto?: number | null
          kz006_ust?: number | null
          kz007_netto?: number | null
          kz007_ust?: number | null
          kz008_netto?: number | null
          kz008_ust?: number | null
          kz011_netto?: number | null
          kz012_netto?: number | null
          kz015_netto?: number | null
          kz016_netto?: number | null
          kz017_netto?: number | null
          kz018_netto?: number | null
          kz019_netto?: number | null
          kz020_netto?: number | null
          kz021_netto?: number | null
          kz021_ust?: number | null
          kz022_netto?: number | null
          kz022_ust?: number | null
          kz029_netto?: number | null
          kz029_ust?: number | null
          kz032_ust?: number | null
          kz037_netto?: number | null
          kz037_ust?: number | null
          kz044_ust?: number | null
          kz048_ust?: number | null
          kz052_netto?: number | null
          kz052_ust?: number | null
          kz056_ust?: number | null
          kz057_ust?: number | null
          kz060_vorsteuer?: number | null
          kz061_vorsteuer?: number | null
          kz062_vorsteuer?: number | null
          kz063_vorsteuer?: number | null
          kz064_vorsteuer?: number | null
          kz065_vorsteuer?: number | null
          kz066_vorsteuer?: number | null
          kz067_vorsteuer?: number | null
          kz070_netto?: number | null
          kz071_netto?: number | null
          kz072_netto?: number | null
          kz072_ust?: number | null
          kz073_netto?: number | null
          kz073_ust?: number | null
          kz076_netto?: number | null
          kz077_netto?: number | null
          kz082_vorsteuer?: number | null
          kz083_vorsteuer?: number | null
          kz087_vorsteuer?: number | null
          kz088_netto?: number | null
          kz088_ust?: number | null
          kz089_vorsteuer?: number | null
          kz090_betrag?: number | null
          kz095_betrag?: number | null
          period_month?: number
          period_year?: number
          status?: string | null
          updated_at?: string
          user_id?: string
          zahllast?: number | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
