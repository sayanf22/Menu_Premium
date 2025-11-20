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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_actions_log: {
        Row: {
          action_type: string
          admin_email: string
          details: Json | null
          id: string
          restaurant_id: string | null
          timestamp: string | null
        }
        Insert: {
          action_type: string
          admin_email: string
          details?: Json | null
          id?: string
          restaurant_id?: string | null
          timestamp?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string
          details?: Json | null
          id?: string
          restaurant_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          restaurant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          restaurant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          name: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          name: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          name?: string
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          image_url: string
          is_available: boolean
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          image_url: string
          is_available?: boolean
          name: string
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_available?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_views: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_views_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          order_number: string
          restaurant_id: string
          status: string
          table_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          order_number: string
          restaurant_id: string
          status?: string
          table_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          order_number?: string
          restaurant_id?: string
          status?: string
          table_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          description: string | null
          email: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          qr_code_url: string | null
          social_links: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          qr_code_url?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          qr_code_url?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          max_uses: number | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          max_uses?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          max_uses?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_items: Json
          p_order_number: string
          p_restaurant_id: string
          p_table_number: string
        }
        Returns: string
      }
      mark_signup_code_used: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      toggle_restaurant_status: {
        Args: {
          p_admin_email: string
          p_is_active: boolean
          p_restaurant_id: string
        }
        Returns: boolean
      }
      validate_signup_code: { Args: { p_code: string }; Returns: boolean }
      verify_admin_password: {
        Args: { p_email: string; p_password: string }
        Returns: boolean
      }
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
