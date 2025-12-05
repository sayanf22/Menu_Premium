import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QrCode, Eye, EyeOff, Menu, FileText, Shield, RefreshCw, Truck, Phone, IndianRupee, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { isRateLimited, getRemainingAttempts, clearRateLimit, RATE_LIMITS, getClientFingerprint } from "@/lib/security";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Restaurant name must be at least 2 characters").max(100, "Restaurant name too long").optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting for password reset
    const rateLimitKey = `password_reset_${getClientFingerprint()}`;
    if (isRateLimited(rateLimitKey, RATE_LIMITS.passwordReset)) {
      const remaining = getRemainingAttempts(rateLimitKey, RATE_LIMITS.passwordReset);
      toast({
        title: "Too many attempts",
        description: `Please wait before trying again. ${remaining} attempts remaining.`,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Email Sent!",
        description: "Check your email for the password reset link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting for auth attempts
    const rateLimitKey = `auth_${getClientFingerprint()}`;
    if (isRateLimited(rateLimitKey, RATE_LIMITS.auth)) {
      const remaining = getRemainingAttempts(rateLimitKey, RATE_LIMITS.auth);
      toast({
        title: "Too many attempts",
        description: `Please wait before trying again. ${remaining} attempts remaining.`,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const validationData = isSignUp 
        ? { email, password, name: restaurantName }
        : { email, password };
      
      authSchema.parse(validationData);

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              name: restaurantName,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Account created!",
            description: "Welcome to AddMenu. Setting up your dashboard...",
          });
          navigate("/dashboard");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Clear rate limit on successful login
          clearRateLimit(rateLimitKey);
          toast({
            title: "Welcome back!",
            description: "Signed in successfully",
          });
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (error.message?.includes("already registered")) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred during authentication",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { to: "/terms", icon: FileText, label: "Terms & Conditions" },
    { to: "/privacy-policy", icon: Shield, label: "Privacy Policy" },
    { to: "/refund-policy", icon: RefreshCw, label: "Refund Policy" },
    { to: "/shipping-policy", icon: Truck, label: "Shipping Policy" },
    { to: "/contact", icon: Phone, label: "Contact Us" },
    { to: "/pricing", icon: IndianRupee, label: "Pricing" },
    { to: "/about", icon: Info, label: "About Us" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4 relative">
      {/* Hamburger Menu */}
      <div className="absolute top-4 right-4 z-50">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                AddMenu
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {menuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>© 2025 AddMenu</p>
                <p>support@addmenu.in</p>
                <p>+91 700-583-2798</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="w-full max-w-md shadow-[var(--shadow-medium)] animate-scale-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <QrCode className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {showForgotPassword ? "Reset Password" : isSignUp ? "Create Your Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {showForgotPassword 
              ? "Enter your email to receive a password reset link"
              : isSignUp 
                ? "Start managing your restaurant menu in minutes" 
                : "Sign in to access your dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Password reset email sent! Check your inbox.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  variant="hero" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  placeholder="Your Restaurant"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              variant="hero" 
              size="lg"
              disabled={loading}
            >
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          )}
          
          {!showForgotPassword && (
            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          )}

          {/* Policy Links Footer */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
              <span>•</span>
              <Link to="/refund-policy" className="hover:text-primary transition-colors">Refunds</Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;