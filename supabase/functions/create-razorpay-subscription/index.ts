import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { planId, billingCycle } = await req.json();

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    const period = billingCycle === "yearly" ? "yearly" : "monthly";
    const interval = billingCycle === "yearly" ? 1 : 1;

    // Create or get Razorpay plan
    const razorpayPlanId = await getOrCreateRazorpayPlan(
      razorpayKeyId,
      razorpayKeySecret,
      plan.slug,
      price,
      period,
      interval
    );

    // Create Razorpay subscription
    const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: billingCycle === "yearly" ? 10 : 120, // 10 years or 10 years worth of months
        customer_notify: 1,
        notes: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      }),
    });

    const subscriptionData = await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      console.error("Razorpay subscription error:", subscriptionData);
      return new Response(JSON.stringify({ error: subscriptionData.error?.description || "Failed to create subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for database writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user has existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingSub) {
      if (existingSub.status === "active") {
        // Safe upgrade pattern - store in pending fields
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            pending_plan_id: planId,
            pending_razorpay_subscription_id: subscriptionData.id,
            pending_billing_cycle: billingCycle,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        // Update inactive subscription
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            plan_id: planId,
            razorpay_subscription_id: subscriptionData.id,
            billing_cycle: billingCycle,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id);
      }
    } else {
      // Get restaurant ID
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("user_id", user.id)
        .single();

      // Create new subscription record
      await supabaseAdmin.from("user_subscriptions").insert({
        user_id: user.id,
        restaurant_id: restaurant?.id,
        plan_id: planId,
        razorpay_subscription_id: subscriptionData.id,
        billing_cycle: billingCycle,
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ 
      subscriptionId: subscriptionData.id,
      razorpayKeyId: razorpayKeyId, // Return key for frontend checkout
    }), {
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

async function getOrCreateRazorpayPlan(
  keyId: string,
  keySecret: string,
  planSlug: string,
  amount: number,
  period: string,
  interval: number
): Promise<string> {
  // Try to find existing plan by fetching all plans
  const plansResponse = await fetch("https://api.razorpay.com/v1/plans", {
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
  });

  const plansData = await plansResponse.json();
  const existingPlan = plansData.items?.find(
    (p: any) => p.item?.name === `${planSlug}-${period}` && p.item?.amount === amount * 100
  );

  if (existingPlan) {
    return existingPlan.id;
  }

  // Create new plan
  const createResponse = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({
      period,
      interval,
      item: {
        name: `${planSlug}-${period}`,
        amount: amount * 100, // Convert to paise
        currency: "INR",
        description: `AddMenu ${planSlug} ${period} subscription`,
      },
    }),
  });

  const createData = await createResponse.json();
  if (!createResponse.ok) {
    throw new Error(createData.error?.description || "Failed to create Razorpay plan");
  }

  return createData.id;
}
