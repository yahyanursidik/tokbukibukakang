import type { Database } from '@/lib/supabase/client';

export type BookRow = Database['public']['Tables']['books']['Row'];
export type PoPeriodRow = Database['public']['Tables']['po_periods']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type CustomerOverviewRow = Database['public']['Views']['customer_overview']['Row'];
export type CustomerInteractionRow = Database['public']['Tables']['customer_interactions']['Row'];
export type EmailLogRow = Database['public']['Tables']['email_logs']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type PaymentConfirmationRow = Database['public']['Tables']['payment_confirmations']['Row'];
export type PaymentSettingsRow = Database['public']['Tables']['payment_settings']['Row'];

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
};
