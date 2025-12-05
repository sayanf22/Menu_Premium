import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Contact = () => {
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
          <h1 className="text-xl font-bold">Contact Us</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground text-lg">
            We're here to help! Reach out to us through any of the following channels.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email</h3>
                  <a href="mailto:support@addmenu.in" className="text-primary hover:underline">
                    support@addmenu.in
                  </a>
                  <p className="text-sm text-muted-foreground mt-1">Response within 24 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Phone</h3>
                  <a href="tel:+917005832798" className="text-primary hover:underline">
                    +91 700-583-2798
                  </a>
                  <p className="text-sm text-muted-foreground mt-1">Immediate during business hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">WhatsApp</h3>
                  <a 
                    href="https://wa.me/917005832798" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    +91 700-583-2798
                  </a>
                  <p className="text-sm text-muted-foreground mt-1">Response within a few hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Location</h3>
                  <p className="text-foreground">Tripura, India</p>
                  <p className="text-sm text-muted-foreground mt-1">Serving restaurants across India</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Hours */}
        <Card className="mb-12">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Quick Support Tips */}
        <div className="bg-muted/50 rounded-lg p-6 mb-12">
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
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-xl mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Registered Name:</strong> AddMenu</p>
                <p><strong>Website:</strong> <a href="https://addmenu.in" className="text-primary hover:underline">https://addmenu.in</a></p>
              </div>
              <div>
                <p><strong>Support Email:</strong> support@addmenu.in</p>
                <p><strong>Contact Number:</strong> +91 700-583-2798</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Areas */}
        <div className="mt-12">
          <h3 className="font-semibold text-xl mb-4 text-center">Service Areas</h3>
          <p className="text-center text-muted-foreground">
            Serving restaurants across India including Agartala, Khowai, Belonia, Udaipur, Dharmanagar, and 30+ cities across Tripura and India.
          </p>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4">Related Pages</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
            <Link to="/shipping-policy" className="text-primary hover:underline">Shipping Policy</Link>
            <Link to="/pricing" className="text-primary hover:underline">Pricing</Link>
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

export default Contact;
