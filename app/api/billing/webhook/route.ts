import type Stripe from "stripe";
import { createStripeClient, getStripeBillingConfig, stripeStatusToLocal, subscriptionPeriodEnd } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const stripe = createStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, getStripeBillingConfig().webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const organizationId = session.client_reference_id || session.metadata?.scout_organization_id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (organizationId && customerId) {
      const { error } = await admin.from("organization_billing").upsert({
        organization_id: organizationId,
        provider_customer_id: customerId,
        provider_subscription_id: subscriptionId ?? null,
        advisor_seat_quantity: Number(session.metadata?.advisor_seats ?? 0),
      });
      if (error) return Response.json({ error: "Billing state could not be saved" }, { status: 500 });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const organizationId = subscription.metadata.scout_organization_id;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    if (organizationId) {
      const { error } = await admin.from("organization_billing").upsert({
        organization_id: organizationId,
        provider_customer_id: customerId,
        provider_subscription_id: subscription.id,
        status: stripeStatusToLocal((subscription.status ?? "incomplete") as Stripe.Subscription.Status),
        current_period_end: subscriptionPeriodEnd(subscription),
        cancel_at_period_end: subscription.cancel_at_period_end,
      });
      if (error) return Response.json({ error: "Billing state could not be saved" }, { status: 500 });
    }
  }

  if (
    event.type === "invoice.created" ||
    event.type === "invoice.finalized" ||
    event.type === "invoice.updated" ||
    event.type === "invoice.payment_succeeded" ||
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.voided"
  ) {
    const invoice = event.data.object as Stripe.Invoice & {
      metadata?: Record<string, string>;
      subscription?: string | { id: string } | null;
      charge?: string | { id: string } | null;
      payment_intent?: string | null;
    };
    const organizationId = invoice.metadata?.scout_organization_id;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
    if (organizationId) {
      const { data: savedInvoice, error } = await admin
        .from("organization_billing_invoices")
        .upsert({
          organization_id: organizationId,
          provider_invoice_id: invoice.id,
          provider_subscription_id: subscriptionId,
          status: mapInvoiceStatus(invoice.status),
          currency: invoice.currency ?? "usd",
          amount_due: normalizeStripeAmount(invoice.amount_due),
          amount_paid: normalizeStripeAmount(invoice.amount_paid),
          amount_remaining: normalizeStripeAmount(invoice.amount_remaining),
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf: invoice.invoice_pdf ?? null,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
          paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
        }, { onConflict: "provider_invoice_id" })
        .select("id")
        .maybeSingle();
      if (error || !savedInvoice) return Response.json({ error: "Billing invoice could not be saved" }, { status: 500 });

      if (event.type === "invoice.payment_succeeded") {
        const paymentId = typeof invoice.charge === "string"
          ? invoice.charge
          : typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : null;
        if (paymentId) {
          const { error: paymentError } = await admin.from("organization_billing_payments").upsert({
            organization_id: organizationId,
            invoice_id: savedInvoice.id,
            provider_payment_id: paymentId,
            amount: normalizeStripeAmount(invoice.amount_paid),
            currency: invoice.currency ?? "usd",
            paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
          }, { onConflict: "provider_payment_id" });
          if (paymentError) return Response.json({ error: "Billing payment could not be saved" }, { status: 500 });
        }
      }
    }
  }
  return Response.json({ received: true });
}

function normalizeStripeAmount(amount: number | null | undefined) {
  return Number(((amount ?? 0) / 100).toFixed(2));
}

function mapInvoiceStatus(status: Stripe.Invoice.Status | string | null | undefined): "draft" | "open" | "paid" | "uncollectible" | "void" {
  if (status === "draft" || status === "open" || status === "paid" || status === "uncollectible" || status === "void") {
    return status as "draft" | "open" | "paid" | "uncollectible" | "void";
  }
  return "open";
}
