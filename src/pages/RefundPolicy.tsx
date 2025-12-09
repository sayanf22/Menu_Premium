import PolicyLayout from "@/components/PolicyLayout";
import { CheckCircle, AlertTriangle } from "lucide-react";

const RefundPolicy = () => {
  return (
    <PolicyLayout title="Cancellation & Refund Policy" lastUpdated="December 9, 2025">
      {/* Highlight Box */}
      <div className="not-prose bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-200 m-0">7-Day Money-Back Guarantee</h2>
            <p className="text-green-700 dark:text-green-300 m-0 mt-1">
              We offer a full refund within 7 days of your first purchase if you're not satisfied with our service.
            </p>
          </div>
        </div>
      </div>

      {/* Important Cancellation Notice */}
      <div className="not-prose bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-red-800 dark:text-red-200 m-0">Important: No Refunds for Cancellations</h2>
            <p className="text-red-700 dark:text-red-300 m-0 mt-2">
              If you cancel your subscription after the 7-day trial period, <strong>no refunds will be provided</strong> for the remaining subscription period. Your service will be <strong>deactivated immediately</strong> upon cancellation.
            </p>
          </div>
        </div>
      </div>

      <h2>1. Cancellation Policy</h2>
      
      <h3>1.1 How to Cancel</h3>
      <ul>
        <li>Log into your dashboard and navigate to Subscription settings</li>
        <li>Click "Cancel Subscription" and confirm your decision</li>
        <li>Or email <a href="mailto:support@addmenu.in">support@addmenu.in</a></li>
      </ul>

      <h3>1.2 Immediate Effect of Cancellation</h3>
      <div className="not-prose bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
        <p className="text-amber-800 dark:text-amber-200 font-medium m-0">When you cancel your subscription:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-amber-700 dark:text-amber-300 text-sm">
          <li>Your service is <strong>deactivated immediately</strong></li>
          <li>Your digital menu will no longer be accessible to customers</li>
          <li>QR codes will stop working immediately</li>
          <li><strong>No refunds</strong> are provided for unused time</li>
          <li>You must resubscribe to use the service again</li>
        </ul>
      </div>

      <h3>1.3 Data Retention After Cancellation</h3>
      <ul>
        <li>Your data is retained for 30 days after cancellation</li>
        <li>You can resubscribe within 30 days to restore your data</li>
        <li>After 30 days, all data is permanently deleted</li>
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
