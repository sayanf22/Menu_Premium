import { Link } from "react-router-dom";
import { ArrowLeft, Monitor, Clock, Globe, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShippingPolicy = () => {
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
          <h1 className="text-xl font-bold">Shipping & Delivery Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground">Last updated: December 3, 2025</p>

          {/* Highlight Box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 my-6">
            <div className="flex items-center gap-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-blue-800 dark:text-blue-200 m-0">Digital Service - No Physical Shipping</h2>
                <p className="text-blue-700 dark:text-blue-300 m-0 mt-1">
                  AddMenu is a 100% digital service. All products and services are delivered electronically. No physical goods are shipped.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Nature of Service</h2>
          <p>AddMenu provides:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Digital menu creation and hosting platform</li>
            <li>QR code generation for restaurant menus</li>
            <li>Online dashboard access for menu management</li>
            <li>Analytics and reporting tools</li>
            <li>Customer feedback collection system</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Digital Delivery Timeline</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border p-3 text-left">Service</th>
                  <th className="border border-border p-3 text-left">Delivery Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-3">Account Access</td>
                  <td className="border border-border p-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    Instant (within seconds)
                  </td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Dashboard Access</td>
                  <td className="border border-border p-3">Instant (within seconds)</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">QR Code Generation</td>
                  <td className="border border-border p-3">Instant (within seconds)</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="border border-border p-3">Menu Setup Assistance</td>
                  <td className="border border-border p-3">Within 24 hours</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Custom Support</td>
                  <td className="border border-border p-3">Within 24-48 hours</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Access Credentials</h2>
          <p>After successful payment:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Login credentials sent to registered email</li>
            <li>Immediate dashboard access at addmenu.in</li>
            <li>QR codes downloadable instantly from dashboard</li>
            <li>All features available immediately based on subscription plan</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Service Activation</h2>
          <p>Subscription activated automatically upon:</p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <ol className="list-decimal pl-6 space-y-2">
              <li>Successful payment confirmation from Razorpay</li>
              <li>Account verification (if required)</li>
              <li>Email confirmation sent to registered email</li>
            </ol>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Technical Requirements</h2>
          <p>To access AddMenu services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Device with internet connection (computer, tablet, or smartphone)</li>
            <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
            <li>Valid email address for account communications</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Delivery Issues</h2>
          <p>If you face issues accessing your service after payment:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Check email spam/junk folder for login credentials</li>
            <li>Ensure you're using the correct email address</li>
            <li>Clear browser cache and try again</li>
            <li>Contact our support team immediately</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. No Physical Shipping</h2>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="font-medium text-amber-800 dark:text-amber-200">AddMenu does not:</p>
            <ul className="list-disc pl-6 space-y-1 text-amber-700 dark:text-amber-300 mt-2">
              <li>Ship any physical products</li>
              <li>Deliver printed QR codes or materials</li>
              <li>Send any physical merchandise</li>
            </ul>
            <p className="mt-3 text-amber-700 dark:text-amber-300">
              All QR codes and materials can be downloaded digitally and printed locally by the customer if needed.
            </p>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Service Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-semibold">24/7 Access</p>
              <p className="text-sm text-muted-foreground">Available round the clock</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-semibold">All India</p>
              <p className="text-sm text-muted-foreground">Across all regions</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-semibold">Any Device</p>
              <p className="text-sm text-muted-foreground">With internet access</p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
              <Link to="/contact" className="text-primary hover:underline">Contact Us</Link>
            </div>
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

export default ShippingPolicy;
