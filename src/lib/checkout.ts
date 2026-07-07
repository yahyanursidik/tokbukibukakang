import type { CartItem } from '@/lib/cart';
import { getSubtotal } from '@/lib/cart';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const CHECKOUT_ORDER_STORAGE_KEY = 'ibu-kakang-latest-order';

export const bankTransferInfo = {
  bankName: 'Bank Syariah Indonesia',
  accountNumber: '0000000000',
  accountName: 'Ibu Kakang BookStore'
} as const;

export type CheckoutFormValues = {
  customerName: string;
  whatsappNumber: string;
  email?: string;
  fullAddress: string;
  city: string;
  province: string;
  postalCode?: string;
  shippingNote?: string;
  orderNote?: string;
};

export type ManualCheckoutResult = {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentStatus: string;
};

export type StoredCheckoutOrder = ManualCheckoutResult & {
  customerName: string;
  whatsappNumber: string;
  email?: string;
  shippingAddress: string;
  notes?: string;
  items: CartItem[];
  createdAt: string;
};

const trimOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const buildShippingAddress = (values: CheckoutFormValues) => {
  const cityLine = [values.city.trim(), values.province.trim()]
    .filter(Boolean)
    .join(', ');
  const postalLine = trimOptional(values.postalCode);

  return [values.fullAddress.trim(), cityLine, postalLine].filter(Boolean).join('\n');
};

export const buildOrderNotes = (values: CheckoutFormValues) =>
  [
    trimOptional(values.shippingNote) ? `Catatan pengiriman: ${values.shippingNote?.trim()}` : undefined,
    trimOptional(values.orderNote) ? `Catatan pesanan: ${values.orderNote?.trim()}` : undefined
  ]
    .filter(Boolean)
    .join('\n');

export const createManualCheckoutOrder = async (
  values: CheckoutFormValues,
  items: CartItem[]
): Promise<ManualCheckoutResult> => {
  const supabase = getSupabaseBrowserClient();
  const subtotal = getSubtotal(items);
  const shippingAddress = buildShippingAddress(values);
  const notes = buildOrderNotes(values);

  const { data, error } = await supabase
    .rpc('create_manual_checkout_order', {
      order_payload: {
        customer_name: values.customerName.trim(),
        customer_phone: values.whatsappNumber.trim(),
        customer_email: trimOptional(values.email) ?? null,
        customer_address: shippingAddress,
        notes: notes || null,
        subtotal,
        shipping_cost: 0
      },
      item_payload: items.map((item) => ({
        book_slug: item.slug,
        title: item.title,
        price: item.price,
        quantity: item.quantity
      }))
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Order belum berhasil dibuat. Silakan coba lagi.');
  }

  return {
    orderId: data.order_id,
    orderNumber: data.order_number,
    subtotal: data.subtotal,
    shippingCost: data.shipping_cost,
    total: data.total,
    paymentStatus: data.payment_status
  };
};
