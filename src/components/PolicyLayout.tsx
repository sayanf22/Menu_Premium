import { Link } from "react-router-dom";
import { ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface PolicyLayoutProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

const PolicyLayout = ({ title, lastUpdated, children }: PolicyLayoutProps) => {
  const policyLinks = [
    { to: "/terms", label: "Terms" },
    { to: "/privacy-policy", label: "Privacy" },
    { to: "/refund-policy", label: "Refunds" },
    { to: "/shipping-policy", label: "Shipping" },
    { to: "/contact", label: "Contact" },
    { to: "/pricing", label: "Pricing" },
    { to: "/about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted/50">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-border/50 hidden sm:block" />
              <h1 className="text-lg font-semibold truncate">{title}</h1>
            </div>
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <QrCode className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium hidden sm:inline">AddMenu</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mb-6">Last updated: {lastUpdated}</p>
        )}
        
        <div className="prose prose-gray dark:prose-invert max-w-none 
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/50
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-li:text-muted-foreground
          prose-strong:text-foreground prose-strong:font-semibold
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ">
          {children}
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-4">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {policyLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-1.5 text-sm rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-8 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <QrCode className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">AddMenu</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 AddMenu. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
            <a href="https://addmenu.in" className="hover:text-primary transition-colors">addmenu.in</a>
            <span>•</span>
            <a href="mailto:support@addmenu.in" className="hover:text-primary transition-colors">support@addmenu.in</a>
            <span>•</span>
            <a href="tel:+917005832798" className="hover:text-primary transition-colors">+91 700-583-2798</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PolicyLayout;
