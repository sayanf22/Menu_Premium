import PolicyLayout from "@/components/PolicyLayout";
import { CheckCircle } from "lucide-react";

const RefundPolicy = () => {
  return (
    <PolicyLayout title="Cancellation & Refund Policy" lastUpdated="December 3, 2025">
      {/* Highlight Box */}
      <div className="not-prose bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-200 m-0">7-Day Money-Back Guarantee</h2>
            <p className="text-green-700 dark:text-green-300 m-0 mt-1">
              We offer a full refund within 7 days of purchase if you're not satisfied with our service.
            </p>
          </div>
        </div>
      </div>

      <h2>1. Cancellation Policy</h2>
      
      <h3>1.1 How to Cancel</h3>
      <ul>
        <li>Log into your dashboard and navigate to Account Settings</li>
        <li>Send an email to <a href="mailto:support@addmenu.in">support@addmenu.in</a></li>
        <li>Call us at +91 700-583-2798</li>
        <li>Message us on WhatsApp at +91 700-583-2798</li>
      </ul>

      <h3>1.2 Cancellation Timeline</h3>
      <ul>
        <li>Requests processed within 24-48 hours</li>
        <li>Confirmation email sent once complete</li>
        <li>Access continues until end of current billing period</li>
      </ul>

      <h3>1.3 Effect of Cancellation</h3>
      <ul>
        <li>Account remains active until end of paid period</li>
        <li>QR codes stop working after subscription ends</li>
        <li>Data retained for 30 days for potential reactivation</li>
        <li>After 30 days, all data permanently deleted</li>
      </ul>

      <h2>2. Refund Policy</h2>

      <h3>2.1 Refund Eligibility</h3>
      <p>You are eligible for a full refund if:</p>
      <ul>
        <li>Request within 7 days of initial payment</li>
        <li>Service does not work as described</li>
        <li>Technical issues our team cannot resolve</li>
        <li>Not satisfied with service quality</li>
      </ul>

      <h3>2.2 Non-Refundable Situations</h3>
      <ul>
        <li>Requests made after 7 days from payment date</li>
        <li>Custom development work that has been completed</li>
        <li>Setup fees after account activation and use</li>
        <li>Renewal payments (cancel before renewal date)</li>
        <li>Accounts terminated due to Terms violation</li>
        <li>Partial month usage after 7-day period</li>
      </ul>

      <h3>2.3 Refund Process</h3>
      <div className="not-prose bg-muted/50 p-4 rounded-xl mb-4">
        <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Submit Request:</strong> Email support@addmenu.in with subject "Refund Request - [Your Email]"</li>
          <li><strong className="text-foreground">Provide Details:</strong> Include registered email, payment date, and reason</li>
          <li><strong className="text-foreground">Review Period:</strong> 2-3 business days</li>
          <li><strong className="text-foreground">Confirmation:</strong> Email confirming approval or denial</li>
          <li><strong className="text-foreground">Processing:</strong> Approved refunds processed within 5-7 business days</li>
        </ol>
      </div>

      <h3>2.4 Refund Method</h3>
      <p>Refunds credited to original payment method:</p>
      <ul>
        <li><strong>UPI payments:</strong> Same UPI ID</li>
        <li><strong>Card payments:</strong> Same card (5-7 business days)</li>
        <li><strong>Net Banking:</strong> Same bank account (5-10 business days)</li>
        <li><strong>Wallet payments:</strong> Same wallet</li>
      </ul>

      <h2>3. Subscription Plans</h2>

      <h3>Monthly Subscriptions</h3>
      <ul>
        <li>Billed monthly on same date each month</li>
        <li>Cancel anytime before next billing date</li>
        <li>No refund for partial months after 7-day period</li>
      </ul>

      <h3>Annual Subscriptions</h3>
      <ul>
        <li>Billed once per year</li>
        <li>7-day refund policy applies from payment date</li>
        <li>Pro-rated refunds considered case-by-case</li>
      </ul>

      <h2>4. Payment Disputes</h2>
      <p>If you believe you were charged incorrectly:</p>
      <ul>
        <li>Contact us immediately at support@addmenu.in</li>
        <li>Provide transaction details and screenshots</li>
        <li>We will investigate within 5 business days</li>
        <li>Duplicate charges refunded immediately upon verification</li>
      </ul>
    </PolicyLayout>
  );
};

export default RefundPolicy;
