import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MenuItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: string;
  prepTimeInMinutes?: number;
  onAdd: () => void;
  tags?: string[];
  isAvailable?: boolean;
}

const MenuItemCard = React.forwardRef<HTMLDivElement, MenuItemCardProps>(
  (
    {
      className,
      imageUrl,
      name,
      price,
      originalPrice,
      quantity,
      prepTimeInMinutes,
      onAdd,
      tags = [],
      isAvailable = true,
      ...props
    },
    ref
  ) => {
    const [isAdded, setIsAdded] = React.useState(false);
    const savings = originalPrice ? originalPrice - price : 0;

    const handleAdd = () => {
      if (!isAvailable) return;
      setIsAdded(true);
      onAdd();
      setTimeout(() => setIsAdded(false), 1000);
    };

    const cardVariants = {
      initial: { opacity: 0, y: 50 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      hover: { y: -8, transition: { duration: 0.3 } },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative flex flex-col w-full overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-xl transition-all duration-300 group",
          !isAvailable && "opacity-60 grayscale",
          className
        )}
        variants={cardVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-50px" }}
        whileHover={isAvailable ? "hover" : undefined}
      >
        {/* IMAGE CONTAINER */}
        <div className="relative overflow-hidden">
          <motion.img
            src={imageUrl}
            alt={name}
            className="object-cover w-full h-56 sm:h-64"
            loading="lazy"
            whileHover={isAvailable ? { scale: 1.1 } : undefined}
            transition={{ duration: 0.3 }}
          />
          
          {/* Tags Overlay */}
          {tags.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs backdrop-blur-sm bg-background/80"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {!isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Unavailable</span>
            </div>
          )}
        </div>

        {/* CONTENT SECTION */}
        <div className="flex flex-col flex-grow p-4 space-y-3">
          {/* ITEM NAME */}
          <h3 className="text-lg font-bold text-foreground leading-tight">
            {name}
          </h3>

          {/* QUANTITY/DESCRIPTION */}
          <p className="text-sm text-muted-foreground line-clamp-2">{quantity}</p>

          {/* PRICING & ADD BUTTON */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                ₹{price}
              </span>
              {originalPrice && originalPrice > price && (
                <div className="flex items-center gap-2">
                  <span className="text-xs line-through text-muted-foreground">
                    ₹{originalPrice}
                  </span>
                  {savings > 0 && (
                    <span className="text-xs font-semibold text-green-500">
                      Save ₹{savings}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ADD BUTTON */}
            <motion.button
              onClick={handleAdd}
              disabled={!isAvailable}
              animate={isAdded ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
              whileTap={isAvailable ? { scale: 0.95 } : undefined}
              className={cn(
                "relative px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 shadow-md",
                "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
                "text-white disabled:opacity-50 disabled:cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              )}
              aria-label={`Add ${name} to cart`}
            >
              <AnimatePresence mode="wait">
                {isAdded ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Added
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
);

MenuItemCard.displayName = "MenuItemCard";

export { MenuItemCard };
