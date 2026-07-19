-- Distinguish initial invoices, resends, and payment reminders in email history.

alter table public.email_logs
drop constraint if exists email_logs_email_type_check;

alter table public.email_logs
add constraint email_logs_email_type_check
check (email_type in ('invoice', 'invoice_resend', 'payment_reminder', 'follow_up'));
