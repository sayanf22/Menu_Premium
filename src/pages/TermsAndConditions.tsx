import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsAndConditions = () => {
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
          <h1 className="text-xl font-bold">Terms and Conditions</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground">Last updated: December 3, 2025</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to AddMenu ("Company", "we", "our", "us"). These Terms and Conditions govern your use of our website at{" "}
            <a href="https://addmenu.in" className="text-primary hover:underline">https://addmenu.in</a> and our digital menu services.
          </p>
          <p>By accessing or using the Service, you agree to be bound by these Terms.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Definitions</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>"Service"</strong> - AddMenu website and digital menu platform</li>
            <li><strong>"User"</strong> - Any individual or entity using our Service</li>
            <li><strong>"Subscriber"</strong> - Users with paid subscriptions</li>
            <li><strong>"Content"</strong> - Menu items, images, text uploaded by Users</li>
            <li><strong>"QR Code"</strong> - Scannable codes for accessing digital menus</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Service Description</h2>
          <p>AddMenu provides:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Digital menu creation and hosting platform</li>
            <li>QR code generation for restaurant menus</li>
            <li>Menu management dashboard</li>
            <li>Analytics and customer feedback tools</li>
            <li>Customer support services</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Account Registration</h2>
          <h3 className="text-xl font-medium mt-6 mb-3">4.1 Eligibility</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Be at least 18 years of age</li>
            <li>Have legal capacity to enter into a binding agreement</li>
            <li>Provide accurate and complete registration information</li>
            <li>Be authorized to represent the business (if applicable)</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">4.2 Account Responsibilities</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Maintain confidentiality of account credentials</li>
            <li>Responsible for all activities under your account</li>
            <li>Notify us immediately of unauthorized access</li>
            <li>Keep contact information up to date</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Payment Terms</h2>
          <h3 className="text-xl font-medium mt-6 mb-3">5.1 Pricing</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>All prices in Indian Rupees (INR)</li>
            <li>Prices inclusive of applicable taxes unless stated otherwise</li>
            <li>We reserve the right to change prices with prior notice</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">5.2 Payment Methods (via Razorpay)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Credit Cards (Visa, MasterCard, American Express)</li>
            <li>Debit Cards</li>
            <li>UPI (Google Pay, PhonePe, Paytm, etc.)</li>
            <li>Net Banking</li>
            <li>Digital Wallets</li>
          </ul>

          <h3 className="text-xl font-medium mt-6 mb-3">5.3 Billing</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Subscriptions billed in advance</li>
            <li>Monthly subscriptions renew automatically each month</li>
            <li>Annual subscriptions renew automatically each year</li>
            <li>Email notifications sent before renewal</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. User Content</h2>
          <h3 className="text-xl font-medium mt-6 mb-3">6.1 Ownership</h3>
          <p>You retain all ownership rights to content you upload.</p>

          <h3 className="text-xl font-medium mt-6 mb-3">6.2 License Grant</h3>
          <p>
            By uploading content, you grant AddMenu a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content solely for providing our Service.
          </p>

          <h3 className="text-xl font-medium mt-6 mb-3">6.3 Content Guidelines</h3>
          <p>Do not upload content that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Infringes on intellectual property rights</li>
            <li>Contains false or misleading information</li>
            <li>Is offensive, defamatory, or inappropriate</li>
            <li>Violates any applicable laws</li>
            <li>Contains malware or harmful code</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Prohibited Uses</h2>
          <p>You may not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the Service for illegal purposes</li>
            <li>Attempt unauthorized access to our systems</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Resell or redistribute without authorization</li>
            <li>Use automated systems to access the Service</li>
            <li>Impersonate another person or entity</li>
            <li>Upload viruses or malicious code</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Intellectual Property</h2>
          <p>
            The AddMenu name, logo, website design, and all related intellectual property are owned by AddMenu. You may not use our trademarks without prior written consent.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Service Availability</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>We strive to maintain 99.9% uptime</li>
            <li>Scheduled maintenance with prior notice</li>
            <li>Not liable for downtime due to factors beyond our control</li>
            <li>We reserve the right to modify or discontinue features</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">10. Termination</h2>
          <h3 className="text-xl font-medium mt-6 mb-3">By User</h3>
          <p>You may terminate your account at any time through dashboard settings or by contacting us.</p>

          <h3 className="text-xl font-medium mt-6 mb-3">By AddMenu</h3>
          <p>We may suspend or terminate your account if you:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violate these Terms and Conditions</li>
            <li>Fail to pay subscription fees</li>
            <li>Engage in fraudulent activity</li>
            <li>Abuse our Service or support team</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">11. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, AddMenu shall not be liable for:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages arising from service interruptions</li>
            <li>Third-party actions or content</li>
          </ul>
          <p className="mt-4">
            Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">12. Dispute Resolution</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>First attempted through good-faith negotiation</li>
            <li>Subject to exclusive jurisdiction of courts in Tripura, India</li>
            <li>Governed by the laws of India</li>
          </ul>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-4">
              <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
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

export default TermsAndConditions;
