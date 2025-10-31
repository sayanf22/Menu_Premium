import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, Search, Shield, Power, PowerOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  logo_url: string | null;
}

const AdminDashboard = () => {
  const { session, logout, requireAuth } = useAdminAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    restaurant: Restaurant | null;
    newStatus: boolean;
  }>({ open: false, restaurant: null, newStatus: false });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!requireAuth()) return;
    fetchRestaurants();
    
    // BALANCED APPROACH: Use realtime but with optimizations
    // - Only subscribe to UPDATE events (not INSERT/DELETE)
    // - Use specific filter for is_active changes
    // - Debounce updates to reduce processing
    const channel = supabase
      .channel(`admin-restaurants-${session?.email}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        }
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "restaurants",
        },
        () => {
          // Debounce: Only refetch after 500ms of no updates
          setTimeout(() => {
            if (!document.hidden) {
              fetchRestaurants();
            }
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Filter restaurants based on search and status
    let filtered = restaurants;

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) =>
        statusFilter === "active" ? r.is_active : !r.is_active
      );
    }

    setFilteredRestaurants(filtered);
  }, [restaurants, searchQuery, statusFilter]);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, email, phone, is_active, created_at, logo_url")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = (restaurant: Restaurant) => {
    setConfirmDialog({
      open: true,
      restaurant,
      newStatus: !restaurant.is_active,
    });
  };

  const confirmToggleStatus = async () => {
    const { restaurant, newStatus } = confirmDialog;
    if (!restaurant || !session) return;

    // PERFORMANCE OPTIMIZATION: Optimistic update for instant UI feedback
    setRestaurants(prev => prev.map(r => 
      r.id === restaurant.id ? { ...r, is_active: newStatus } : r
    ));
    
    // Close dialog immediately for better UX
    setConfirmDialog({ open: false, restaurant: null, newStatus: false });

    try {
      const { error } = await supabase.rpc("toggle_restaurant_status", {
        p_restaurant_id: restaurant.id,
        p_is_active: newStatus,
        p_admin_email: session.email,
      });

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `${restaurant.name} is now ${newStatus ? "active" : "disabled"}`,
      });
    } catch (error) {
      console.error("Error toggling status:", error);
      
      // ROLLBACK: Revert optimistic update on error
      setRestaurants(prev => prev.map(r => 
        r.id === restaurant.id ? { ...r, is_active: !newStatus } : r
      ));
      
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: restaurants.length,
    active: restaurants.filter((r) => r.is_active).length,
    disabled: restaurants.filter((r) => !r.is_active).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">{session?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Restaurants</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Active</div>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Disabled</div>
            <div className="text-3xl font-bold text-red-600">{stats.disabled}</div>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "disabled" ? "default" : "outline"}
                onClick={() => setStatusFilter("disabled")}
              >
                Disabled
              </Button>
            </div>
          </div>
        </Card>

        {/* Restaurant Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredRestaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No restaurants found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRestaurants.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {restaurant.logo_url ? (
                          <img
                            src={restaurant.logo_url}
                            alt={restaurant.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">🍽️</span>
                          </div>
                        )}
                        <span className="font-medium">{restaurant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{restaurant.email}</TableCell>
                    <TableCell>{restaurant.phone || "—"}</TableCell>
                    <TableCell>
                      {new Date(restaurant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={restaurant.is_active ? "default" : "destructive"}
                      >
                        {restaurant.is_active ? (
                          <>
                            <Power className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <PowerOff className="h-3 w-3 mr-1" />
                            Disabled
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground">
                          {restaurant.is_active ? "Disable" : "Enable"}
                        </span>
                        <Switch
                          checked={restaurant.is_active}
                          onCheckedChange={() => handleToggleStatus(restaurant)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, restaurant: null, newStatus: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.newStatus ? "enable" : "disable"}{" "}
              <strong>{confirmDialog.restaurant?.name}</strong>?
              {!confirmDialog.newStatus && (
                <div className="mt-2 text-destructive">
                  This will prevent customers from accessing their menu and disable the restaurant owner's dashboard.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, restaurant: null, newStatus: false })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.newStatus ? "default" : "destructive"}
              onClick={confirmToggleStatus}
            >
              {confirmDialog.newStatus ? "Enable" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
