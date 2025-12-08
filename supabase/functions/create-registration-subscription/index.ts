import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Security: Hash sensitive data for logging
function hashForLog(data: string): string {
  return createHash("sha256").update(data).digest("hex").substring(0, 16);
}

// Security: Sanitize input to prevent injection
function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim()
    .substring(0, 500); // Limit length
}

// Security: Validate email strictly
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Security: Validate password (simple - just length check)
function isStrongPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters" };
  if (password.length > 128) return { valid: false, error: "Password too long" };
  return { valid: true };
}

// Security: Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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

  // Get client IP for rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "unknown";
  const ipHash = hashForLog(clientIP);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const userAgentHash = hashForLog(userAgent);

  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, restaurantName, restaurantDescription, planId, billingCycle } = body;

    // Validate required fields
    if (!email || !password || !restaurantName || !planId || !billingCycle) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize inputs
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanRestaurantName = sanitizeInput(restaurantName);
    const cleanDescription = sanitizeInput(restaurantDescription || "");

    // Validate email format
    if (!isValidEmail(cleanEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return new Response(JSON.stringify({ error: passwordCheck.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate plan ID
    if (!isValidUUID(planId)) {
      return new Response(JSON.stringify({ error: "Invalid plan ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate billing cycle
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return new Response(JSON.stringify({ error: "Invalid billing cycle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate restaurant name length
    if (cleanRestaurantName.length < 2 || cleanRestaurantName.length > 100) {
      return new Response(JSON.stringify({ error: "Restaurant name must be 2-100 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHash = hashForLog(cleanEmail);

    // Rate limiting check (5 attempts per 10 minutes, 30 min block)
    const { data: rateCheck } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: ipHash,
      p_action_type: "registration",
      p_max_requests: 5,
      p_window_seconds: 600,
      p_block_seconds: 1800,
    });

    if (rateCheck && !rateCheck[0]?.allowed) {
      // Log suspicious activity
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "rate_limit_exceeded",
        ip_hash: ipHash,
        email_hash: emailHash,
        user_agent_hash: userAgentHash,
        success: false,
        error_message: "Rate limit exceeded for registration",
        metadata: { blocked_for_seconds: rateCheck[0]?.blocked_for_seconds },
      });

      return new Response(JSON.stringify({ 
        error: "Too many registration attempts. Please try again later.",
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

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === cleanEmail);
    if (emailExists) {
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "duplicate_email_attempt",
        ip_hash: ipHash,
        email_hash: emailHash,
        success: false,
        error_message: "Email already registered",
      });

      return new Response(JSON.stringify({ error: "Email already registered. Please sign in." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay credentials not configured");
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    const period = billingCycle === "yearly" ? "yearly" : "monthly";

    // Create or get Razorpay plan
    const razorpayPlanId = await getOrCreateRazorpayPlan(
      razorpayKeyId,
      razorpayKeySecret,
      plan.slug,
      Number(price),
      period
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
        total_count: billingCycle === "yearly" ? 10 : 120,
        customer_notify: 1,
        notes: {
          email_hash: emailHash, // Don't store actual email in Razorpay notes
          plan_id: planId,
          billing_cycle: billingCycle,
          type: "registration",
        },
      }),
    });

    const subscriptionData = await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      console.error("Razorpay subscription error:", subscriptionData);
      await supabaseAdmin.from("payment_security_log").insert({
        event_type: "razorpay_subscription_failed",
        ip_hash: ipHash,
        email_hash: emailHash,
        success: false,
        error_message: subscriptionData.error?.description || "Razorpay error",
      });

      return new Response(JSON.stringify({ error: subscriptionData.error?.description || "Failed to create subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete any previous pending registration for this email
    await supabaseAdmin
      .from("pending_registrations")
      .delete()
      .eq("email", cleanEmail);

    // Store pending registration
    const { error: pendingError } = await supabaseAdmin
      .from("pending_registrations")
      .insert({
        email: cleanEmail,
        password_hash: password, // Will be cleared after account creation
        restaurant_name: cleanRestaurantName,
        restaurant_description: cleanDescription || null,
        plan_id: planId,
        billing_cycle: billingCycle,
        razorpay_subscription_id: subscriptionData.id,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

    if (pendingError) {
      console.error("Pending registration error:", pendingError);
      return new Response(JSON.stringify({ error: "Failed to create pending registration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful registration attempt
    await supabaseAdmin.from("payment_security_log").insert({
      event_type: "registration_initiated",
      ip_hash: ipHash,
      email_hash: emailHash,
      user_agent_hash: userAgentHash,
      success: true,
      metadata: { plan_name: plan.name, billing_cycle: billingCycle },
    });

    return new Response(JSON.stringify({ 
      subscriptionId: subscriptionData.id,
      planName: plan.name,
      amount: Number(price),
      razorpayKeyId: razorpayKeyId, // Return key ID to frontend
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    
    // Log error
    await supabaseAdmin.from("payment_security_log").insert({
      event_type: "registration_error",
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

async function getOrCreateRazorpayPlan(
  keyId: string,
  keySecret: string,
  planSlug: string,
  amount: number,
  period: string
): Promise<string> {
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

  const createResponse = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({
      period,
      interval: 1,
      item: {
        name: `${planSlug}-${period}`,
        amount: amount * 100,
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
