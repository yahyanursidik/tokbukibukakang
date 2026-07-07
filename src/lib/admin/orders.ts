import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database, OrderStatus, PaymentStatus } from '@/lib/supabase/client';
import type { AdminPagination, PaginatedResult } from '@/lib/admin/pagination';

export type { OrderStatus, PaymentStatus } from '@/lib/supabase/client';

export const orderStatusOptions: OrderStatus[] = ['new', 'processing', 'packed', 'shipped', 'completed', 'canceled'];
export const paymentStatusOptions: PaymentStatus[] = [
  'waiting',
  'waiting_verification',
  'confirmed',
  'rejected',
  'refunded'
];

export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type PaymentConfirmationRow = Database['public']['Tables']['payment_confirmations']['Row'];
export type InvoiceLogRow = Database['public']['Tables']['invoice_logs']['Row'];
export type PaymentConfirmationWithOrder = PaymentConfirmationRow & {
  order?: Pick<OrderRow, 'id' | 'order_number' | 'customer_name' | 'customer_phone' | 'payment_status' | 'status' | 'total'>;
};

export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value));

export const statusLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const cleanSearch = (value: string) => value.trim().replace(/[,%]/g, '');

export const getAdminOverview = async () => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const orders = data ?? [];

  return {
    totalOrders: orders.length,
    waitingPayment: orders.filter((order) => order.payment_status === 'waiting').length,
    waitingVerification: orders.filter((order) => order.payment_status === 'waiting_verification').length,
    confirmedPayments: orders.filter((order) => order.payment_status === 'confirmed').length,
    recentOrders: orders.slice(0, 6)
  };
};

export const listAdminOrders = async (filters: {
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
  pagination: AdminPagination;
}): Promise<PaginatedResult<OrderRow>> => {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(filters.pagination.from, filters.pagination.to);

  if (orderStatusOptions.includes(filters.orderStatus as OrderStatus)) {
    query = query.eq('status', filters.orderStatus as OrderStatus);
  }

  if (paymentStatusOptions.includes(filters.paymentStatus as PaymentStatus)) {
    query = query.eq('payment_status', filters.paymentStatus as PaymentStatus);
  }

  const search = cleanSearch(filters.search ?? '');
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: data ?? [],
    total: count ?? 0
  };
};

export const getAdminOrderDetail = async (id: string) => {
  const supabase = createSupabaseServerClient();
  const [orderResult, itemsResult, confirmationsResult] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*').eq('order_id', id).order('created_at', { ascending: true }),
    supabase.from('payment_confirmations').select('*').eq('order_id', id).order('created_at', { ascending: false })
  ]);

  if (orderResult.error) {
    throw new Error(orderResult.error.message);
  }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }

  if (confirmationsResult.error) {
    throw new Error(confirmationsResult.error.message);
  }

  return {
    order: orderResult.data,
    items: itemsResult.data ?? [],
    confirmations: confirmationsResult.data ?? []
  };
};

