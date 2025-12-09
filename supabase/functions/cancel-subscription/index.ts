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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, razorpay_subscription_id, status, current_period_end")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "No subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subscription.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Subscription already cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel on Razorpay IMMEDIATELY (no refund)
    if (subscription.razorpay_subscription_id) {
      const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
      const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

      if (razorpayKeyId && razorpayKeySecret) {
        const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        
        // Cancel immediately (cancel_at_cycle_end = 0)
        await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cancel_at_cycle_end: 0 }),
          }
        );
      }
    }

    // Update subscription to CANCELLED immediately - service stops now
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    // Log the cancellation
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("user_id", user.id)
      .single();

    await supabase.from("admin_actions_log").insert({
      admin_email: user.email || "user",
      action_type: "subscription_cancelled_by_user",
      restaurant_id: restaurant?.id,
      details: {
        subscription_id: subscription.id,
        razorpay_subscription_id: subscription.razorpay_subscription_id,
        remaining_days: subscription.current_period_end 
          ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
        no_refund: true,
        restaurant_name: restaurant?.name,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription cancelled. Your service has been deactivated. No refunds are provided for cancellations.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
