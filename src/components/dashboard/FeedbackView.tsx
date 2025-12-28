import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Feedback {
  id: string;
  order_id: string;
  rating: number;
  comment: string;
  created_at: string;
  orders: {
    order_number: string;
    table_number: string;
  };
}

interface FeedbackViewProps {
  restaurantId: string;
}

const FeedbackView = ({ restaurantId }: FeedbackViewProps) => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    fetchFeedback();
  }, [restaurantId]);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select(`
          *,
          orders (
            order_number,
            table_number
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load feedback",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-primary text-primary"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-0.5">Customer Feedback</h2>
        <p className="text-xs text-muted-foreground">View feedback from your customers</p>
      </div>

      <div className="grid gap-2">
        {feedback.map((item) => (
          <Card key={item.id} className="hover:shadow-[var(--shadow-medium)] transition-all duration-300">
            <CardHeader className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm">
                    Order #{item.orders.order_number}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Table {item.orders.table_number}
                  </p>
                </div>
                <div className="text-right">
                  {renderStars(item.rating)}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            {item.comment && (
              <CardContent className="p-3 pt-0">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground italic">
                    "{item.comment}"
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {feedback.length === 0 && (
        <Card className="p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No feedback yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Customer feedback will appear here after orders are completed
          </p>
        </Card>
      )}
    </div>
  );
};

export default FeedbackView;