import { Link } from "react-router-dom";
import { ArrowLeft, Check, X, Shield, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Pricing</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground text-lg">
            Choose the plan that works best for your restaurant
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Basic Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Basic Plan</CardTitle>
              <CardDescription>Perfect for small restaurants</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹249</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                or <span className="font-semibold">₹2,490/year</span> (Save 17%)
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Digital Menu with QR Code</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>5 Menu Image Uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Basic Analytics Dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Customer Feedback Collection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Social Media Links</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Unlimited Menu Updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Email Support</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <X className="h-5 w-5" />
                  <span>Bell Calling Feature</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <X className="h-5 w-5" />
                  <span>Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <X className="h-5 w-5" />
                  <span>Custom Branding</span>
                </li>
              </ul>
              <Link to="/auth?mode=signup">
                <Button className="w-full mt-6" variant="outline" size="lg">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Basic Plus Plan */}
          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Basic Plus Plan</CardTitle>
              <CardDescription>For growing restaurants</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹369</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                or <span className="font-semibold">₹3,690/year</span> (Save 17%)
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Everything in Basic</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>10 Menu Image Uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Bell Calling Feature</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Priority Customer Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Custom Branding Options</span>
                </li>
              </ul>
              <Link to="/auth?mode=signup">
                <Button className="w-full mt-6" size="lg">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-6">Feature Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border p-3 text-left">Feature</th>
                  <th className="border border-border p-3 text-center">Basic</th>
                  <th className="border border-border p-3 text-center">Basic Plus</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-3">Digital QR Menu</td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Menu Image Uploads</td>
                  <td className="border border-border p-3 text-center">5</td>
                  <td className="border border-border p-3 text-center">10</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Basic Analytics</td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Customer Feedback</td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Social Media Links</td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Unlimited Updates</td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="border border-border p-3 font-semibold">Bell Calling Feature</td>
                  <td className="border border-border p-3 text-center"><X className="h-5 w-5 text-muted-foreground mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Advanced Analytics</td>
                  <td className="border border-border p-3 text-center"><X className="h-5 w-5 text-muted-foreground mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Custom Branding</td>
                  <td className="border border-border p-3 text-center"><X className="h-5 w-5 text-muted-foreground mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Priority Support</td>
                  <td className="border border-border p-3 text-center"><X className="h-5 w-5 text-muted-foreground mx-auto" /></td>
                  <td className="border border-border p-3 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Why Choose AddMenu */}
        <div className="bg-muted/50 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-center mb-8">Why Choose AddMenu?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Clock className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Quick Setup</h4>
              <p className="text-sm text-muted-foreground">Under 5 minutes</p>
            </div>
            <div className="text-center">
              <Shield className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Secure</h4>
              <p className="text-sm text-muted-foreground">Razorpay powered payments</p>
            </div>
            <div className="text-center">
              <Headphones className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Support</h4>
              <p className="text-sm text-muted-foreground">Local assistance available</p>
            </div>
            <div className="text-center">
              <Check className="h-10 w-10 mx-auto text-primary mb-3" />
              <h4 className="font-semibold">Guarantee</h4>
              <p className="text-sm text-muted-foreground">7-day money-back</p>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4">Related Pages</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
            <Link to="/contact" className="text-primary hover:underline">Contact Us</Link>
            <Link to="/about" className="text-primary hover:underline">About Us</Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 AddMenu. All rights reserved.</p>
          <p className="mt-2">
            <a href="https://addmenu.in" className="hover:text-primary">https://addmenu.in</a> | support@addmenu.in | +91 700-583-2798
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
