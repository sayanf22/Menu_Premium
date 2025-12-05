import PolicyLayout from "@/components/PolicyLayout";

const PrivacyPolicy = () => {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="December 3, 2025">
      <p className="text-lg">
        At AddMenu, we are committed to protecting your privacy and ensuring the security of your personal information.
      </p>

      <h2>1. Information We Collect</h2>
      
      <h3>1.1 Personal Information</h3>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
        <li><strong>Business Information:</strong> Restaurant name, address, business type</li>
        <li><strong>Payment Information:</strong> Processed securely through Razorpay (we do not store card details)</li>
        <li><strong>Communication Data:</strong> Messages, feedback, and support requests</li>
      </ul>

      <h3>1.2 Menu Content</h3>
      <ul>
        <li>Menu item names and descriptions</li>
        <li>Prices and categories</li>
        <li>Food images</li>
        <li>Restaurant logos and branding</li>
      </ul>

      <h3>1.3 Automatically Collected Information</h3>
      <ul>
        <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
        <li><strong>Usage Data:</strong> Pages visited, time spent, features used</li>
        <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
        <li><strong>Analytics Data:</strong> Menu views, QR code scans, customer interactions</li>
      </ul>

      <h3>1.4 Cookies and Tracking</h3>
      <p>We use cookies to:</p>
      <ul>
        <li>Keep you logged in</li>
        <li>Remember your preferences</li>
        <li>Analyze usage patterns</li>
        <li>Improve our Service</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li><strong>Provide Services:</strong> Create and host your digital menu, generate QR codes</li>
        <li><strong>Process Payments:</strong> Handle subscription payments through Razorpay</li>
        <li><strong>Communicate:</strong> Send service updates, respond to inquiries, provide support</li>
        <li><strong>Improve:</strong> Analyze usage to enhance features and user experience</li>
        <li><strong>Secure:</strong> Detect and prevent fraud, abuse, and security threats</li>
        <li><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p><strong>We do NOT sell, trade, or rent your personal information.</strong></p>

      <h3>3.1 Service Providers</h3>
      <ul>
        <li><strong>Razorpay:</strong> Payment processing</li>
        <li><strong>Supabase:</strong> Database and authentication services</li>
        <li><strong>Cloudflare:</strong> Content delivery and security</li>
        <li><strong>Analytics providers:</strong> Usage analysis (anonymized data)</li>
      </ul>

      <h3>3.2 Legal Reasons</h3>
      <p>We may share information to:</p>
      <ul>
        <li>Comply with legal obligations</li>
        <li>Respond to lawful requests from authorities</li>
        <li>Protect our rights and safety</li>
        <li>Prevent fraud or illegal activities</li>
      </ul>

      <h2>4. Data Security</h2>
      <ul>
        <li><strong>Encryption:</strong> All data encrypted in transit (SSL/TLS) and at rest</li>
        <li><strong>Secure Storage:</strong> Data stored on secure, access-controlled servers</li>
        <li><strong>Access Controls:</strong> Limited employee access on need-to-know basis</li>
        <li><strong>Regular Audits:</strong> Periodic security assessments and updates</li>
        <li><strong>Payment Security:</strong> PCI-DSS compliant payment processing via Razorpay</li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li><strong>Active Accounts:</strong> As long as your account is active</li>
        <li><strong>After Cancellation:</strong> 30 days for potential reactivation</li>
        <li><strong>Legal Requirements:</strong> As required by applicable laws (typically 7 years for financial records)</li>
        <li><strong>Anonymized Data:</strong> May be retained indefinitely for analytics</li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data</li>
        <li><strong>Correction:</strong> Update or correct inaccurate information</li>
        <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
        <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
        <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
        <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
      </ul>
      <p>
        To exercise these rights, contact us at <a href="mailto:support@addmenu.in">support@addmenu.in</a>
      </p>

      <h2>7. Children's Privacy</h2>
      <p>
        Our Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children.
      </p>

      <h2>8. Grievance Officer</h2>
      <div className="bg-muted/50 p-4 rounded-xl not-prose">
        <p className="text-sm"><strong>Name:</strong> AddMenu Support Team</p>
        <p className="text-sm"><strong>Email:</strong> support@addmenu.in</p>
        <p className="text-sm"><strong>Phone:</strong> +91 700-583-2798</p>
        <p className="text-sm"><strong>Address:</strong> Tripura, India</p>
        <p className="text-sm"><strong>Response Time:</strong> Within 24-48 hours</p>
      </div>
    </PolicyLayout>
  );
};

export default PrivacyPolicy;
