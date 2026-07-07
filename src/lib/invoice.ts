import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPaymentSettings } from '@/lib/admin/settings';

export const getInvoiceByToken = async (token: string) => {
  const supabase = createSupabaseServerClient();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('invoice_token', token)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const settings = await getPaymentSettings();

  return {
    order,
    items: items ?? [],
    settings
  };
};
