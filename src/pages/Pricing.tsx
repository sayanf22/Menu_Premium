import PolicyLayout from "@/components/PolicyLayout";
import { Clock, Shield, Headphones, Check } from "lucide-react";
import SubscriptionPricing from "@/components/SubscriptionPricing";

const Pricing = () => {
  return (
    <PolicyLayout title="Pricing">
      <div className="not-prose">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground text-lg">
            Choose the plan that works best for your restaurant
          </p>
        </div>

        {/* Dynamic Subscription Pricing */}
        <SubscriptionPricing />

        {/* Why Choose AddMenu */}
        <div className="bg-muted/30 rounded-xl p-8 mt-12">
          <h3 className="text-2xl font-bold text-center mb-8">Why Choose AddMenu?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Clock className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Quick Setup</h4>
              <p className="text-sm text-muted-foreground">Under 5 minutes</p>
            </div>
            <div className="text-center">
              <Shield className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Secure</h4>
              <p className="text-sm text-muted-foreground">Razorpay powered</p>
            </div>
            <div className="text-center">
              <Headphones className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Support</h4>
              <p className="text-sm text-muted-foreground">Local assistance</p>
            </div>
            <div className="text-center">
              <Check className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Guarantee</h4>
              <p className="text-sm text-muted-foreground">7-day money-back</p>
            </div>
          </div>
        </div>
      </div>
    </PolicyLayout>
  );
};

export default Pricing;
