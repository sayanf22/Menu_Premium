import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentId, subscriptionId, signature } = await req.json();

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature
    const generatedSignature = createHmac("sha256", razorpayKeySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    if (generatedSignature !== signature) {
      console.error("Signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Razorpay API
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
    });

    const paymentData = await paymentResponse.json();
    if (!["captured", "authorized"].includes(paymentData.status)) {
      return new Response(JSON.stringify({ error: "Payment not successful" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for database writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let updateData: any = {};

    // Check if this is an upgrade (pending fields are set)
    if (subscription.pending_plan_id && subscription.pending_razorpay_subscription_id === subscriptionId) {
      // Cancel old Razorpay subscription
      if (subscription.razorpay_subscription_id) {
        try {
          await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
            },
          });
        } catch (e) {
          console.error("Failed to cancel old subscription:", e);
        }
      }

      // Move pending to active
      updateData = {
        plan_id: subscription.pending_plan_id,
        razorpay_subscription_id: subscription.pending_razorpay_subscription_id,
        billing_cycle: subscription.pending_billing_cycle,
        pending_plan_id: null,
        pending_razorpay_subscription_id: null,
        pending_billing_cycle: null,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: calculatePeriodEnd(now, subscription.pending_billing_cycle).toISOString(),
        updated_at: now.toISOString(),
      };
    } else {
      // Regular activation
      updateData = {
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: calculatePeriodEnd(now, subscription.billing_cycle).toISOString(),
        updated_at: now.toISOString(),
      };
    }

    // Update subscription
    await supabaseAdmin
      .from("user_subscriptions")
      .update(updateData)
      .eq("id", subscription.id);

    // Record payment transaction
    await supabaseAdmin.from("payment_transactions").insert({
      user_id: user.id,
      subscription_id: subscription.id,
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
      amount: paymentData.amount / 100, // Convert from paise
      currency: paymentData.currency,
      status: "captured",
      payment_method: paymentData.method,
      metadata: {
        order_id: paymentData.order_id,
        email: paymentData.email,
      },
    });

    // Update restaurant's subscription plan
    if (subscription.restaurant_id) {
      const planId = updateData.plan_id || subscription.plan_id;
      await supabaseAdmin
        .from("restaurants")
        .update({ subscription_plan_id: planId })
        .eq("id", subscription.restaurant_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calculatePeriodEnd(start: Date, billingCycle: string): Date {
  const end = new Date(start);
  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}
