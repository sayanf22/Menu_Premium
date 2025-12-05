import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const RefundPolicy = () => {
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
          <h1 className="text-xl font-bold">Cancellation & Refund Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground">Last updated: December 3, 2025</p>

          {/* Highlight Box */}
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-6 my-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-green-800 dark:text-green-200 m-0">7-Day Money-Back Guarantee</h2>
                <p className="text-green-700 dark:text-green-300 m-0 mt-1">
                  We offer a full refund within 7 days of purchase if you're not satisfied with our service.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Cancellation Policy</h2>
          
          <h3 className="text-xl font-medium mt-6 mb-3">1.1 How to Cancel</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Log into your dashboard and navigate to Account Settings</li>
            <li>Send an email to <a href="mailto:support@addmenu.in" className="text-primary hover:underline">support@addmenu.in</a></li>
            <li>Call us at +91 700-583-2798</li>
            <li>Message us on WhatsApp at +91 700-583-2798</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">1.2 Cancellation Timeline</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Requests processed within 24-48 hours</li>
            <li>Confirmation email sent once complete</li>
            <li>Access continues until end of current billing period</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">1.3 Effect of Cancellation</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account remains active until end of paid period</li>
            <li>QR codes stop working after subscription ends</li>
            <li>Data retained for 30 days for potential reactivation</li>
            <li>After 30 days, all data permanently deleted</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Refund Policy</h2>

          <h3 className="text-xl font-medium mt-6 mb-3">2.1 Refund Eligibility</h3>
          <p>You are eligible for a full refund if:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Request within 7 days of initial payment</li>
            <li>Service does not work as described</li>
            <li>Technical issues our team cannot resolve</li>
            <li>Not satisfied with service quality</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">2.2 Non-Refundable Situations</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Requests made after 7 days from payment date</li>
            <li>Custom development work that has been completed</li>
            <li>Setup fees after account activation and use</li>
            <li>Renewal payments (cancel before renewal date)</li>
            <li>Accounts terminated due to Terms violation</li>
            <li>Partial month usage after 7-day period</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">2.3 Refund Process</h3>
          <div className="bg-muted/50 p-4 rounded-lg">
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Submit Request:</strong> Email support@addmenu.in with subject "Refund Request - [Your Email]"</li>
              <li><strong>Provide Details:</strong> Include registered email, payment date, and reason</li>
              <li><strong>Review Period:</strong> 2-3 business days</li>
              <li><strong>Confirmation:</strong> Email confirming approval or denial</li>
              <li><strong>Processing:</strong> Approved refunds processed within 5-7 business days</li>
            </ol>
          </div>

          <h3 className="text-xl font-medium mt-6 mb-3">2.4 Refund Method</h3>
          <p>Refunds credited to original payment method:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>UPI payments:</strong> Same UPI ID</li>
            <li><strong>Card payments:</strong> Same card (5-7 business days)</li>
            <li><strong>Net Banking:</strong> Same bank account (5-10 business days)</li>
            <li><strong>Wallet payments:</strong> Same wallet</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Subscription Plans</h2>

          <h3 className="text-xl font-medium mt-6 mb-3">Monthly Subscriptions</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Billed monthly on same date each month</li>
            <li>Cancel anytime before next billing date</li>
            <li>No refund for partial months after 7-day period</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">Annual Subscriptions</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Billed once per year</li>
            <li>7-day refund policy applies from payment date</li>
            <li>Pro-rated refunds considered case-by-case</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Payment Disputes</h2>
          <p>If you believe you were charged incorrectly:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Contact us immediately at support@addmenu.in</li>
            <li>Provide transaction details and screenshots</li>
            <li>We will investigate within 5 business days</li>
            <li>Duplicate charges refunded immediately upon verification</li>
          </ul>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link to="/shipping-policy" className="text-primary hover:underline">Shipping Policy</Link>
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

export default RefundPolicy;
