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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_available: boolean
          name: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_available?: boolean
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_available?: boolean
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      complement_groups: {
        Row: {
          allow_repeat: boolean
          created_at: string
          deleted_at: string | null
          id: string
          max_select: number
          min_select: number
          name: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          allow_repeat?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          max_select?: number
          min_select?: number
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          allow_repeat?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          max_select?: number
          min_select?: number
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complement_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      complements: {
        Row: {
          complement_group_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          complement_group_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          complement_group_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complements_complement_group_id_fkey"
            columns: ["complement_group_id"]
            isOneToOne: false
            referencedRelation: "complement_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          last_address: Json | null
          name: string | null
          phone: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_address?: Json | null
          name?: string | null
          phone: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_address?: Json | null
          name?: string | null
          phone?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          store_id: string
          to_status: Database["public"]["Enums"]["order_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          store_id: string
          to_status: Database["public"]["Enums"]["order_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          store_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_complements: {
        Row: {
          complement_id: string | null
          created_at: string
          group_name: string
          id: string
          name: string
          order_item_id: string
          price: number
          quantity: number
          store_id: string
        }
        Insert: {
          complement_id?: string | null
          created_at?: string
          group_name: string
          id?: string
          name: string
          order_item_id: string
          price: number
          quantity: number
          store_id: string
        }
        Update: {
          complement_id?: string | null
          created_at?: string
          group_name?: string
          id?: string
          name?: string
          order_item_id?: string
          price?: number
          quantity?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_complements_complement_id_fkey"
            columns: ["complement_id"]
            isOneToOne: false
            referencedRelation: "complements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_complements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_complements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          order_id: string
          product_id: string | null
          quantity: number
          store_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          quantity: number
          store_id: string
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          quantity?: number
          store_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address: Json | null
          applied_promotions: Json
          change_for: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivery_fee: number
          discount: number
          id: string
          is_paid: boolean
          mode: Database["public"]["Enums"]["order_mode"]
          notes: string | null
          number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          public_token: string
          read_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address?: Json | null
          applied_promotions?: Json
          change_for?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          delivery_fee?: number
          discount?: number
          id?: string
          is_paid?: boolean
          mode: Database["public"]["Enums"]["order_mode"]
          notes?: string | null
          number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          public_token?: string
          read_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address?: Json | null
          applied_promotions?: Json
          change_for?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          delivery_fee?: number
          discount?: number
          id?: string
          is_paid?: boolean
          mode?: Database["public"]["Enums"]["order_mode"]
          notes?: string | null
          number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          public_token?: string
          read_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_complement_groups: {
        Row: {
          complement_group_id: string
          product_id: string
          sort_order: number
          store_id: string
        }
        Insert: {
          complement_group_id: string
          product_id: string
          sort_order?: number
          store_id: string
        }
        Update: {
          complement_group_id?: string
          product_id?: string
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_complement_groups_complement_group_id_fkey"
            columns: ["complement_group_id"]
            isOneToOne: false
            referencedRelation: "complement_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_complement_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_complement_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badges: string[]
          category_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_suggested: boolean
          name: string
          price: number
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          badges?: string[]
          category_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_suggested?: boolean
          name: string
          price: number
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          badges?: string[]
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_suggested?: boolean
          name?: string
          price?: number
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          rule: Json
          schedule: Json
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          rule?: Json
          schedule?: Json
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          rule?: Json
          schedule?: Json
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          deleted_at: string | null
          endpoint: string
          id: string
          keys: Json
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          endpoint: string
          id?: string
          keys: Json
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_hours: {
        Row: {
          closes_at: string
          created_at: string
          deleted_at: string | null
          id: string
          opens_at: string
          store_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          opens_at: string
          store_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          opens_at?: string
          store_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_hours_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_users: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          deleted_at: string | null
          district: string | null
          id: string
          is_open_override: boolean | null
          name: string
          next_order_number: number
          number: string | null
          phone: string | null
          plan: string | null
          settings: Json
          slug: string
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          id?: string
          is_open_override?: boolean | null
          name: string
          next_order_number?: number
          number?: string | null
          phone?: string | null
          plan?: string | null
          settings?: Json
          slug: string
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          id?: string
          is_open_override?: boolean | null
          name?: string
          next_order_number?: number
          number?: string | null
          phone?: string | null
          plan?: string | null
          settings?: Json
          slug?: string
          state?: string | null
          street?: string | null
          updated_at?: string
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
          p_address?: Json
          p_change_for?: number
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_mode: Database["public"]["Enums"]["order_mode"]
          p_notes?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_store_id: string
        }
        Returns: Json
      }
      get_order_by_token: { Args: { p_token: string }; Returns: Json }
      is_store_open: {
        Args: { p_at?: string; p_store_id: string }
        Returns: boolean
      }
      mark_order_read: { Args: { p_order_id: string }; Returns: undefined }
      next_order_number: { Args: { p_store_id: string }; Returns: number }
      update_order_status: {
        Args: {
          p_is_paid?: boolean
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          accepted_at: string | null
          address: Json | null
          applied_promotions: Json
          change_for: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivery_fee: number
          discount: number
          id: string
          is_paid: boolean
          mode: Database["public"]["Enums"]["order_mode"]
          notes: string | null
          number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          public_token: string
          read_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      order_mode: "ENTREGA" | "RETIRADA"
      order_status:
        | "RECEBIDO"
        | "EM_PREPARO"
        | "PRONTO"
        | "A_CAMINHO"
        | "CONCLUIDO"
        | "REJEITADO"
        | "CANCELADO"
      payment_method: "DINHEIRO" | "CARTAO" | "PIX"
      store_role: "OWNER" | "STAFF"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      order_mode: ["ENTREGA", "RETIRADA"],
      order_status: [
        "RECEBIDO",
        "EM_PREPARO",
        "PRONTO",
        "A_CAMINHO",
        "CONCLUIDO",
        "REJEITADO",
        "CANCELADO",
      ],
      payment_method: ["DINHEIRO", "CARTAO", "PIX"],
      store_role: ["OWNER", "STAFF"],
    },
  },
} as const
