import PolicyLayout from "@/components/PolicyLayout";
import { Monitor, Clock, Globe, CheckCircle } from "lucide-react";

const ShippingPolicy = () => {
  return (
    <PolicyLayout title="Shipping & Delivery Policy" lastUpdated="December 3, 2025">
      {/* Highlight Box */}
      <div className="not-prose bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <Monitor className="h-8 w-8 text-blue-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-blue-800 dark:text-blue-200 m-0">Digital Service - No Physical Shipping</h2>
            <p className="text-blue-700 dark:text-blue-300 m-0 mt-1">
              AddMenu is a 100% digital service. All products and services are delivered electronically. No physical goods are shipped.
            </p>
          </div>
        </div>
      </div>

      <h2>1. Nature of Service</h2>
      <p>AddMenu provides:</p>
      <ul>
        <li>Digital menu creation and hosting platform</li>
        <li>QR code generation for restaurant menus</li>
        <li>Online dashboard access for menu management</li>
        <li>Analytics and reporting tools</li>
        <li>Customer feedback collection system</li>
      </ul>

      <h2>2. Digital Delivery Timeline</h2>
      <div className="not-prose overflow-x-auto mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border/50 p-3 text-left font-medium">Service</th>
              <th className="border border-border/50 p-3 text-left font-medium">Delivery Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border/50 p-3">Account Access</td>
              <td className="border border-border/50 p-3 text-green-600 font-medium">Instant</td>
            </tr>
            <tr className="bg-muted/30">
              <td className="border border-border/50 p-3">Dashboard Access</td>
              <td className="border border-border/50 p-3 text-green-600 font-medium">Instant</td>
            </tr>
            <tr>
              <td className="border border-border/50 p-3">QR Code Generation</td>
              <td className="border border-border/50 p-3 text-green-600 font-medium">Instant</td>
            </tr>
            <tr className="bg-muted/30">
              <td className="border border-border/50 p-3">Menu Setup Assistance</td>
              <td className="border border-border/50 p-3">Within 24 hours</td>
            </tr>
            <tr>
              <td className="border border-border/50 p-3">Custom Support</td>
              <td className="border border-border/50 p-3">Within 24-48 hours</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3. Access Credentials</h2>
      <p>After successful payment:</p>
      <ul>
        <li>Login credentials sent to registered email</li>
        <li>Immediate dashboard access at addmenu.in</li>
        <li>QR codes downloadable instantly from dashboard</li>
        <li>All features available immediately based on subscription plan</li>
      </ul>

      <h2>4. Service Activation</h2>
      <p>Subscription activated automatically upon:</p>
      <div className="not-prose bg-muted/50 p-4 rounded-xl mb-4">
        <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
          <li>Successful payment confirmation from Razorpay</li>
          <li>Account verification (if required)</li>
          <li>Email confirmation sent to registered email</li>
        </ol>
      </div>

      <h2>5. Technical Requirements</h2>
      <p>To access AddMenu services:</p>
      <ul>
        <li>Device with internet connection (computer, tablet, or smartphone)</li>
        <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
        <li>Valid email address for account communications</li>
      </ul>

      <h2>6. Delivery Issues</h2>
      <p>If you face issues accessing your service after payment:</p>
      <ul>
        <li>Check email spam/junk folder for login credentials</li>
        <li>Ensure you're using the correct email address</li>
        <li>Clear browser cache and try again</li>
        <li>Contact our support team immediately</li>
      </ul>

      <h2>7. No Physical Shipping</h2>
      <div className="not-prose bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
        <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">AddMenu does not:</p>
        <ul className="list-disc pl-6 space-y-1 text-sm text-amber-700 dark:text-amber-300">
          <li>Ship any physical products</li>
          <li>Deliver printed QR codes or materials</li>
          <li>Send any physical merchandise</li>
        </ul>
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          All QR codes and materials can be downloaded digitally and printed locally by the customer if needed.
        </p>
      </div>

      <h2>8. Service Availability</h2>
      <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="bg-muted/50 p-4 rounded-xl text-center">
          <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="font-semibold text-sm">24/7 Access</p>
          <p className="text-xs text-muted-foreground">Available round the clock</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl text-center">
          <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="font-semibold text-sm">All India</p>
          <p className="text-xs text-muted-foreground">Across all regions</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl text-center">
          <CheckCircle className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="font-semibold text-sm">Any Device</p>
          <p className="text-xs text-muted-foreground">With internet access</p>
        </div>
      </div>
    </PolicyLayout>
  );
};

export default ShippingPolicy;
