import PolicyLayout from "@/components/PolicyLayout";
import { Mail, Phone, MessageCircle, MapPin, Clock } from "lucide-react";

const Contact = () => {
  return (
    <PolicyLayout title="Contact Us">
      <div className="not-prose">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground text-lg">
            We're here to help! Reach out to us through any of the following channels.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <a 
            href="mailto:support@addmenu.in"
            className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Email</h3>
                <p className="text-primary font-medium">support@addmenu.in</p>
                <p className="text-sm text-muted-foreground mt-1">Response within 24 hours</p>
              </div>
            </div>
          </a>

          <a 
            href="tel:+917005832798"
            className="group p-6 rounded-xl border border-border/50 bg-card hover:border-green-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Phone</h3>
                <p className="text-green-600 font-medium">+91 700-583-2798</p>
                <p className="text-sm text-muted-foreground mt-1">Immediate during business hours</p>
              </div>
            </div>
          </a>

          <a 
            href="https://wa.me/917005832798"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-6 rounded-xl border border-border/50 bg-card hover:border-green-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">WhatsApp</h3>
                <p className="text-green-600 font-medium">+91 700-583-2798</p>
                <p className="text-sm text-muted-foreground mt-1">Response within a few hours</p>
              </div>
            </div>
          </a>

          <div className="p-6 rounded-xl border border-border/50 bg-card">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Location</h3>
                <p className="text-foreground font-medium">Tripura, India</p>
                <p className="text-sm text-muted-foreground mt-1">Serving restaurants across India</p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="p-6 rounded-xl border border-border/50 bg-card mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-primary" />
            <h3 className="font-semibold text-xl">Business Hours</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Monday - Sunday</p>
              <p className="text-muted-foreground">9:00 AM - 9:00 PM IST</p>
            </div>
            <div>
              <p className="font-medium">WhatsApp Support</p>
              <p className="text-muted-foreground">Monitored 24/7</p>
            </div>
          </div>
        </div>

        {/* Quick Support Tips */}
        <div className="bg-muted/30 rounded-xl p-6 mb-12">
          <h3 className="font-semibold text-xl mb-4">Quick Support Tips</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>For billing:</strong> Include your registered email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>For technical issues:</strong> Describe the problem in detail</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>For refunds:</strong> Mention your payment date</span>
            </li>
          </ul>
        </div>

        {/* Company Information */}
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="font-semibold text-xl mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p><strong>Registered Name:</strong> AddMenu</p>
              <p><strong>Website:</strong> <a href="https://addmenu.in" className="text-primary hover:underline">https://addmenu.in</a></p>
            </div>
            <div className="space-y-2">
              <p><strong>Support Email:</strong> support@addmenu.in</p>
              <p><strong>Contact Number:</strong> +91 700-583-2798</p>
            </div>
          </div>
        </div>

        {/* Service Areas */}
        <div className="mt-12 text-center">
          <h3 className="font-semibold text-xl mb-4">Service Areas</h3>
          <p className="text-muted-foreground">
            Serving restaurants across India including Agartala, Khowai, Belonia, Udaipur, Dharmanagar, and 30+ cities across Tripura and India.
          </p>
        </div>
      </div>
    </PolicyLayout>
  );
};

export default Contact;
