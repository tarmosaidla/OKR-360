// Minimal Supabase Database type for type-safe client
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          team_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          team_id?: string | null
          created_at?: string
        }
        Update: {
          full_name?: string
          avatar_url?: string | null
          team_id?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: { name: string; description?: string | null }
        Update: { name?: string; description?: string | null }
      }
      cycles: {
        Row: {
          id: string
          year: number
          quarter: number
          label: string
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: never
        Update: never
      }
      objectives: {
        Row: {
          id: string
          title: string
          description: string | null
          owner_id: string
          team_id: string | null
          cycle_id: string
          status: 'on_track' | 'at_risk' | 'behind' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string | null
          owner_id: string
          team_id?: string | null
          cycle_id: string
          status?: 'on_track' | 'at_risk' | 'behind' | 'completed'
        }
        Update: {
          title?: string
          description?: string | null
          team_id?: string | null
          status?: 'on_track' | 'at_risk' | 'behind' | 'completed'
        }
      }
      key_results: {
        Row: {
          id: string
          objective_id: string
          title: string
          target_type: 'numeric' | 'percentage' | 'boolean'
          current_value: number
          target_value: number
          unit: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          objective_id: string
          title: string
          target_type?: 'numeric' | 'percentage' | 'boolean'
          current_value?: number
          target_value?: number
          unit?: string | null
        }
        Update: {
          title?: string
          target_type?: 'numeric' | 'percentage' | 'boolean'
          current_value?: number
          target_value?: number
          unit?: string | null
        }
      }
      checkins: {
        Row: {
          id: string
          key_result_id: string
          author_id: string
          value_at_checkin: number
          notes: string | null
          created_at: string
        }
        Insert: {
          key_result_id: string
          author_id: string
          value_at_checkin: number
          notes?: string | null
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      objective_status: 'on_track' | 'at_risk' | 'behind' | 'completed'
      kr_target_type: 'numeric' | 'percentage' | 'boolean'
    }
  }
}
