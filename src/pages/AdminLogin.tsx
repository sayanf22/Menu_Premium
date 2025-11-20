import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Lock, Mail, Shield } from "lucide-react";

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { login, isAuthenticated } = useAdminAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect if already authenticated
        if (isAuthenticated) {
            navigate("/admindashboard");
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast({
                title: "Missing information",
                description: "Please enter both email and password",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        const result = await login(email, password);

        if (result.success) {
            toast({
                title: "Login successful",
                description: "Welcome to the admin dashboard",
            });
            navigate("/admindashboard");
        } else {
            toast({
                title: "Login failed",
                description: result.error || "Invalid credentials",
                variant: "destructive",
            });
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-muted-foreground">
                        Sign in to manage restaurant accounts
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        size="lg"
                    >
                        {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>Authorized personnel only</p>
                </div>
            </Card>
        </div>
    );
};

export default AdminLogin;
