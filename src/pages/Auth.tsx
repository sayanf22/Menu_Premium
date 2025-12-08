import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Check, Lock, Star, CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { isRateLimited, RATE_LIMITS, getClientFingerprint, isBlocked, sanitizeInput } from "@/lib/security";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  createRegistrationSubscription, 
  verifyRegistrationPayment, 
  openRazorpayCheckout
} from "@/lib/razorpay";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(254, "Email too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
  name: z.string().min(2, "Restaurant name must be at least 2 characters").max(100, "Restaurant name too long").optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { plans } = useSubscription();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [signUpStep, setSignUpStep] = useState<"form" | "plan">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantDescription, setRestaurantDescription] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [preselectedPlan, setPreselectedPlan] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkUser();
    // Check for plan parameter in URL (e.g., ?plan=advanced or ?plan=premium)
    const planParam = searchParams.get("plan");
    if (planParam) {
      setPreselectedPlan(planParam.toLowerCase());
      setActiveTab("signup");
    }
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      // If a plan was preselected via URL, find and set it
      if (preselectedPlan) {
        const matchedPlan = plans.find(p => 
          p.slug === preselectedPlan || 
          p.name.toLowerCase() === preselectedPlan
        );
        if (matchedPlan) {
          setSelectedPlanId(matchedPlan.id);
        }
      } else if (!selectedPlanId) {
        setSelectedPlanId(plans[0].id);
      }
    }
  }, [plans, preselectedPlan]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) navigate("/dashboard");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast({ title: "Email Sent!", description: "Check your email for the reset link" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateLimitKey = `auth_${getClientFingerprint()}`;
    const blockStatus = isBlocked(rateLimitKey);
    if (blockStatus.blocked) {
      toast({ title: "Too many attempts", description: `Please wait ${Math.ceil(blockStatus.remainingMs / 60000)} minute(s)`, variant: "destructive" });
      return;
    }
    if (isRateLimited(rateLimitKey, RATE_LIMITS.auth)) {
      toast({ title: "Too many attempts", description: "Please wait a few minutes", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Only validate email format for sign-in, let Supabase handle password
      if (!email.trim()) {
        throw new Error("Please enter your email");
      }
      if (!password) {
        throw new Error("Please enter your password");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (data.user) {
        toast({ title: "Welcome back!", description: "Signed in successfully" });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authSchema.parse({ email, password, name: restaurantName });
      setSignUpStep("plan");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      }
    }
  };

  const handleRegisterAndPay = async (planId: string) => {
    const rateLimitKey = `registration_${getClientFingerprint()}`;
    const blockStatus = isBlocked(rateLimitKey);
    if (blockStatus.blocked) {
      toast({ title: "Too many attempts", description: `Please wait ${Math.ceil(blockStatus.remainingMs / 60000)} minute(s)`, variant: "destructive" });
      return;
    }
    if (isRateLimited(rateLimitKey, { maxRequests: 3, windowMs: 600000, blockDurationMs: 1800000 })) {
      toast({ title: "Too many attempts", description: "Please wait before trying again", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSelectedPlanId(planId);
    try {
      const billingCycle = isYearly ? "yearly" : "monthly";
      const { subscriptionId, planName, razorpayKeyId, error } = await createRegistrationSubscription({
        email: email.trim().toLowerCase(),
        password,
        restaurantName: sanitizeInput(restaurantName),
        restaurantDescription: sanitizeInput(restaurantDescription),
        planId,
        billingCycle,
      });
      if (error || !subscriptionId) throw new Error(error || "Failed to create subscription");
      if (!razorpayKeyId) throw new Error("Payment gateway not configured");

      await openRazorpayCheckout({
        key: razorpayKeyId,
        subscription_id: subscriptionId,
        name: "AddMenu",
        description: `${planName} - ${billingCycle} subscription`,
        prefill: { email, name: restaurantName },
        theme: { color: "#f97316" },
        handler: async (response) => {
          setLoading(true);
          try {
            const result = await verifyRegistrationPayment(
              response.razorpay_payment_id,
              response.razorpay_subscription_id,
              response.razorpay_signature
            );
            if (!result.success) throw new Error(result.error || "Payment verification failed");
            toast({ title: "🎉 Account Created!", description: "Signing you in..." });
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) {
              toast({ title: "Account created", description: "Please sign in" });
              setActiveTab("signin");
              setSignUpStep("form");
              return;
            }
            navigate(result.hasOrdersFeature ? "/dashboard" : "/menu-dashboard");
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message, variant: "destructive" });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast({ title: "Payment cancelled", description: "You can try again in 1 minute" });
          },
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  // Logo component
  const Logo = () => (
    <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
      <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
        <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z" />
      </svg>
    </div>
  );

  // Plan selection screen
  if (signUpStep === "plan") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-8">
            <Logo />
            <h1 className="text-2xl font-bold text-center text-gray-900">AddMenu</h1>
            <p className="text-gray-500 text-center mt-1 mb-6">Select a plan to continue</p>

            <button 
              onClick={() => setSignUpStep("form")} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {/* Account info */}
            <div className="bg-gray-50 rounded-full px-4 py-3 text-center mb-6">
              <span className="text-gray-500">Account: </span>
              <span className="font-medium text-gray-900">{email}</span>
            </div>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-1 mb-6">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !isYearly ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  isYearly ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Yearly
                <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 text-xs">-17%</Badge>
              </button>
            </div>

            {/* Plans */}
            <div className="space-y-4">
              {plans.map((plan) => {
                const price = isYearly ? plan.price_yearly : plan.price_monthly;
                const isPopular = plan.has_orders_feature;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative border-2 rounded-2xl p-5 transition-all ${
                      isPopular ? "border-orange-500 bg-orange-50/50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 right-4 bg-orange-500 text-white hover:bg-orange-500">
                        Best Value
                      </Badge>
                    )}
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isPopular ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          {isPopular ? <Star className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-500">{plan.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">{formatPrice(price)}</span>
                        <span className="text-gray-500 text-sm">/mo</span>
                      </div>
                    </div>

                    {/* Features grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleRegisterAndPay(plan.id)}
                      disabled={loading && selectedPlanId === plan.id}
                      className={`w-full rounded-full h-11 ${
                        isPopular 
                          ? "bg-orange-500 hover:bg-orange-600 text-white" 
                          : "bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
                      }`}
                    >
                      {loading && selectedPlanId === plan.id ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                      ) : (
                        <><CreditCard className="h-4 w-4 mr-2" /> Pay & Create Account</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500">
              <Lock className="h-4 w-4" />
              <span>Secure payment via Razorpay • 7-day refund guarantee</span>
            </div>

            <Link to="/" className="block text-center mt-4 text-gray-500 hover:text-orange-500 text-sm">
              ← Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-8">
            <Logo />
            <h1 className="text-2xl font-bold text-center text-gray-900">AddMenu</h1>
            <p className="text-gray-500 text-center mt-1 mb-6">Reset your password</p>

            {resetEmailSent ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Reset email sent!</p>
                  <p className="text-green-600 text-sm">Check your inbox for the reset link</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }} 
                  className="w-full rounded-full h-11"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Email</Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="you@restaurant.com"
                    className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                    required 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full h-11"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(false)} 
                  className="w-full text-center text-gray-500 hover:text-orange-500 text-sm"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main auth screen (Sign In / Sign Up)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur">
        <CardContent className="p-8">
          <Logo />
          <h1 className="text-2xl font-bold text-center text-gray-900">AddMenu</h1>
          <p className="text-gray-500 text-center mt-1 mb-6">Create your digital menu</p>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-6">
            <button
              onClick={() => setActiveTab("signin")}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "signin" 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "signup" 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {activeTab === "signup" ? (
            <form onSubmit={handleSignUpFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Restaurant Name *</Label>
                <Input 
                  value={restaurantName} 
                  onChange={(e) => setRestaurantName(e.target.value)} 
                  placeholder="Your Restaurant"
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Description</Label>
                <Input 
                  value={restaurantDescription} 
                  onChange={(e) => setRestaurantDescription(e.target.value)} 
                  placeholder="Fine dining experience... (optional)"
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Email *</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@restaurant.com"
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Password *</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Min 8 characters"
                    className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 pr-12"
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 text-base font-medium"
              >
                Continue to Payment <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-center text-sm text-gray-500">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-orange-500 hover:underline">Terms</Link>
                {" "}and{" "}
                <Link to="/privacy-policy" className="text-orange-500 hover:underline">Privacy Policy</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Email</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@restaurant.com"
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  required 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 font-medium">Password</Label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)} 
                    className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 pr-12"
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 text-base font-medium"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
              </Button>
            </form>
          )}

          <Link to="/" className="block text-center mt-6 text-gray-500 hover:text-orange-500 text-sm">
            ← Back to Home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
