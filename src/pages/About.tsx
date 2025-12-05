import { Link } from "react-router-dom";
import PolicyLayout from "@/components/PolicyLayout";
import { QrCode, BarChart3, MessageSquare, Bell, Zap, Shield, Headphones, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <PolicyLayout title="About Us">
      <div className="not-prose">
        {/* Hero Section */}
        <div className="text-center mb-12 py-8 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-primary/10">
              <QrCode className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">What is AddMenu?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            AddMenu is a digital menu solution for restaurants, cafes, and food businesses. 
            We help you create beautiful QR code menus that your customers can scan and view on their phones.
          </p>
        </div>

        {/* Mission */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            To help restaurants modernize their menu experience with affordable, easy-to-use digital solutions.
          </p>
        </div>

        {/* What We Offer */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-8">What We Offer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: QrCode, title: "Digital Menu Creation", desc: "Upload your menu images and create a beautiful digital menu in minutes." },
              { icon: QrCode, title: "QR Code Generation", desc: "Get a unique QR code for your restaurant that customers can scan instantly." },
              { icon: Zap, title: "Menu Management", desc: "Update your menu anytime from your dashboard - no technical skills needed." },
              { icon: BarChart3, title: "Analytics", desc: "Track menu views and customer engagement with detailed analytics." },
              { icon: MessageSquare, title: "Feedback Collection", desc: "Collect customer feedback directly through your digital menu." },
              { icon: Bell, title: "Bell Calling", desc: "Let customers call for service from their table with one tap." },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Restaurants Choose Us */}
        <div className="bg-muted/30 rounded-xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-center mb-8">Why Restaurants Choose Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: IndianRupee, title: "Affordable", desc: "Plans starting at just ₹249/month", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
              { icon: Zap, title: "Easy to Use", desc: "No technical knowledge required", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
              { icon: Zap, title: "Quick Setup", desc: "Get started in under 5 minutes", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
              { icon: Headphones, title: "Local Support", desc: "WhatsApp and phone support", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
              { icon: Shield, title: "Secure", desc: "Razorpay powered payments", color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
              { icon: Zap, title: "Reliable", desc: "99.9% uptime guarantee", color: "text-teal-600 bg-teal-100 dark:bg-teal-900/30" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className={`p-2 rounded-xl ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="p-8 rounded-xl border border-border/50 bg-card text-center">
          <h3 className="text-2xl font-bold mb-4">Get in Touch</h3>
          <div className="space-y-2 text-muted-foreground mb-6">
            <p><strong className="text-foreground">Website:</strong> <a href="https://addmenu.in" className="text-primary hover:underline">https://addmenu.in</a></p>
            <p><strong className="text-foreground">Email:</strong> <a href="mailto:support@addmenu.in" className="text-primary hover:underline">support@addmenu.in</a></p>
            <p><strong className="text-foreground">Phone/WhatsApp:</strong> <a href="tel:+917005832798" className="text-primary hover:underline">+91 700-583-2798</a></p>
            <p><strong className="text-foreground">Location:</strong> Tripura, India</p>
          </div>
          <div className="flex justify-center gap-4">
            <Link to="/contact">
              <Button>Contact Us</Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline">View Pricing</Button>
            </Link>
          </div>
        </div>
      </div>
    </PolicyLayout>
  );
};

export default About;
