import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: {
    email: string;
    name?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  restaurantName: string;
  restaurantDescription?: string;
  planId: string;
  billingCycle: "monthly" | "yearly";
}

// Load Razorpay script dynamically with retry logic
export const loadRazorpayScript = (retries = 3): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Razorpay) {
      console.log("✅ Razorpay SDK already loaded");
      resolve(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="razorpay.com"]');
    if (existingScript) {
      console.log("⏳ Razorpay script tag exists, waiting for load...");
      // Wait a bit for it to load
      setTimeout(() => {
        if (window.Razorpay) {
          resolve(true);
        } else if (retries > 0) {
          console.log(`🔄 Retrying Razorpay load (${retries} attempts left)...`);
          resolve(loadRazorpayScript(retries - 1));
        } else {
          console.error("❌ Razorpay SDK failed to load after retries");
          resolve(false);
        }
      }, 1000);
      return;
    }

    console.log("📥 Loading Razorpay SDK...");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      console.log("✅ Razorpay SDK loaded successfully");
      resolve(true);
    };
    
    script.onerror = (error) => {
      console.error("❌ Razorpay SDK load error:", error);
      // Remove failed script
      script.remove();
      
      if (retries > 0) {
        console.log(`🔄 Retrying Razorpay load (${retries} attempts left)...`);
        setTimeout(() => {
          resolve(loadRazorpayScript(retries - 1));
        }, 1000);
      } else {
        console.error("❌ Razorpay SDK failed to load after all retries");
        resolve(false);
      }
    };
    
    document.body.appendChild(script);
  });
};

// Create subscription for NEW user registration (payment first)
export const createRegistrationSubscription = async (
  data: RegistrationData
): Promise<{ subscriptionId: string; planName: string; amount: number; razorpayKeyId: string; error?: string }> => {
  try {
    const response = await supabase.functions.invoke("create-registration-subscription", {
      body: data,
    });

    if (response.error) throw response.error;
    
    // Check if response contains error message
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    
    return {
      subscriptionId: response.data.subscriptionId,
      planName: response.data.planName,
      amount: response.data.amount,
      razorpayKeyId: response.data.razorpayKeyId, // Get key from backend
    };
  } catch (err: any) {
    console.error("Create registration subscription error:", err);
    return { 
      subscriptionId: "", 
      planName: "", 
      amount: 0, 
      razorpayKeyId: "",
      error: err.message || "Failed to create subscription" 
    };
  }
};

// Verify registration payment and create account
export const verifyRegistrationPayment = async (
  paymentId: string,
  subscriptionId: string,
  signature: string
): Promise<{ success: boolean; email?: string; hasOrdersFeature?: boolean; error?: string }> => {
  try {
    const response = await supabase.functions.invoke("verify-registration-payment", {
      body: { paymentId, subscriptionId, signature },
    });

    if (response.error) throw response.error;
    return {
      success: response.data.success,
      email: response.data.email,
      hasOrdersFeature: response.data.hasOrdersFeature,
    };
  } catch (err: any) {
    console.error("Verify registration payment error:", err);
    return { success: false, error: err.message || "Payment verification failed" };
  }
};

// Create subscription for existing user
export const createSubscription = async (
  planId: string,
  billingCycle: "monthly" | "yearly"
): Promise<{ subscriptionId: string; razorpayKeyId: string; error?: string }> => {
  try {
    // Refresh session first to prevent 401 errors
    await supabase.auth.refreshSession();

    const { data, error } = await supabase.functions.invoke("create-razorpay-subscription", {
      body: { planId, billingCycle },
    });

    if (error) throw error;
    
    // Check if response contains error message
    if (data?.error) {
      throw new Error(data.error);
    }
    
    return { 
      subscriptionId: data.subscriptionId,
      razorpayKeyId: data.razorpayKeyId, // Get key from backend
    };
  } catch (err: any) {
    console.error("Create subscription error:", err);
    return { subscriptionId: "", razorpayKeyId: "", error: err.message || "Failed to create subscription" };
  }
};

// Verify payment after successful checkout (existing user)
export const verifyPayment = async (
  paymentId: string,
  subscriptionId: string,
  signature: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await supabase.auth.refreshSession();

    const { data, error } = await supabase.functions.invoke("verify-razorpay-subscription", {
      body: { paymentId, subscriptionId, signature },
    });

    if (error) throw error;
    return { success: data.success };
  } catch (err: any) {
    console.error("Verify payment error:", err);
    return { success: false, error: err.message || "Payment verification failed" };
  }
};

// Open Razorpay checkout modal
export const openRazorpayCheckout = async (
  options: RazorpayOptions
): Promise<void> => {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Failed to load Razorpay SDK");
  }

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};