export const listAdminPaymentConfirmations = async (filters: {
  status?: string;
  search?: string;
  pagination: AdminPagination;
}): Promise<PaginatedResult<PaymentConfirmationWithOrder>> => {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from('payment_confirmations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(filters.pagination.from, filters.pagination.to);

  if (paymentStatusOptions.includes(filters.status as PaymentStatus)) {
    query = query.eq('status', filters.status as PaymentStatus);
  }

  const search = cleanSearch(filters.search ?? '');
  if (search) {
    const { data: matchingOrders, error: matchingOrdersError } = await supabase
      .from('orders')
      .select('id')
      .or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
      .limit(100);

    if (matchingOrdersError) {
      throw new Error(matchingOrdersError.message);
    }

    const orderIds = (matchingOrders ?? []).map((order) => order.id);
    const searchFilters = [`sender_name.ilike.%${search}%`, `bank_name.ilike.%${search}%`];

    if (orderIds.length > 0) {
      searchFilters.push(`order_id.in.(${orderIds.join(',')})`);
    }

    query = query.or(searchFilters.join(','));
  }

  const { data: confirmations, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const orderIds = [...new Set((confirmations ?? []).map((confirmation) => confirmation.order_id))];

  if (orderIds.length === 0) {
    return {
      items: [],
      total: count ?? 0
    };
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, payment_status, status, total')
    .in('id', orderIds);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orderMap = new Map((orders ?? []).map((order) => [order.id, order]));

  return {
    items: (confirmations ?? []).map((confirmation) => ({
      ...confirmation,
      order: orderMap.get(confirmation.order_id)
    })) satisfies PaymentConfirmationWithOrder[],
    total: count ?? 0
  };
};

export const updateOrderStatus = async (
  id: string,
  values: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }
) => {
  const supabase = createSupabaseServerClient();
  const updateValues: Database['public']['Tables']['orders']['Update'] = {};

  if (values.status) {
    updateValues.status = values.status;
  }

  if (values.paymentStatus) {
    updateValues.payment_status = values.paymentStatus;
  }

  const { error } = await supabase.from('orders').update(updateValues).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const updatePaymentConfirmationStatus = async (
  id: string,
  status: Extract<PaymentStatus, 'confirmed' | 'rejected'>
) => {
  const supabase = createSupabaseServerClient();
  const { data: confirmation, error: confirmationError } = await supabase
    .from('payment_confirmations')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (confirmationError) {
    throw new Error(confirmationError.message);
  }

  const { error: orderError } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', confirmation.order_id);

  if (orderError) {
    throw new Error(orderError.message);
  }
};

const trimOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const createAdminManualOrder = async (values: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  notes?: string;
  shippingCost: number;
  items: { bookSlug: string; quantity: number }[];
}) => {
  const customerName = values.customerName.trim();
  const customerPhone = values.customerPhone.trim();
  const customerAddress = values.customerAddress.trim();
  const shippingCost = Number(values.shippingCost);

  if (!customerName) {
    throw new Error('Nama customer wajib diisi.');
  }

  if (!customerPhone) {
    throw new Error('Nomor WhatsApp wajib diisi.');
  }

  if (!customerAddress) {
    throw new Error('Alamat customer wajib diisi.');
  }

  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    throw new Error('Ongkir tidak valid.');
  }

  const selectedItems = values.items
    .map((item) => ({
      bookSlug: item.bookSlug.trim(),
      quantity: Math.max(0, Math.floor(Number(item.quantity)))
    }))
    .filter((item) => item.bookSlug && item.quantity > 0);

  if (selectedItems.length === 0) {
    throw new Error('Pilih minimal satu buku untuk invoice.');
  }

  const supabase = createSupabaseServerClient();
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('slug, title, price, is_active')
    .in('slug', selectedItems.map((item) => item.bookSlug));

  if (booksError) {
    throw new Error(booksError.message);
  }

  const bookMap = new Map((books ?? []).filter((book) => book.is_active).map((book) => [book.slug, book]));
  const itemPayload = selectedItems.map((item) => {
    const book = bookMap.get(item.bookSlug);

    if (!book) {
      throw new Error(`Buku ${item.bookSlug} tidak ditemukan atau tidak aktif.`);
    }

    return {
      book_slug: book.slug,
      title: book.title,
      price: book.price,
      quantity: item.quantity
    };
  });

  const { data, error } = await supabase
    .rpc('create_manual_checkout_order', {
      order_payload: {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: trimOptional(values.customerEmail),
        customer_address: customerAddress,
        notes: trimOptional(values.notes),
        shipping_cost: shippingCost
      },
      item_payload: itemPayload
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Invoice belum berhasil dibuat.');
  }

  return data;
};

export const createInvoiceLog = async (values: {
  orderId: string;
  recipient: string;
  message: string;
  channel?: string;
}) => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('invoice_logs').insert({
    order_id: values.orderId,
    recipient: values.recipient,
    message: values.message,
    channel: values.channel ?? 'whatsapp'
  });

  if (error) {
    throw new Error(error.message);
  }
};
