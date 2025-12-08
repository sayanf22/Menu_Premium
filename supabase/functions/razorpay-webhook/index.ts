import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    const expectedSignature = createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    const eventId = payload.event_id || `${payload.event}-${Date.now()}`;
    const eventType = payload.event;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabaseAdmin
      .from("razorpay_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (existingEvent) {
      console.log("Duplicate event, skipping:", eventId);
      return new Response(JSON.stringify({ status: "duplicate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store event for idempotency
    await supabaseAdmin.from("razorpay_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      payload: payload,
    });

    // Handle different event types
    switch (eventType) {
      case "subscription.activated":
        await handleSubscriptionActivated(supabaseAdmin, payload);
        break;

      case "subscription.charged":
        await handleSubscriptionCharged(supabaseAdmin, payload);
        break;

      case "subscription.pending":
        await handleSubscriptionPending(supabaseAdmin, payload);
        break;

      case "subscription.halted":
        await handleSubscriptionHalted(supabaseAdmin, payload);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(supabaseAdmin, payload);
        break;

      case "payment.captured":
        await handlePaymentCaptured(supabaseAdmin, payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(supabaseAdmin, payload);
        break;

      default:
        console.log("Unhandled event type:", eventType);
    }

    return new Response(JSON.stringify({ status: "processed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionActivated(supabase: any, payload: any) {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!subscriptionId) return;

  const now = new Date();
  const subscription = payload.payload?.subscription?.entity;

  await supabase
    .from("user_subscriptions")
    .update({
      status: "active",
      current_period_start: subscription?.current_start
        ? new Date(subscription.current_start * 1000).toISOString()
        : now.toISOString(),
      current_period_end: subscription?.current_end
        ? new Date(subscription.current_end * 1000).toISOString()
        : null,
      updated_at: now.toISOString(),
    })
    .eq("razorpay_subscription_id", subscriptionId);

  console.log("✅ Subscription activated:", subscriptionId);
}

async function handleSubscriptionCharged(supabase: any, payload: any) {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  const payment = payload.payload?.payment?.entity;

  if (!subscriptionId || !payment) return;

  // Get subscription to find user
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("id, user_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .single();

  if (sub) {
    // Record payment
    await supabase.from("payment_transactions").insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      razorpay_payment_id: payment.id,
      razorpay_subscription_id: subscriptionId,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: "captured",
      payment_method: payment.method,
    });

    // Update period end
    const subscription = payload.payload?.subscription?.entity;
    if (subscription?.current_end) {
      await supabase
        .from("user_subscriptions")
        .update({
          current_period_end: new Date(subscription.current_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
    }
  }

  console.log("✅ Subscription charged:", subscriptionId);
}

async function handleSubscriptionPending(supabase: any, payload: any) {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!subscriptionId) return;

  await supabase
    .from("user_subscriptions")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", subscriptionId);

  console.log("⏳ Subscription pending:", subscriptionId);
}

async function handleSubscriptionHalted(supabase: any, payload: any) {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!subscriptionId) return;

  await supabase
    .from("user_subscriptions")
    .update({
      status: "halted",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", subscriptionId);

  console.log("⚠️ Subscription halted:", subscriptionId);
}

async function handleSubscriptionCancelled(supabase: any, payload: any) {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!subscriptionId) return;

  await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", subscriptionId);

  console.log("❌ Subscription cancelled:", subscriptionId);
}

async function handlePaymentCaptured(supabase: any, payload: any) {
  const payment = payload.payload?.payment?.entity;
  if (!payment) return;

  // Check if this payment is already recorded
  const { data: existing } = await supabase
    .from("payment_transactions")
    .select("id")
    .eq("razorpay_payment_id", payment.id)
    .single();

  if (!existing && payment.notes?.user_id) {
    await supabase.from("payment_transactions").insert({
      user_id: payment.notes.user_id,
      razorpay_payment_id: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: "captured",
      payment_method: payment.method,
    });
  }

  console.log("✅ Payment captured:", payment.id);
}

async function handlePaymentFailed(supabase: any, payload: any) {
  const payment = payload.payload?.payment?.entity;
  if (!payment) return;

  if (payment.notes?.user_id) {
    await supabase.from("payment_transactions").insert({
      user_id: payment.notes.user_id,
      razorpay_payment_id: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: "failed",
      payment_method: payment.method,
      metadata: {
        error_code: payment.error_code,
        error_description: payment.error_description,
      },
    });
  }

  console.log("❌ Payment failed:", payment.id);
}
