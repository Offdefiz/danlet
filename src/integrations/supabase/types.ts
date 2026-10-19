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
      activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          snapshot: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      couple_members: {
        Row: {
          person: string
          user_id: string
        }
        Insert: {
          person: string
          user_id: string
        }
        Update: {
          person?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duet_presence: {
        Row: {
          last_seen: string
          user_id: string
        }
        Insert: {
          last_seen: string
          user_id: string
        }
        Update: {
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          additions: boolean
          enabled: boolean
          last_online_notice: string | null
          online: boolean
          online_cooldown_minutes: number
          user_id: string
        }
        Insert: {
          additions?: boolean
          enabled?: boolean
          last_online_notice?: string | null
          online?: boolean
          online_cooldown_minutes?: number
          user_id: string
        }
        Update: {
          additions?: boolean
          enabled?: boolean
          last_online_notice?: string | null
          online?: boolean
          online_cooldown_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      push_event_queue: {
        Row: {
          actor_id: string
          body: string
          created_at: string
          id: string
          kind: string
          processed_at: string | null
          recipient_id: string
        }
        Insert: {
          actor_id: string
          body: string
          created_at?: string
          id?: string
          kind: string
          processed_at?: string | null
          recipient_id: string
        }
        Update: {
          actor_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          processed_at?: string | null
          recipient_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          user_id?: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          done: boolean
          id: string
          kind: string
          period: string
          reference_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          done?: boolean
          id?: string
          kind: string
          period?: string
          reference_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          done?: boolean
          id?: string
          kind?: string
          period?: string
          reference_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "records_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      references_catalog: {
        Row: {
          category: string
          checked_at: string
          city: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_credit: string | null
          image_path: string | null
          instagram_url: string | null
          scenery: string
          source_url: string
          state: string
          title: string
          verification: string
        }
        Insert: {
          category?: string
          checked_at?: string
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_credit?: string | null
          image_path?: string | null
          instagram_url?: string | null
          scenery?: string
          source_url: string
          state?: string
          title: string
          verification?: string
        }
        Update: {
          category?: string
          checked_at?: string
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_credit?: string | null
          image_path?: string | null
          instagram_url?: string | null
          scenery?: string
          source_url?: string
          state?: string
          title?: string
          verification?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string
          record_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          record_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          liked: boolean
          reference_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          liked: boolean
          reference_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          liked?: boolean
          reference_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_duet_push_events: {
        Args: never
        Returns: {
          actor_id: string
          body: string
          created_at: string
          id: string
          kind: string
          processed_at: string | null
          recipient_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "push_event_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      enqueue_duet_push: {
        Args: { actor: string; event_body: string; event_kind: string }
        Returns: undefined
      }
      heartbeat_duet_push: { Args: { actor: string }; Returns: boolean }
      is_duet_member: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
