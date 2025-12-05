import { Link } from "react-router-dom";
import { ArrowLeft, QrCode, BarChart3, MessageSquare, Bell, Zap, Shield, Headphones, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
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
          <h1 className="text-xl font-bold">About Us</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/10">
              <QrCode className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">What is AddMenu?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AddMenu is a digital menu solution for restaurants, cafes, and food businesses. 
            We help you create beautiful QR code menus that your customers can scan and view on their phones.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Mission */}
        <div className="text-center mb-16">
          <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            To help restaurants modernize their menu experience with affordable, easy-to-use digital solutions.
          </p>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">What We Offer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Digital Menu Creation</h4>
                <p className="text-muted-foreground">
                  Upload your menu images and create a beautiful digital menu in minutes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">QR Code Generation</h4>
                <p className="text-muted-foreground">
                  Get a unique QR code for your restaurant that customers can scan instantly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Menu Management</h4>
                <p className="text-muted-foreground">
                  Update your menu anytime from your dashboard - no technical skills needed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Analytics</h4>
                <p className="text-muted-foreground">
                  Track menu views and customer engagement with detailed analytics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Feedback Collection</h4>
                <p className="text-muted-foreground">
                  Collect customer feedback directly through your digital menu.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Bell Calling (Basic Plus)</h4>
                <p className="text-muted-foreground">
                  Let customers call for service from their table with one tap.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Why Restaurants Choose Us */}
        <div className="bg-muted/50 rounded-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">Why Restaurants Choose Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold">Affordable</h4>
                <p className="text-sm text-muted-foreground">Plans starting at just ₹249/month</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">Easy to Use</h4>
                <p className="text-sm text-muted-foreground">No technical knowledge required</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold">Quick Setup</h4>
                <p className="text-sm text-muted-foreground">Get started in under 5 minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Headphones className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold">Local Support</h4>
                <p className="text-sm text-muted-foreground">WhatsApp and phone support in your language</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold">Secure</h4>
                <p className="text-sm text-muted-foreground">Razorpay powered secure payments</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900/30">
                <Zap className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h4 className="font-semibold">Reliable</h4>
                <p className="text-sm text-muted-foreground">99.9% uptime guarantee</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <Card className="mb-12">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Get in Touch</h3>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Website:</strong> <a href="https://addmenu.in" className="text-primary hover:underline">https://addmenu.in</a></p>
              <p><strong>Email:</strong> <a href="mailto:support@addmenu.in" className="text-primary hover:underline">support@addmenu.in</a></p>
              <p><strong>Phone/WhatsApp:</strong> <a href="tel:+917005832798" className="text-primary hover:underline">+91 700-583-2798</a></p>
              <p><strong>Location:</strong> Tripura, India</p>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <Link to="/contact">
                <Button>Contact Us</Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline">View Pricing</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4">Related Pages</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
            <Link to="/shipping-policy" className="text-primary hover:underline">Shipping Policy</Link>
            <Link to="/contact" className="text-primary hover:underline">Contact Us</Link>
            <Link to="/pricing" className="text-primary hover:underline">Pricing</Link>
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

export default About;
