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
          has_size_variants: boolean
          id: string
          image_url: string
          is_available: boolean
          name: string
          price: number
          restaurant_id: string
          size_variants: { name: string; price: number }[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          has_size_variants?: boolean
          id?: string
          image_url: string
          is_available?: boolean
          name: string
          price: number
          restaurant_id: string
          size_variants?: { name: string; price: number }[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          has_size_variants?: boolean
          id?: string
          image_url?: string
          is_available?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          size_variants?: { name: string; price: number }[]
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
      menu_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          expires_at: string
          id: string
          is_active: boolean
          last_activity_at: string
          restaurant_id: string
          table_number: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          last_activity_at?: string
          restaurant_id: string
          table_number?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string
          restaurant_id?: string
          table_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_sessions_restaurant_id_fkey"
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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          razorpay_subscription_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          razorpay_subscription_id?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          billing_cycle: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          password_hash: string
          plan_id: string
          razorpay_subscription_id: string | null
          restaurant_description: string | null
          restaurant_name: string
          status: string | null
        }
        Insert: {
          billing_cycle: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          password_hash: string
          plan_id: string
          razorpay_subscription_id?: string | null
          restaurant_description?: string | null
          restaurant_name: string
          status?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          password_hash?: string
          plan_id?: string
          razorpay_subscription_id?: string | null
          restaurant_description?: string | null
          restaurant_name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number | null
          id: string
          key: string
          window_start: string | null
        }
        Insert: {
          count?: number | null
          id?: string
          key: string
          window_start?: string | null
        }
        Update: {
          count?: number | null
          id?: string
          key?: string
          window_start?: string | null
        }
        Relationships: []
      }
      razorpay_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
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
          subscription_plan_id: string | null
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
          subscription_plan_id?: string | null
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
          subscription_plan_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          success: boolean | null
          user_agent_hash: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          success?: boolean | null
          user_agent_hash?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          success?: boolean | null
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      service_calls: {
        Row: {
          acknowledged_at: string | null
          call_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          restaurant_id: string
          status: string
          table_number: string
        }
        Insert: {
          acknowledged_at?: string | null
          call_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          restaurant_id: string
          status?: string
          table_number: string
        }
        Update: {
          acknowledged_at?: string | null
          call_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          restaurant_id?: string
          status?: string
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          has_orders_feature: boolean | null
          id: string
          is_active: boolean | null
          max_categories: number | null
          max_menu_items: number | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          has_orders_feature?: boolean | null
          id?: string
          is_active?: boolean | null
          max_categories?: number | null
          max_menu_items?: number | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          has_orders_feature?: boolean | null
          id?: string
          is_active?: boolean | null
          max_categories?: number | null
          max_menu_items?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pending_billing_cycle: string | null
          pending_plan_id: string | null
          pending_razorpay_subscription_id: string | null
          plan_id: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          restaurant_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle: string
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pending_billing_cycle?: string | null
          pending_plan_id?: string | null
          pending_razorpay_subscription_id?: string | null
          plan_id: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          restaurant_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pending_billing_cycle?: string | null
          pending_plan_id?: string | null
          pending_razorpay_subscription_id?: string | null
          plan_id?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          restaurant_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_feedback_rate_limit: {
        Args: { p_max_feedback_per_order?: number; p_order_id: string }
        Returns: boolean
      }
      check_order_rate_limit: {
        Args: {
          p_max_orders_per_hour?: number
          p_restaurant_id: string
          p_table_number: string
        }
        Returns: boolean
      }
      check_orders_feature_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      check_request_throttle: {
        Args: {
          p_action: string
          p_client_hash: string
          p_max_per_minute?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: Record<PropertyKey, never>; Returns: number }
      cleanup_rate_limits: { Args: Record<PropertyKey, never>; Returns: undefined }
      cleanup_security_logs: { Args: Record<PropertyKey, never>; Returns: undefined }
      create_menu_session: {
        Args: {
          p_device_fingerprint?: string
          p_restaurant_id: string
          p_table_number?: string
        }
        Returns: string
      }
      create_order: {
        Args: {
          p_items: Json
          p_order_number: string
          p_restaurant_id: string
          p_table_number: string
        }
        Returns: string
      }
      create_order_secure: {
        Args: {
          p_client_hash?: string
          p_items: Json
          p_restaurant_id: string
          p_table_number: string
        }
        Returns: Json
      }
      end_menu_session: { Args: { p_session_id: string }; Returns: boolean }
      get_user_subscription_status: {
        Args: { p_user_id: string }
        Returns: {
          current_period_end: string
          has_orders_feature: boolean
          has_subscription: boolean
          is_active: boolean
          plan_name: string
          plan_slug: string
          subscription_status: string
        }[]
      }
      is_client_blocked: {
        Args: {
          p_ip_hash: string
          p_max_failures?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      is_signup_code_valid: { Args: { p_code: string }; Returns: boolean }
      log_security_event: {
        Args: {
          p_endpoint?: string
          p_event_type: string
          p_ip_hash?: string
          p_metadata?: Json
          p_success?: boolean
          p_user_agent_hash?: string
        }
        Returns: undefined
      }
      mark_signup_code_used: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      submit_feedback_secure: {
        Args: {
          p_client_hash?: string
          p_comment?: string
          p_order_id: string
          p_rating: number
          p_restaurant_id: string
        }
        Returns: Json
      }
      toggle_restaurant_status: {
        Args: {
          p_admin_email: string
          p_is_active: boolean
          p_restaurant_id: string
        }
        Returns: boolean
      }
      validate_menu_session: {
        Args: { p_session_id: string }
        Returns: {
          error_message: string
          expires_at: string
          is_valid: boolean
          remaining_minutes: number
          restaurant_id: string
        }[]
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
