import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type PaymentConfirmationValues = {
  invoiceNumber: string;
  whatsappNumber: string;
  senderAccountName: string;
  bankName: string;
  transferAmount: number;
  transferDate: string;
  note?: string;
  proofUrl?: string;
};

export type PaymentConfirmationResult = {
  orderId: string;
  orderNumber: string;
  confirmationId: string;
  paymentStatus: string;
  total: number;
  duplicate: boolean;
};

const cleanOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const confirmManualPayment = async (
  values: PaymentConfirmationValues
): Promise<PaymentConfirmationResult> => {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .rpc('confirm_manual_payment', {
      confirmation_payload: {
        invoice_number: values.invoiceNumber.trim(),
        whatsapp_number: values.whatsappNumber.trim(),
        sender_account_name: values.senderAccountName.trim(),
        bank_name: values.bankName.trim(),
        transfer_amount: values.transferAmount,
        transfer_date: values.transferDate,
        note: cleanOptional(values.note),
        proof_url: cleanOptional(values.proofUrl)
      }
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Konfirmasi pembayaran belum berhasil disimpan.');
  }

  return {
    orderId: data.order_id,
    orderNumber: data.order_number,
    confirmationId: data.confirmation_id,
    paymentStatus: data.payment_status,
    total: data.total,
    duplicate: data.duplicate
  };
};
