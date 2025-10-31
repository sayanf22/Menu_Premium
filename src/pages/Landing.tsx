import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, Smartphone, TrendingUp, MessageSquare, Menu, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-restaurant.jpg";

const Landing = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: QrCode,
      title: "Contactless Menu Browsing",
      description: "Customers scan QR codes to view your full menu instantly on their phones"
    },
    {
      icon: Smartphone,
      title: "Simple Restaurant Onboarding",
      description: "Get started in minutes with our easy setup process and intuitive dashboard"
    },
    {
      icon: TrendingUp,
      title: "Real-Time Order Tracking",
      description: "Manage orders efficiently with live updates and status notifications"
    },
    {
      icon: MessageSquare,
      title: "Customer Feedback System",
      description: "Collect valuable insights directly from customers after their orders"
    }
  ];

  const features = [
    {
      icon: Menu,
      title: "Dynamic Menu Management",
      description: "Add, edit, or disable menu items in real-time. Changes appear instantly for all customers."
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track menu views, popular items, and customer engagement to optimize your offerings."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-[hsl(15,90%,50%)] bg-clip-text text-transparent">
              AddMenu
            </h1>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-5xl font-bold leading-tight">
              Transform Your Restaurant with{" "}
              <span className="bg-gradient-to-r from-primary to-[hsl(15,90%,50%)] bg-clip-text text-transparent">
                QR Ordering
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Modernize your dining experience with contactless menus and real-time order management. 
              Simple setup, powerful features, happy customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="xl" variant="hero" onClick={() => navigate("/auth?mode=signup")}>
                Start Free Trial
              </Button>
              <Button size="xl" variant="outline" onClick={() => navigate("/contact")}>
                Contact Sales
              </Button>
            </div>
          </div>
          <div className="relative animate-scale-in">
            <img 
              src={heroImage} 
              alt="Modern restaurant with digital QR menu system" 
              className="rounded-2xl shadow-[var(--shadow-medium)] w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12 animate-fade-in">
          <h3 className="text-3xl font-bold mb-4">Why Choose AddMenu?</h3>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to modernize your restaurant's ordering experience
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-[var(--shadow-medium)] transition-all duration-300 hover:-translate-y-1 animate-slide-up border-border/50"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <benefit.icon className="h-12 w-12 text-primary mb-4" />
              <h4 className="text-lg font-semibold mb-2">{benefit.title}</h4>
              <p className="text-muted-foreground">{benefit.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl my-20">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Powerful Features</h3>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built for modern restaurants who want to stay ahead
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-[var(--shadow-medium)] transition-all duration-300 border-border/50"
            >
              <feature.icon className="h-10 w-10 text-primary mb-4" />
              <h4 className="text-xl font-semibold mb-3">{feature.title}</h4>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20">
          <h3 className="text-4xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of restaurants already using AddMenu to enhance their customer experience
          </p>
          <Button size="xl" variant="hero" onClick={() => navigate("/auth?mode=signup")}>
            Create Your Free Account
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">AddMenu</span>
              </div>
              <p className="text-muted-foreground">
                Modern QR ordering system for restaurants
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="/contact" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="/faq" className="hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="/help" className="hover:text-primary transition-colors">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Contact</h5>
              <p className="text-muted-foreground">support@addmenu.com</p>
              <p className="text-muted-foreground">+1 (555) 123-4567</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
            <p>&copy; 2025 AddMenu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;