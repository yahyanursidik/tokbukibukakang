import { createClient } from '@supabase/supabase-js';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderStatus = 'new' | 'processing' | 'packed' | 'shipped' | 'completed' | 'canceled';
export type PaymentStatus = 'waiting' | 'waiting_verification' | 'confirmed' | 'rejected' | 'refunded';
export type StockType = 'preorder' | 'ready_stock';
export type ReviewSourceType = 'original' | 'external_summary';
export type PoPeriodStatus = 'draft' | 'open' | 'closed' | 'archived';
type NoRelationships = [];

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          slug: string;
          subtitle: string | null;
          author: string | null;
          publisher: string | null;
          age_min: number;
          age_max: number;
          categories: string[];
          themes: string[];
          price: number;
          original_price: number | null;
          cover_image: string;
          gallery_images: string[];
          short_description: string;
          review_summary: string;
          parent_notes: string;
          manhaj_notes: string;
          stock_type: StockType;
          is_active: boolean;
          featured: boolean;
          external_review_sources: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          subtitle?: string | null;
          author?: string | null;
          publisher?: string | null;
          age_min: number;
          age_max: number;
          categories?: string[];
          themes?: string[];
          price?: number;
          original_price?: number | null;
          cover_image: string;
          gallery_images?: string[];
          short_description: string;
          review_summary: string;
          parent_notes: string;
          manhaj_notes: string;
          stock_type: StockType;
          is_active?: boolean;
          featured?: boolean;
          external_review_sources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['books']['Insert']>;
        Relationships: NoRelationships;
      };
      reviews: {
        Row: {
          id: string;
          title: string;
          slug: string;
          book_slug: string;
          summary: string;
          content: string;
          source_type: ReviewSourceType;
          source_name: string | null;
          source_url: string | null;
          reviewer_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          book_slug: string;
          summary: string;
          content: string;
          source_type: ReviewSourceType;
          source_name?: string | null;
          source_url?: string | null;
          reviewer_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: NoRelationships;
      };
      po_periods: {
        Row: {
          id: string;
          title: string;
          slug: string;
          start_date: string;
          end_date: string;
          estimated_shipping_date: string;
          status: PoPeriodStatus;
          description: string;
          book_slugs: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          start_date: string;
          end_date: string;
          estimated_shipping_date: string;
          status: PoPeriodStatus;
          description: string;
          book_slugs?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['po_periods']['Insert']>;
        Relationships: NoRelationships;
      };
      pages: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description: string;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pages']['Insert']>;
        Relationships: NoRelationships;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          invoice_token: string;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          customer_address: string | null;
          notes: string | null;
          status: OrderStatus;
          payment_status: PaymentStatus;
          subtotal: number;
          shipping_cost: number;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          invoice_token?: string;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          customer_address?: string | null;
          notes?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          subtotal?: number;
          shipping_cost?: number;
          total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: NoRelationships;
      };
      payment_settings: {
        Row: {
          id: boolean;
          bank_name: string | null;
          account_number: string | null;
          account_holder: string | null;
          qris_image_url: string | null;
          qris_note: string | null;
          whatsapp_admin_phone: string | null;
          payment_confirmation_notes: string | null;
          invoice_footer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          bank_name?: string | null;
          account_number?: string | null;
          account_holder?: string | null;
          qris_image_url?: string | null;
          qris_note?: string | null;
          whatsapp_admin_phone?: string | null;
          payment_confirmation_notes?: string | null;
          invoice_footer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payment_settings']['Insert']>;
        Relationships: NoRelationships;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          book_slug: string;
          title: string;
          price: number;
          quantity: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          book_slug: string;
          title: string;
          price: number;
          quantity: number;
          subtotal?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: NoRelationships;
      };
      payment_confirmations: {
        Row: {
          id: string;
          order_id: string;
          sender_name: string;
          bank_name: string | null;
          amount: number;
          transfer_date: string;
          proof_url: string | null;
          status: PaymentStatus;
          customer_note: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          sender_name: string;
          bank_name?: string | null;
          amount: number;
          transfer_date: string;
          proof_url?: string | null;
          status?: PaymentStatus;
          customer_note?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payment_confirmations']['Insert']>;
        Relationships: NoRelationships;
      };
      invoice_logs: {
        Row: {
          id: string;
          order_id: string;
          channel: string;
          recipient: string;
          message: string;
          sent_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          channel: string;
          recipient: string;
          message: string;
          sent_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invoice_logs']['Insert']>;
        Relationships: NoRelationships;
      };
      admin_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_profiles']['Insert']>;
        Relationships: NoRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_manual_checkout_order: {
        Args: {
          order_payload: Json;
          item_payload: Json;
        };
        Returns: {
          order_id: string;
          order_number: string;
          subtotal: number;
          shipping_cost: number;
          total: number;
          payment_status: PaymentStatus;
        }[];
      };
      confirm_manual_payment: {
        Args: {
          confirmation_payload: Json;
        };
        Returns: {
          order_id: string;
          order_number: string;
          confirmation_id: string;
          payment_status: PaymentStatus;
          total: number;
          duplicate: boolean;
        }[];
      };
    };
  };
};

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase belum dikonfigurasi. Isi PUBLIC_SUPABASE_URL dan PUBLIC_SUPABASE_ANON_KEY terlebih dahulu.');
  }

  browserClient ??= createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return browserClient;
};

export const supabase = isSupabaseConfigured ? getSupabaseBrowserClient() : null;
