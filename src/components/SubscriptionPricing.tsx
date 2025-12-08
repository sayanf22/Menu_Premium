import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Crown, Sparkles, CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  createSubscription, 
  verifyPayment, 
  openRazorpayCheckout
} from "@/lib/razorpay";

interface SubscriptionPricingProps {
  onSuccess?: () => void;
}

// Loading overlay states
type LoadingState = 'idle' | 'creating' | 'payment' | 'verifying' | 'success';

const loadingMessages: Record<LoadingState, { title: string; subtitle: string; icon: 'loader' | 'card' | 'shield' | 'check' }> = {
  idle: { title: '', subtitle: '', icon: 'loader' },
  creating: { title: 'Preparing Your Subscription', subtitle: 'Setting up payment gateway...', icon: 'loader' },
  payment: { title: 'Complete Your Payment', subtitle: 'Razorpay checkout is open', icon: 'card' },
  verifying: { title: 'Verifying Payment', subtitle: 'Please wait while we confirm your payment...', icon: 'shield' },
  success: { title: 'Payment Successful!', subtitle: 'Redirecting to your dashboard...', icon: 'check' },
};

const SubscriptionPricing = ({ onSuccess }: SubscriptionPricingProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plans, subscription, refreshSubscription } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');

  const resetLoadingState = () => {
    setLoadingState('idle');
    setLoadingPlan(null);
    setSelectedPlanName('');
  };

  const handleSubscribe = async (planId: string, planName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to subscribe",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Set initial loading state
    setLoadingPlan(planId);
    setSelectedPlanName(planName);
    setLoadingState('creating');

    try {
      const billingCycle = isYearly ? "yearly" : "monthly";
      const { subscriptionId, razorpayKeyId, error } = await createSubscription(planId, billingCycle);

      if (error || !subscriptionId) {
        throw new Error(error || "Failed to create subscription");
      }

      if (!razorpayKeyId) {
        throw new Error("Payment gateway not configured");
      }

      // Update state to payment
      setLoadingState('payment');

      try {
        await openRazorpayCheckout({
          key: razorpayKeyId,
          subscription_id: subscriptionId,
          name: "AddMenu",
          description: `${planName} - ${billingCycle} subscription`,
          prefill: {
            email: user.email || "",
          },
          theme: {
            color: "#f97316",
          },
          handler: async (response) => {
            // Update state to verifying
            setLoadingState('verifying');
            
            try {
              const { success, error: verifyError } = await verifyPayment(
                response.razorpay_payment_id,
                response.razorpay_subscription_id,
                response.razorpay_signature
              );

              if (!success) {
                throw new Error(verifyError || "Payment verification failed");
              }

              // Update state to success
              setLoadingState('success');

              toast({
                title: "🎉 Subscription activated!",
                description: `Welcome to ${planName}!`,
              });

              await refreshSubscription();
              onSuccess?.();
              
              // Wait a moment to show success animation, then redirect
              setTimeout(() => {
                const plan = plans.find(p => p.id === planId);
                if (plan?.has_orders_feature) {
                  navigate("/dashboard");
                } else {
                  navigate("/menu-dashboard");
                }
                resetLoadingState();
              }, 2000);
            } catch (err: any) {
              resetLoadingState();
              toast({
                title: "Verification failed",
                description: err.message,
                variant: "destructive",
              });
            }
          },
          modal: {
            ondismiss: () => {
              resetLoadingState();
              toast({
                title: "Payment cancelled",
                description: "You can try again anytime",
              });
            },
          },
        });
      } catch (sdkError: any) {
        resetLoadingState();
        toast({
          title: "Payment Gateway Error",
          description: sdkError.message || "Failed to load payment gateway. Please check your internet connection and try again.",
          variant: "destructive",
        });
        return;
      }
    } catch (err: any) {
      resetLoadingState();
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Render loading icon based on state
  const renderLoadingIcon = (iconType: 'loader' | 'card' | 'shield' | 'check') => {
    switch (iconType) {
      case 'card':
        return <CreditCard className="h-12 w-12 text-primary" />;
      case 'shield':
        return <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />;
      case 'check':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      default:
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Full-screen Loading Overlay */}
      <AnimatePresence>
        {loadingState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="flex flex-col items-center gap-6 p-8 text-center"
            >
              {/* Animated Icon Container */}
              <motion.div
                key={loadingState}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative"
              >
                {/* Pulsing ring for non-success states */}
                {loadingState !== 'success' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary/30"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ width: '80px', height: '80px', margin: '-10px' }}
                  />
                )}
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {renderLoadingIcon(loadingMessages[loadingState].icon)}
                </div>
              </motion.div>

              {/* Plan Name Badge */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {selectedPlanName} Plan
                </Badge>
              </motion.div>

              {/* Loading Message */}
              <motion.div
                key={`msg-${loadingState}`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <h3 className="text-xl font-semibold">
                  {loadingMessages[loadingState].title}
                </h3>
                <p className="text-muted-foreground">
                  {loadingMessages[loadingState].subtitle}
                </p>
              </motion.div>

              {/* Progress Steps */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 mt-4"
              >
                {(['creating', 'payment', 'verifying', 'success'] as LoadingState[]).map((step, idx) => {
                  const stepOrder = ['creating', 'payment', 'verifying', 'success'];
                  const currentIdx = stepOrder.indexOf(loadingState);
                  const stepIdx = stepOrder.indexOf(step);
                  const isActive = stepIdx === currentIdx;
                  const isCompleted = stepIdx < currentIdx;
                  
                  return (
                    <div key={step} className="flex items-center">
                      <motion.div
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          isCompleted ? 'bg-green-500' : isActive ? 'bg-primary' : 'bg-muted'
                        }`}
                        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
                      />
                      {idx < 3 && (
                        <div className={`h-0.5 w-6 mx-1 transition-colors ${
                          isCompleted ? 'bg-green-500' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </motion.div>

              {/* Success Confetti Effect */}
              {loadingState === 'success' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        background: ['#f97316', '#22c55e', '#3b82f6', '#eab308'][i % 4],
                        left: `${10 + (i * 7)}%`,
                        top: '50%',
                      }}
                      initial={{ y: 0, opacity: 1 }}
                      animate={{
                        y: [0, -100 - Math.random() * 100],
                        x: [0, (Math.random() - 0.5) * 100],
                        opacity: [1, 0],
                        scale: [1, 0.5],
                      }}
                      transition={{
                        duration: 1 + Math.random() * 0.5,
                        delay: i * 0.05,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan, index) => {
          const isCurrentPlan = subscription?.plan_slug === plan.slug && subscription?.is_active;
          const isPopular = plan.has_orders_feature;
          const price = isYearly ? plan.price_yearly : plan.price_monthly;
          const monthlyEquivalent = isYearly ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isPopular 
                  ? "border-2 border-primary shadow-lg scale-[1.02]" 
                  : "border hover:border-primary/50"
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  {isPopular ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded bg-muted" />
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatPrice(price)}</span>
                    <span className="text-muted-foreground">/{isYearly ? "year" : "month"}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(monthlyEquivalent)}/month billed annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {!plan.has_orders_feature && (
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Order Management</span>
                    </li>
                  )}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  size="lg"
                  disabled={isCurrentPlan || loadingPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id, plan.name)}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : subscription?.is_active ? (
                    plan.has_orders_feature ? "Upgrade" : "Switch Plan"
                  ) : (
                    "Get Started"
                  )}
                </Button>

                {isCurrentPlan && (
                  <p className="text-center text-sm text-muted-foreground">
                    Your subscription is active
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionPricing;
