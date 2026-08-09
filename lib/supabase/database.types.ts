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
      ai_generation_events: {
        Row: {
          created_at: string
          id: string
          model: string
          organization_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          organization_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          organization_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_commissions: {
        Row: {
          commission_percent: number | null
          commission_received: number | null
          created_at: string | null
          created_by: string | null
          expected_commission: number | null
          expected_pay_date: string | null
          id: string
          notes: string | null
          organization_id: string
          received_date: string | null
          status: string | null
          supplier: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number | null
          commission_received?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_commission?: number | null
          expected_pay_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          received_date?: string | null
          status?: string | null
          supplier?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number | null
          commission_received?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_commission?: number | null
          expected_pay_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          received_date?: string | null
          status?: string | null
          supplier?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commissions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          paid: boolean | null
          paid_date: string | null
          payment_method: string | null
          payment_name: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid?: boolean | null
          paid_date?: string | null
          payment_method?: string | null
          payment_name?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid?: boolean | null
          paid_date?: string | null
          payment_method?: string | null
          payment_name?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_tasks: {
        Row: {
          assignee_id: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          title: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          title?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          title?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_timeline_events: {
        Row: {
          anchor_type: string | null
          client_visible: boolean
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          event_type: string
          generated_at: string | null
          generation_source: string | null
          id: string
          is_advisor_override: boolean
          offset_days: number | null
          organization_id: string
          rule_key: string | null
          rule_version: number | null
          source_url: string | null
          status: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          anchor_type?: string | null
          client_visible?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          event_type: string
          generated_at?: string | null
          generation_source?: string | null
          id?: string
          is_advisor_override?: boolean
          offset_days?: number | null
          organization_id: string
          rule_key?: string | null
          rule_version?: number | null
          source_url?: string | null
          status?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          anchor_type?: string | null
          client_visible?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string
          generated_at?: string | null
          generation_source?: string | null
          id?: string
          is_advisor_override?: boolean
          offset_days?: number | null
          organization_id?: string
          rule_key?: string | null
          rule_version?: number | null
          source_url?: string | null
          status?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_timeline_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      client_celebrations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          occasion: string
          occasion_date: string | null
          organization_id: string
          recurring_annually: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          occasion: string
          occasion_date?: string | null
          organization_id: string
          recurring_annually?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          occasion?: string
          occasion_date?: string | null
          organization_id?: string
          recurring_annually?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_celebrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_celebrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_intake_links: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          invited_email: string | null
          invited_phone_e164: string | null
          organization_id: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          invited_email?: string | null
          invited_phone_e164?: string | null
          organization_id: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invited_email?: string | null
          invited_phone_e164?: string | null
          organization_id?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_intake_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_intake_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_loyalty_programs: {
        Row: {
          created_at: string
          id: string
          member_number: string
          organization_id: string
          program_name: string
          program_type: string
          traveler_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_number: string
          organization_id: string
          program_name: string
          program_type: string
          traveler_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_number?: string
          organization_id?: string
          program_name?: string
          program_type?: string
          traveler_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_loyalty_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_loyalty_programs_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "client_travelers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          token_hash: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          token_hash: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          token_hash?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_links_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      client_travelers: {
        Row: {
          accessibility_needs: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          dietary_restrictions: string | null
          full_name: string
          global_entry_number: string | null
          id: string
          needs_stroller: boolean
          notes: string | null
          organization_id: string
          passport_country: string | null
          passport_expiration: string | null
          passport_number: string | null
          relationship: string | null
          tsa_precheck_number: string | null
          updated_at: string
        }
        Insert: {
          accessibility_needs?: string | null
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          full_name: string
          global_entry_number?: string | null
          id?: string
          needs_stroller?: boolean
          notes?: string | null
          organization_id: string
          passport_country?: string | null
          passport_expiration?: string | null
          passport_number?: string | null
          relationship?: string | null
          tsa_precheck_number?: string | null
          updated_at?: string
        }
        Update: {
          accessibility_needs?: string | null
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          full_name?: string
          global_entry_number?: string | null
          id?: string
          needs_stroller?: boolean
          notes?: string | null
          organization_id?: string
          passport_country?: string | null
          passport_expiration?: string | null
          passport_number?: string | null
          relationship?: string | null
          tsa_precheck_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_travelers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_travelers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          favorite_airlines: string[] | null
          favorite_cruise_lines: string[] | null
          favorite_resorts: string[] | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          organization_id: string
          phone_e164: string | null
          postal_code: string | null
          primary_advisor_id: string | null
          room_preferences: string | null
          sms_consent_at: string | null
          sms_consent_source: string | null
          sms_consent_status: string
          state_province: string | null
          travel_style: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          favorite_airlines?: string[] | null
          favorite_cruise_lines?: string[] | null
          favorite_resorts?: string[] | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          organization_id: string
          phone_e164?: string | null
          postal_code?: string | null
          primary_advisor_id?: string | null
          room_preferences?: string | null
          sms_consent_at?: string | null
          sms_consent_source?: string | null
          sms_consent_status?: string
          state_province?: string | null
          travel_style?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          favorite_airlines?: string[] | null
          favorite_cruise_lines?: string[] | null
          favorite_resorts?: string[] | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          organization_id?: string
          phone_e164?: string | null
          postal_code?: string | null
          primary_advisor_id?: string | null
          room_preferences?: string | null
          sms_consent_at?: string | null
          sms_consent_source?: string | null
          sms_consent_status?: string
          state_province?: string | null
          travel_style?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_drafts: {
        Row: {
          body: string
          channel: string
          client_id: string
          created_at: string
          created_by: string
          error_code: string | null
          id: string
          message_type: string
          organization_id: string
          provider: string | null
          provider_reference: string | null
          recipient_address: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          client_id: string
          created_at?: string
          created_by: string
          error_code?: string | null
          id?: string
          message_type: string
          organization_id: string
          provider?: string | null
          provider_reference?: string | null
          recipient_address: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          client_id?: string
          created_at?: string
          created_by?: string
          error_code?: string | null
          id?: string
          message_type?: string
          organization_id?: string
          provider?: string | null
          provider_reference?: string | null
          recipient_address?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_drafts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      email_deliveries: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          error_code: string | null
          id: string
          organization_id: string
          provider: string
          provider_reference: string | null
          recipient_email: string
          status: string
          subject: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          id?: string
          organization_id: string
          provider: string
          provider_reference?: string | null
          recipient_email: string
          status: string
          subject: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          id?: string
          organization_id?: string
          provider?: string
          provider_reference?: string | null
          recipient_email?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          category: string
          client_visible: boolean
          confirmation_number: string | null
          created_at: string
          created_by: string | null
          id: string
          item_date: string
          location: string | null
          notes: string | null
          organization_id: string
          sort_order: number
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          category: string
          client_visible?: boolean
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_date: string
          location?: string | null
          notes?: string | null
          organization_id: string
          sort_order?: number
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_visible?: boolean
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_date?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          sort_order?: number
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_billing: {
        Row: {
          advisor_price_id: string | null
          advisor_seat_quantity: number
          base_price_id: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          organization_id: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["billing_subscription_status"]
          updated_at: string
        }
        Insert: {
          advisor_price_id?: string | null
          advisor_seat_quantity?: number
          base_price_id?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          organization_id: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["billing_subscription_status"]
          updated_at?: string
        }
        Update: {
          advisor_price_id?: string | null
          advisor_seat_quantity?: number
          base_price_id?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          organization_id?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["billing_subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_billing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_billing_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          amount_remaining: number
          created_at: string
          currency: string
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          organization_id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          provider: string
          provider_invoice_id: string
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["billing_invoice_status"]
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          amount_remaining?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          organization_id: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_invoice_id: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["billing_invoice_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          amount_remaining?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          organization_id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_invoice_id?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["billing_invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_billing_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string
          organization_id: string
          paid_at: string
          provider: string
          provider_payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          organization_id: string
          paid_at: string
          provider?: string
          provider_payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          paid_at?: string
          provider?: string
          provider_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_billing_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "organization_billing_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_billing_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          organization_id: string
          requester_email: string
          requester_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id: string
          requester_email: string
          requester_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id?: string
          requester_email?: string
          requester_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          slug: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_credential_authorizations: {
        Row: {
          authorized_at: string
          created_at: string
          credential_id: string
          currency: string
          expires_at: string | null
          id: string
          maximum_amount: number | null
          organization_id: string
          purpose: string
          revoked_at: string | null
          supplier: string
          trip_id: string
        }
        Insert: {
          authorized_at: string
          created_at?: string
          credential_id: string
          currency?: string
          expires_at?: string | null
          id?: string
          maximum_amount?: number | null
          organization_id: string
          purpose: string
          revoked_at?: string | null
          supplier: string
          trip_id: string
        }
        Update: {
          authorized_at?: string
          created_at?: string
          credential_id?: string
          currency?: string
          expires_at?: string | null
          id?: string
          maximum_amount?: number | null
          organization_id?: string
          purpose?: string
          revoked_at?: string | null
          supplier?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_credential_authorizations_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "payment_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_credential_authorizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_credential_authorizations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credential_events: {
        Row: {
          action: string
          actor_user_id: string | null
          authorization_id: string | null
          created_at: string
          credential_id: string
          id: number
          metadata: Json
          organization_id: string
          outcome: string | null
          supplier: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          authorization_id?: string | null
          created_at?: string
          credential_id: string
          id?: never
          metadata?: Json
          organization_id: string
          outcome?: string | null
          supplier?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          authorization_id?: string | null
          created_at?: string
          credential_id?: string
          id?: never
          metadata?: Json
          organization_id?: string
          outcome?: string | null
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_credential_events_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "payment_credential_authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_credential_events_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "payment_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_credential_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credentials: {
        Row: {
          brand: string | null
          client_id: string
          consent_recorded_at: string
          consent_version: string
          created_at: string
          created_by: string | null
          credential_type: Database["public"]["Enums"]["payment_credential_type"]
          cvc_expires_at: string | null
          cvc_reference: string | null
          display_label: string
          encrypted_cvc: string | null
          encrypted_pan: string | null
          expiration_month: number | null
          expiration_reference: string | null
          expiration_year: number | null
          id: string
          last_four: string | null
          organization_id: string
          provider: string
          provider_reference: string
          status: Database["public"]["Enums"]["payment_credential_status"]
          updated_at: string
        }
        Insert: {
          brand?: string | null
          client_id: string
          consent_recorded_at: string
          consent_version: string
          created_at?: string
          created_by?: string | null
          credential_type: Database["public"]["Enums"]["payment_credential_type"]
          cvc_expires_at?: string | null
          cvc_reference?: string | null
          display_label: string
          encrypted_cvc?: string | null
          encrypted_pan?: string | null
          expiration_month?: number | null
          expiration_reference?: string | null
          expiration_year?: number | null
          id?: string
          last_four?: string | null
          organization_id: string
          provider?: string
          provider_reference: string
          status?: Database["public"]["Enums"]["payment_credential_status"]
          updated_at?: string
        }
        Update: {
          brand?: string | null
          client_id?: string
          consent_recorded_at?: string
          consent_version?: string
          created_at?: string
          created_by?: string | null
          credential_type?: Database["public"]["Enums"]["payment_credential_type"]
          cvc_expires_at?: string | null
          cvc_reference?: string | null
          display_label?: string
          encrypted_cvc?: string | null
          encrypted_pan?: string | null
          expiration_month?: number | null
          expiration_reference?: string | null
          expiration_year?: number | null
          id?: string
          last_four?: string | null
          organization_id?: string
          provider?: string
          provider_reference?: string
          status?: Database["public"]["Enums"]["payment_credential_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      secure_checkout_sessions: {
        Row: {
          actor_user_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          credential_id: string
          expires_at: string
          failure_code: string | null
          id: string
          metadata: Json
          organization_id: string
          provider: string
          provider_session_reference: string | null
          started_at: string | null
          status: string
          supplier: string
          target_url: string
          updated_at: string
        }
        Insert: {
          actor_user_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          credential_id: string
          expires_at?: string
          failure_code?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          provider?: string
          provider_session_reference?: string | null
          started_at?: string | null
          status?: string
          supplier: string
          target_url: string
          updated_at?: string
        }
        Update: {
          actor_user_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          credential_id?: string
          expires_at?: string
          failure_code?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          provider?: string
          provider_session_reference?: string | null
          started_at?: string | null
          status?: string
          supplier?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_checkout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_checkout_sessions_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "payment_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_checkout_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_deliveries: {
        Row: {
          communication_id: string | null
          created_at: string
          created_by: string | null
          error_code: string | null
          id: string
          organization_id: string
          provider: string
          provider_reference: string | null
          recipient_phone: string
          status: string
        }
        Insert: {
          communication_id?: string | null
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          id?: string
          organization_id: string
          provider: string
          provider_reference?: string | null
          recipient_phone: string
          status: string
        }
        Update: {
          communication_id?: string | null
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          id?: string
          organization_id?: string
          provider?: string
          provider_reference?: string | null
          recipient_phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_deliveries_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communication_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_quote_option_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          option_id: string
          organization_id: string
          quote_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          option_id: string
          organization_id: string
          quote_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          option_id?: string
          organization_id?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_quote_option_interactions_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "trip_quote_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_quote_option_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_quote_option_interactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "trip_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_quote_options: {
        Row: {
          created_at: string
          deposit_amount: number | null
          id: string
          image_url: string | null
          is_recommended: boolean
          notes: string | null
          organization_id: string
          quote_id: string
          resort_name: string | null
          sort_order: number
          supplier: string
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean
          notes?: string | null
          organization_id: string
          quote_id: string
          resort_name?: string | null
          sort_order?: number
          supplier: string
          title: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean
          notes?: string | null
          organization_id?: string
          quote_id?: string
          resort_name?: string | null
          sort_order?: number
          supplier?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_quote_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_quote_options_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "trip_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_quote_views: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          quote_id: string
          time_on_page_seconds: number
          viewed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          quote_id: string
          time_on_page_seconds?: number
          viewed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          quote_id?: string
          time_on_page_seconds?: number
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_quote_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_quote_views_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "trip_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_quotes: {
        Row: {
          client_visible: boolean
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          expires_on: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          supplier: string
          title: string
          total_amount: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          expires_on?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          supplier: string
          title: string
          total_amount: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          expires_on?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          supplier?: string
          title?: string
          total_amount?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_quotes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          adults: number | null
          assigned_advisor_id: string | null
          booking_number: string | null
          children: number | null
          client_id: string
          commission_amount: number | null
          created_at: string | null
          created_by: string | null
          destination: string | null
          end_date: string | null
          final_payment_date: string | null
          id: string
          organization_id: string
          package_price: number | null
          resort_hotel: string | null
          start_date: string | null
          status: string | null
          supplier: string | null
          trip_name: string | null
          updated_at: string
        }
        Insert: {
          adults?: number | null
          assigned_advisor_id?: string | null
          booking_number?: string | null
          children?: number | null
          client_id: string
          commission_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          end_date?: string | null
          final_payment_date?: string | null
          id?: string
          organization_id: string
          package_price?: number | null
          resort_hotel?: string | null
          start_date?: string | null
          status?: string | null
          supplier?: string | null
          trip_name?: string | null
          updated_at?: string
        }
        Update: {
          adults?: number | null
          assigned_advisor_id?: string | null
          booking_number?: string | null
          children?: number | null
          client_id?: string
          commission_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          end_date?: string | null
          final_payment_date?: string | null
          id?: string
          organization_id?: string
          package_price?: number | null
          resort_hotel?: string | null
          start_date?: string | null
          status?: string | null
          supplier?: string | null
          trip_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: {
        Args: { invitation_token: string }
        Returns: undefined
      }
      add_client_portal_payment_credential: {
        Args: {
          authorization_purpose: string
          authorized_maximum: number
          card_brand: string
          card_expiration_month: number
          card_expiration_year: number
          card_last_four: string
          consent_terms_version: string
          label: string
          pan_reference: string
          portal_token: string
          supplier_name: string
          volatile_cvc_reference: string
        }
        Returns: string
      }
      add_encrypted_payment_credential: {
        Args: {
          authorization_purpose: string
          authorized_maximum: number
          card_brand: string
          card_expiration_month: number
          card_expiration_year: number
          card_last_four: string
          consent_terms_version: string
          cvc_ciphertext_base64: string
          label: string
          pan_ciphertext_base64: string
          portal_token: string
          supplier_name: string
        }
        Returns: string
      }
      approve_organization_join_request: {
        Args: {
          assign_role: Database["public"]["Enums"]["app_role"]
          request_id: string
        }
        Returns: string
      }
      create_organization: {
        Args: { organization_name: string }
        Returns: string
      }
      create_team_invitation: {
        Args: {
          invite_email: string
          invite_role: Database["public"]["Enums"]["app_role"]
          target_organization_id: string
        }
        Returns: {
          invitation_expires_at: string
          invitation_id: string
          invitation_token: string
        }[]
      }
      delete_client_intake_celebration: {
        Args: { celebration_id: string; intake_token: string }
        Returns: Json
      }
      delete_client_intake_loyalty_program: {
        Args: { intake_token: string; program_id: string }
        Returns: Json
      }
      delete_client_intake_traveler: {
        Args: { intake_token: string; traveler_id: string }
        Returns: Json
      }
      deny_organization_join_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      get_client_intake_profile: {
        Args: { intake_token: string }
        Returns: Json
      }
      get_client_portal: { Args: { portal_token: string }; Returns: Json }
      get_my_pending_join_request: {
        Args: never
        Returns: {
          organization_name: string
          request_id: string
          status: string
        }[]
      }
      get_organization_team: {
        Args: { target_organization_id: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          membership_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_proxy_payment_credential: {
        Args: { target_credential_id: string }
        Returns: Json
      }
      get_team_invitation: {
        Args: { invitation_token: string }
        Returns: {
          email: string
          expires_at: string
          is_valid: boolean
          organization_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_org_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          target_organization_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      list_organization_join_requests: {
        Args: { target_organization_id: string }
        Returns: {
          created_at: string
          request_id: string
          requester_email: string
        }[]
      }
      list_team_invitations: {
        Args: { target_organization_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          invitation_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      record_trip_quote_option_interaction: {
        Args: {
          interaction_type: string
          portal_token: string
          target_option_id: string
          target_quote_id: string
        }
        Returns: Json
      }
      record_trip_quote_view: {
        Args: {
          portal_token: string
          target_quote_id: string
          time_on_page_seconds: number
        }
        Returns: Json
      }
      request_join_organization: {
        Args: { target_organization_id: string }
        Returns: undefined
      }
      respond_to_trip_quote: {
        Args: {
          client_response: string
          portal_token: string
          target_quote_id: string
        }
        Returns: Json
      }
      revoke_team_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      search_organizations: {
        Args: { query: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      submit_client_intake_contact: {
        Args: {
          address_line1: string
          address_line2: string
          city: string
          country: string
          email: string
          first_name: string
          intake_token: string
          last_name: string
          phone: string
          postal_code: string
          state_province: string
        }
        Returns: Json
      }
      submit_client_intake_preferences: {
        Args: {
          favorite_airlines: string[]
          favorite_cruise_lines: string[]
          favorite_resorts: string[]
          intake_token: string
          room_preferences: string
          travel_style: string
        }
        Returns: Json
      }
      update_team_member_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_membership_id: string
        }
        Returns: undefined
      }
      upsert_client_intake_celebration: {
        Args: {
          celebration_id: string
          intake_token: string
          notes: string
          occasion: string
          occasion_date: string
          recurring_annually: boolean
        }
        Returns: Json
      }
      upsert_client_intake_loyalty_program: {
        Args: {
          intake_token: string
          member_number: string
          program_id: string
          program_name: string
          program_type: string
          traveler_id: string
        }
        Returns: Json
      }
      upsert_client_intake_traveler: {
        Args: {
          accessibility_needs: string
          date_of_birth: string
          dietary_restrictions: string
          full_name: string
          global_entry_number: string
          intake_token: string
          needs_stroller: boolean
          passport_country: string
          passport_expiration: string
          passport_number: string
          relationship: string
          traveler_id: string
          tsa_precheck_number: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "advisor"
        | "assistant"
        | "finance"
        | "read_only"
      billing_invoice_status:
        | "draft"
        | "open"
        | "paid"
        | "uncollectible"
        | "void"
      billing_subscription_status:
        | "not_started"
        | "trialing"
        | "active"
        | "past_due"
        | "unpaid"
        | "paused"
        | "incomplete"
        | "incomplete_expired"
        | "canceled"
      payment_credential_status: "active" | "revoked" | "expired"
      payment_credential_type: "card" | "gift_card"
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
      app_role: [
        "owner",
        "admin",
        "advisor",
        "assistant",
        "finance",
        "read_only",
      ],
      billing_invoice_status: [
        "draft",
        "open",
        "paid",
        "uncollectible",
        "void",
      ],
      billing_subscription_status: [
        "not_started",
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "paused",
        "incomplete",
        "incomplete_expired",
        "canceled",
      ],
      payment_credential_status: ["active", "revoked", "expired"],
      payment_credential_type: ["card", "gift_card"],
    },
  },
} as const
