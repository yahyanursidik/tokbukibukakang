import { createClient } from '@supabase/supabase-js';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderStatus = 'new' | 'processing' | 'packed' | 'shipped' | 'completed' | 'canceled';
export type PaymentStatus = 'waiting' | 'waiting_verification' | 'confirmed' | 'rejected' | 'refunded';

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string;
          order_number: string;
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
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payment_confirmations']['Insert']>;
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
      };
    };
  };
};

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase public environment variables are not configured yet.');
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
