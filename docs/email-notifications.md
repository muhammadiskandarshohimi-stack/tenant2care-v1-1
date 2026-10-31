# Tenant2Care Notification Email Delivery

Sender: notifications@prgpro.com.my (after domain verification)

## Data flow
- Property-selected landlord announcements and automatic application/receipt status notifications are stored in public.app_notifications.
- The app_notification_email_enqueue database trigger queues notifications for accounts with confirmed addresses in public.notification_email_outbox.
- The queue automatically inherits the same property-recipient authorization as the corresponding in-app notification. No cross-property broadcast is generated.
- The private Supabase Edge Function dispatch-notification-emails sends bilingual English / Malay transactional messages via Resend, with database retry state and provider idempotency.
- The Edge Function is service-role protected. Do not call it from the browser or expose the service-role key.

## Activation (required before real email is sent)
1. Verify prgpro.com.my DKIM and SPF DNS records in Resend. Current verification was pending at implementation time.
2. In the Supabase dashboard, open Edge Functions > Secrets for the same project and configure RESEND_API_KEY, EMAIL_FROM_ADDRESS="Tenant2Care <notifications@prgpro.com.my>", and EMAIL_ALERTS_ENABLED=true. Do not save the actual Resend token in GitHub or any NEXT_PUBLIC_* variable.
3. Configure a scheduled trusted invocation every 1–5 minutes in Supabase Cron/pg_net using a securely stored service-role credential (for example, a Supabase Vault secret). The endpoint is POST https://vbtlzmqvvpegcvzcvusd.supabase.co/functions/v1/dispatch-notification-emails and requires the service-role bearer token. Do not schedule until domain verification and secrets are ready.
4. Submit a real notification to an authorized test tenant, invoke the dispatcher through a privileged scheduler, then confirm status in public.notification_email_outbox and delivery in Resend.
5. Monitor failures and quota. Queue batches are limited to ten; failed emails are retried up to five times.
6. Do not assume that domain verification or a deployed Edge Function alone activates sending. Email delivery has not been end-to-end tested.

## Security
- No database or API key is embedded in frontend code.
- Email recipient addresses are retrieved only by a server-side service-role operation.
- Notifications are created by authenticated landlord/property-scoped operations and controlled database triggers; no arbitrary recipient email may be submitted by the browser.
- External emails include only short notification text and a login-protected Tenant2Care link, never attached IC photos, receipts, identity numbers, or bank details.
