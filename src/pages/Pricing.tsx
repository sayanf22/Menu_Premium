import { Link } from "react-router-dom";
import PolicyLayout from "@/components/PolicyLayout";
import { Check, X, Clock, Shield, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Basic Plan */}
          <div className="p-6 rounded-xl border border-border/50 bg-card">
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Basic Plan</h3>
              <p className="text-muted-foreground">Perfect for small restaurants</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹249</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="font-semibold text-foreground">₹2,490/year</span> (Save 17%)
              </p>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "Digital Menu with QR Code",
                "5 Menu Image Uploads",
                "Basic Analytics Dashboard",
                "Customer Feedback Collection",
                "Social Media Links",
                "Unlimited Menu Updates",
                "Email Support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
              {[
                "Bell Calling Feature",
                "Advanced Analytics",
                "Custom Branding",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth?mode=signup">
              <Button variant="outline" className="w-full" size="lg">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Basic Plus Plan */}
          <div className="relative p-6 rounded-xl border-2 border-primary bg-card shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Basic Plus Plan</h3>
              <p className="text-muted-foreground">For growing restaurants</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹369</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="font-semibold text-foreground">₹3,690/year</span> (Save 17%)
              </p>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "Everything in Basic",
                "10 Menu Image Uploads",
                "Bell Calling Feature",
                "Priority Customer Support",
                "Advanced Analytics",
                "Custom Branding Options",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className={feature === "Bell Calling Feature" ? "font-semibold" : ""}>{feature}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth?mode=signup">
              <Button className="w-full" size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-6">Feature Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border/50 p-3 text-left font-medium">Feature</th>
                  <th className="border border-border/50 p-3 text-center font-medium">Basic</th>
                  <th className="border border-border/50 p-3 text-center font-medium">Basic Plus</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Digital QR Menu", basic: true, plus: true },
                  { feature: "Menu Image Uploads", basic: "5", plus: "10" },
                  { feature: "Basic Analytics", basic: true, plus: true },
                  { feature: "Customer Feedback", basic: true, plus: true },
                  { feature: "Social Media Links", basic: true, plus: true },
                  { feature: "Unlimited Updates", basic: true, plus: true },
                  { feature: "Bell Calling Feature", basic: false, plus: true, highlight: true },
                  { feature: "Advanced Analytics", basic: false, plus: true },
                  { feature: "Custom Branding", basic: false, plus: true },
                  { feature: "Priority Support", basic: false, plus: true },
                ].map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                    <td className={`border border-border/50 p-3 ${row.highlight ? "font-semibold" : ""}`}>
                      {row.feature}
                    </td>
                    <td className="border border-border/50 p-3 text-center">
                      {typeof row.basic === "boolean" ? (
                        row.basic ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        row.basic
                      )}
                    </td>
                    <td className="border border-border/50 p-3 text-center">
                      {typeof row.plus === "boolean" ? (
                        row.plus ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        row.plus
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Why Choose AddMenu */}
        <div className="bg-muted/30 rounded-xl p-8">
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
