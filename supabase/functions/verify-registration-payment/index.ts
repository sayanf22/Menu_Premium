import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Security: Hash sensitive data for logging
function hashForLog(data: string): string {
  return createHash("sha256").update(data).digest("hex").substring(0, 16);
}

// Security: Validate Razorpay IDs format
function isValidRazorpayId(id: string, prefix: string): boolean {
  if (!id || typeof id !== "string") return false;
  // Razorpay IDs are alphanumeric with underscores, typically 14-20 chars
  const regex = new RegExp(`^${prefix}_[a-zA-Z0-9]{10,20}$`);
  return regex.test(id);
}

// Security: Validate signature format (hex string)
function isValidSignature(sig: string): boolean {
  if (!sig || typeof sig !== "string") return false;
  return /^[a-f0-9]{64}$/i.test(sig);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Get client IP for rate limiting and logging
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "unknown";
  const ipHash = hashForLog(clientIP);
  const userAgentHash = hashForLog(req.headers.get("user-agent") || "unknown");

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentId, subscriptionId, signature } = body;

    // Validate required fields
    if (!paymentId || !subscriptionId || !signature) {
      return new Response(JSON.stringify({ error: "Missing payment details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate ID formats
    if (!isValidRazorpayId(paymentId, "pay")) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "invalid_payment_id",
        ip_hash: ipHash,
        success: false,
        error_message: "Invalid payment ID format",
      });
      return new Response(JSON.stringify({ error: "Invalid payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidRazorpayId(subscriptionId, "sub")) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "invalid_subscription_id",
        ip_hash: ipHash,
        success: false,
        error_message: "Invalid subscription ID format",
      });
      return new Response(JSON.stringify({ error: "Invalid subscription ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidSignature(signature)) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "invalid_signature_format",
        ip_hash: ipHash,
        success: false,
        error_message: "Invalid signature format",
      });
      return new Response(JSON.stringify({ error: "Invalid signature format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting (10 verify attempts per 10 minutes)
    const { data: rateCheck } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: ipHash,
      p_action_type: "payment_verify",
      p_max_requests: 10,
      p_window_seconds: 600,
      p_block_seconds: 1800,
    });

    if (rateCheck && !rateCheck[0]?.allowed) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "rate_limit_exceeded",
        ip_hash: ipHash,
        success: false,
        error_message: "Rate limit exceeded for payment verification",
      });

      return new Response(JSON.stringify({ 
        error: "Too many verification attempts. Please try again later.",
        retry_after: rateCheck[0]?.blocked_for_seconds || 1800,
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": String(rateCheck[0]?.blocked_for_seconds || 1800),
        },
      });
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeySecret || !razorpayKeyId) {
      console.error("Razorpay credentials not configured");
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CRITICAL: Verify signature using HMAC-SHA256
    const generatedSignature = createHmac("sha256", razorpayKeySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    if (generatedSignature !== signature) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "signature_mismatch",
        ip_hash: ipHash,
        success: false,
        error_message: "Payment signature verification failed",
        metadata: { subscription_id: subscriptionId },
      });

      console.error("Signature mismatch - possible tampering attempt");
      return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CRITICAL: Verify payment status with Razorpay API
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
    });

    if (!paymentResponse.ok) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "razorpay_api_error",
        ip_hash: ipHash,
        success: false,
        error_message: "Failed to verify payment with Razorpay",
      });

      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentData = await paymentResponse.json();
    
    // CRITICAL: Only accept captured or authorized payments
    if (!["captured", "authorized"].includes(paymentData.status)) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "payment_not_successful",
        ip_hash: ipHash,
        success: false,
        error_message: `Payment status: ${paymentData.status}`,
        metadata: { payment_id: paymentId },
      });

      return new Response(JSON.stringify({ error: "Payment not successful" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pending registration
    const { data: pendingReg, error: pendingError } = await supabaseAdmin
      .from("pending_registrations")
      .select("*")
      .eq("razorpay_subscription_id", subscriptionId)
      .eq("status", "pending")
      .single();

    if (pendingError || !pendingReg) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "pending_registration_not_found",
        ip_hash: ipHash,
        success: false,
        error_message: "Registration not found or already processed",
        metadata: { subscription_id: subscriptionId },
      });

      return new Response(JSON.stringify({ error: "Registration not found or expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if registration expired
    if (new Date(pendingReg.expires_at) < new Date()) {
      await supabaseAdmin
        .from("pending_registrations")
        .update({ status: "expired", password_hash: "[EXPIRED]" })
        .eq("id", pendingReg.id);

      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "registration_expired",
        ip_hash: ipHash,
        email_hash: hashForLog(pendingReg.email),
        success: false,
        error_message: "Registration expired",
      });

      return new Response(JSON.stringify({ error: "Registration expired. Please start over." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if password was already cleared (double-submit protection)
    if (pendingReg.password_hash === "[CLEARED]" || pendingReg.password_hash === "[EXPIRED]") {
      return new Response(JSON.stringify({ error: "Registration already processed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user account in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingReg.email,
      password: pendingReg.password_hash,
      email_confirm: true,
      user_metadata: {
        name: pendingReg.restaurant_name,
      },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "auth_creation_failed",
        ip_hash: ipHash,
        email_hash: hashForLog(pendingReg.email),
        success: false,
        error_message: authError.message,
      });

      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Create restaurant profile
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .insert({
        user_id: userId,
        name: pendingReg.restaurant_name,
        email: pendingReg.email,
        description: pendingReg.restaurant_description,
        subscription_plan_id: pendingReg.plan_id,
      })
      .select()
      .single();

    if (restaurantError) {
      console.error("Restaurant creation error:", restaurantError);
      // Rollback: delete the user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "restaurant_creation_failed",
        ip_hash: ipHash,
        email_hash: hashForLog(pendingReg.email),
        success: false,
        error_message: restaurantError.message,
      });

      return new Response(JSON.stringify({ error: "Failed to create restaurant profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (pendingReg.billing_cycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create subscription record
    await supabaseAdmin.from("user_subscriptions").insert({
      user_id: userId,
      restaurant_id: restaurant.id,
      plan_id: pendingReg.plan_id,
      razorpay_subscription_id: subscriptionId,
      billing_cycle: pendingReg.billing_cycle,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });

    // Record payment transaction
    await supabaseAdmin.from("payment_transactions").insert({
      user_id: userId,
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      status: "captured",
      payment_method: paymentData.method,
      metadata: {
        type: "registration",
        ip_hash: ipHash,
      },
    });

    // SECURITY: Clear password immediately after account creation
    await supabaseAdmin
      .from("pending_registrations")
      .update({
        password_hash: "[CLEARED]",
        status: "completed",
      })
      .eq("id", pendingReg.id);

    // Get plan details for redirect
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("has_orders_feature")
      .eq("id", pendingReg.plan_id)
      .single();

    // Log successful registration
    await supabaseAdmin.from("payment_security_log").insert({
      event_type: "registration_completed",
      ip_hash: ipHash,
      email_hash: hashForLog(pendingReg.email),
      user_agent_hash: userAgentHash,
      success: true,
      metadata: { 
        plan_id: pendingReg.plan_id,
        billing_cycle: pendingReg.billing_cycle,
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      email: pendingReg.email,
      hasOrdersFeature: plan?.has_orders_feature ?? false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    
    await supabaseAdmin.from("payment_security_log").insert({
      event_type: "verification_error",
      ip_hash: ipHash,
      success: false,
      error_message: error.message?.substring(0, 500),
    });

    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
