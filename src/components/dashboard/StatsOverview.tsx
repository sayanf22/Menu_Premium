import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Package, MessageSquare, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StatsOverviewProps {
  restaurantId: string;
}

const StatsOverview = ({ restaurantId }: StatsOverviewProps) => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalFeedback: 0,
    totalMenuItems: 0,
  });

  const playViewNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZUQ0PVKvn77BgGwc+lt7xwXAkBi152PDYjj0IEl+88N6XSgwRUrHq76tfGwg7lcDzwG8iBS151fDckz4JE2G+8d+YSw0PVbPr8K1eGgc9ltz0wXQiBSB31O/ajD4HE2K98dyWTQwPWLXs8K1eGgc9lNv0wXMhBSB31fDdkz4JE2O+8N+ZTQwOWrfs8K5hGAc5lN30xHYhBSN01vDek0AJE2K98t6ZTg0OWrfs8K9hGAc4ltz1xXkhBSJ01/Dek0EJEl+88eGaSw0PWrbs8LBhGAc4lN31xnkhBSN01vDek0AJEl+98eGaTQwOWrbs8LBjGQc3ld31xHchBSN01/DflEEKEl++8eGbTQwOWrbs8LBjGAc4lN31xXciByJ01vDflEAKEl+/8d6bTQwOWrbt8LJkGQY4lN72xHgiByJ11vDgk0EKEl+/8eGbTQwOWrfs8LJkGQY3lN31xXciByN01/DflUAJEl+/8eGbTg0OWrbt8LJkGQY3lN72xHgiByN01vHfk0EKEV/A8OCdTQ0NWbbt8LNmGgY2lN32xnciByN21/Dfk0AJEl/A8OCdTQ0NWbbs8LNmGgY2k971xHgiByN11/DfkUAKEF++8d6dTQwOWbfs8LRlGgY2k971xngiByN01/DgkUAKEF++8d6dTQwOWbfs8LRmGgY2k971xXgiByN11/DgkUAKEl+/8d+dTQwOWbft8LRmGgY2k971xnkiByJ01vDgk0AJEl+/8d+dTQwOWrfs8LRmGgY2k972xnkiByJ01vDgk0AKEWDDx+CdTQ0NWbbt8LRmGgY2k972xnkiByJ01vDgk0AJEl/A8eGdTQwOWrft8LRnGgY2k972xnkiByJ11/DgkUAJEl/A8eGdTQwOWrft8LRnGgY2k972x3oiByJ11/DgkUAJEl/A8eGdTQwNWbfs8LRmGgY2k971xnkiByJ11/DgkUAJEl/A8eGdTQwNWrfu8LRmGgY2k972xnkiByJ11/DgkUAJEl/A8eGdTQwNWrft8LRmGgY2k972xngiByN11/DgkUAJEl/A8eGdTQwNWbft8LRmGgY2k971xngiByN01vDfkUAJEl/A8d+dTQwNWbfu8LNmGgY2k971xngiByN11/DfkUAJEl/A8d+dTQwNWbfu8LNlGQY3k971xXciByN01/DfkUAJEl/A8d+dTQwNWbfu8LNlGQY3k971xXciByN11/DfkUAJEl+/8d+dTQwOWbft8LRmGgY3lN31xnciByN01/DflEEJEl+/8d+dTQwOWbft8LRlGQY3lN31xXciByN11/DflEAJEl+/8d+dTQwOWrbt8LRlGQY3lN31xXciByN01/DflEAJEl+/8d+dTQwOWrbt8LRmGgY3lN72xXciByN01/DflEAJEl+/8d+dTQwOWrbt8LRnGgY3k971xXciByN01/DflEAJEl+/8d+dTQwOWrbt8LRnGgY3k971xnciByN01/DfkUAJEl+/8d+dTQwOWrbt8LRmGgY3k971xnciByN01/DfkUAJEl+/8d+dTQwOWrbt8LRlGgY3k971xXciByN01/DfkUAJEl+/8d+dTQwOWrbt8LRlGgY3k971xXciBiN01/DfkUAJEl+/8d+dTQwOWrbt8LRlGgY3k971xXciBiN01/DfkUAJEl+/8d+dTQwOWrbt8LRmGgY3k971xXciByN01/DfkUAJEl+/8d+dTQwOWrbt8LRmGgY3k971xnciByN11/DfkUAJEl+/8d+dTQwOWrbt8LRnGgY3k971xnciByN11/DfkUAJEl+/8d+dTQwOWrbt8LRnGgY3k971xnciByN11/DfkUAJ');
    audio.play().catch(e => console.log('Could not play notification sound'));
  };

  useEffect(() => {
    fetchStats();
    subscribeToMenuViews();
  }, [restaurantId]);

  const subscribeToMenuViews = () => {
    const channel = supabase
      .channel('menu-views-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_views',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log('Menu view detected:', payload);
          playViewNotificationSound();
          toast({
            title: "New Menu View!",
            description: "Someone is viewing your menu right now",
          });
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchStats = async () => {
    try {
      // Fetch menu views
      const { data: viewsData } = await supabase
        .from("menu_views")
        .select("view_count")
        .eq("restaurant_id", restaurantId)
        .single();

      // Fetch total orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);

      // Fetch total feedback
      const { count: feedbackCount } = await supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);

      // Fetch total menu items
      const { count: menuCount } = await supabase
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);

      setStats({
        totalViews: viewsData?.view_count || 0,
        totalOrders: ordersCount || 0,
        totalFeedback: feedbackCount || 0,
        totalMenuItems: menuCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const statCards = [
    {
      title: "Total Menu Views",
      value: stats.totalViews,
      icon: Eye,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Menu Items",
      value: stats.totalMenuItems,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Customer Feedback",
      value: stats.totalFeedback,
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Dashboard Overview</h2>
        <p className="text-sm md:text-base text-muted-foreground">Track your restaurant's performance at a glance</p>
      </div>

      <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className="hover:shadow-[var(--shadow-medium)] transition-all duration-300 hover:-translate-y-1"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-3 w-3 md:h-4 md:w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StatsOverview;