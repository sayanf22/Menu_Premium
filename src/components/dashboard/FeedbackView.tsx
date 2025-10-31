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
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Customer Feedback</h2>
        <p className="text-muted-foreground">View feedback from your customers</p>
      </div>

      <div className="grid gap-4">
        {feedback.map((item) => (
          <Card key={item.id} className="hover:shadow-[var(--shadow-medium)] transition-all duration-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    Order #{item.orders.order_number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Table {item.orders.table_number}
                  </p>
                </div>
                <div className="text-right">
                  {renderStars(item.rating)}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            {item.comment && (
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground italic">
                    "{item.comment}"
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {feedback.length === 0 && (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No feedback yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Customer feedback will appear here after orders are completed
          </p>
        </Card>
      )}
    </div>
  );
};

export default FeedbackView;