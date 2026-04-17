import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Upload, FileImage, CheckCircle2, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Utensils, X, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ParsedItem {
  name: string;
  description: string;
  price: number;
}

interface ParsedCategory {
  name: string;
  items: ParsedItem[];
}

interface AIMenuImportProps {
  restaurantId: string;
  onImportComplete: () => void; // refresh menu after import
}

// Placeholder illustration colors per category index
const PLACEHOLDER_COLORS = [
  "from-orange-400 to-red-400",
  "from-emerald-400 to-teal-400",
  "from-violet-400 to-purple-400",
  "from-amber-400 to-yellow-400",
  "from-pink-400 to-rose-400",
  "from-cyan-400 to-blue-400",
];

// Food emoji placeholders based on category name
function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("starter") || lower.includes("appetizer")) return "🥗";
  if (lower.includes("main") || lower.includes("entree")) return "🍽️";
  if (lower.includes("dessert") || lower.includes("sweet")) return "🍰";
  if (lower.includes("drink") || lower.includes("beverage")) return "🥤";
  if (lower.includes("soup")) return "🍲";
  if (lower.includes("pizza")) return "🍕";
  if (lower.includes("burger") || lower.includes("sandwich")) return "🍔";
  if (lower.includes("chicken")) return "🍗";
  if (lower.includes("fish") || lower.includes("seafood")) return "🐟";
  if (lower.includes("veg")) return "🥦";
  if (lower.includes("rice") || lower.includes("biryani")) return "🍚";
  if (lower.includes("bread") || lower.includes("roti") || lower.includes("naan")) return "🫓";
  if (lower.includes("snack")) return "🍟";
  return "🍴";
}

const AIMenuImport = ({ restaurantId, onImportComplete }: AIMenuImportProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"idle" | "uploading" | "processing" | "review" | "importing" | "done">("idle");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a JPG, PNG, or WebP image of your menu", variant: "destructive" });
      return;
    }
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB. Try compressing the image first.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMsg(null);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setStep("uploading");
    setErrorMsg(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      setStep("processing");

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-menu-import`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            image_base64: base64,
            image_type: selectedFile.type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setUsageInfo(data.error);
          throw new Error(data.error);
        }
        throw new Error(data.error || "Failed to analyze menu");
      }

      if (!data.categories || data.categories.length === 0) {
        throw new Error("No menu items found in the image. Please try a clearer photo.");
      }

      setParsedCategories(data.categories);
      setTotalItems(data.total_items);
      // Expand all categories by default
      setExpandedCategories(new Set(data.categories.map((c: ParsedCategory) => c.name)));
      setStep("review");

    } catch (err: any) {
      setErrorMsg(err.message);
      setStep("idle");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);
    setImportedCount(0);

    let imported = 0;
    const allItems = parsedCategories.flatMap(cat => cat.items.map(item => ({ ...item, categoryName: cat.name })));
    const total = allItems.length;

    try {
      // Create categories first
      const categoryMap: Record<string, string> = {};
      for (let i = 0; i < parsedCategories.length; i++) {
        const cat = parsedCategories[i];
        // Check if category already exists
        const { data: existing } = await supabase
          .from("menu_categories")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .ilike("name", cat.name)
          .maybeSingle();

        if (existing) {
          categoryMap[cat.name] = existing.id;
        } else {
          const { data: newCat } = await supabase
            .from("menu_categories")
            .insert({ restaurant_id: restaurantId, name: cat.name, display_order: i + 1 })
            .select("id")
            .single();
          if (newCat) categoryMap[cat.name] = newCat.id;
        }
      }

      // Insert items one by one with progress
      for (const item of allItems) {
        const categoryId = categoryMap[item.categoryName] || null;
        await supabase.from("menu_items").insert({
          restaurant_id: restaurantId,
          name: item.name.trim(),
          description: item.description?.trim() || null,
          price: item.price || 0,
          category_id: categoryId,
          is_available: true,
        });
        imported++;
        setImportedCount(imported);
        setImportProgress(Math.round((imported / total) * 100));
        // Small delay for visual feedback
        await new Promise(r => setTimeout(r, 80));
      }

      setStep("done");
      toast({
        title: "🎉 Menu Imported!",
        description: `${imported} items added across ${parsedCategories.length} categories`,
        duration: 6000,
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message);
      setStep("review");
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
  };

  const reset = () => {
    setStep("idle");
    setSelectedFile(null);
    setPreviewUrl(null);
    setParsedCategories([]);
    setExpandedCategories(new Set());
    setImportProgress(0);
    setImportedCount(0);
    setTotalItems(0);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            AI Menu Import
            <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30 text-xs rounded-full" variant="outline">
              1× per month
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground">Upload a photo of your menu — AI extracts all items automatically</p>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorMsg}</p>
                {usageInfo && (
                  <p className="text-xs text-red-500 mt-1">{usageInfo}</p>
                )}
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* IDLE / UPLOAD STEP */}
        {(step === "idle" || step === "uploading") && (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <motion.div animate={dragOver ? { scale: 1.1 } : { scale: 1 }} className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Drop your menu photo here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse • JPG, PNG, WebP • Max 10MB</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 pointer-events-none">
                    <Upload className="h-4 w-4" />Browse Files
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  <img src={previewUrl!} alt="Menu preview" className="w-full max-h-64 object-contain bg-zinc-50 dark:bg-zinc-900" />
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-black/60 text-white border-0 text-xs rounded-full">
                      {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                    </Badge>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    onClick={handleAnalyze}
                    disabled={step === "uploading"}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2 shadow-lg shadow-violet-500/25"
                  >
                    <Sparkles className="h-5 w-5" />
                    Analyze Menu with AI
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* PROCESSING STEP */}
        {step === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-5 py-10"
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-violet-300"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: 80, height: 80, margin: -8 }}
              />
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-violet-500 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold">AI is reading your menu...</p>
              <p className="text-sm text-muted-foreground mt-1">Extracting items, categories, and prices</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-violet-500"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* REVIEW STEP */}
        {step === "review" && parsedCategories.length > 0 && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-950/20 rounded-2xl border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="font-semibold text-sm text-violet-800 dark:text-violet-300">
                    Found {totalItems} items in {parsedCategories.length} categories
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400">Review below, then click Import All</p>
                </div>
              </div>
              <button onClick={reset} className="text-violet-400 hover:text-violet-600">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Categories & Items */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {parsedCategories.map((cat, catIdx) => {
                const isExpanded = expandedCategories.has(cat.name);
                const colorClass = PLACEHOLDER_COLORS[catIdx % PLACEHOLDER_COLORS.length];
                const emoji = getCategoryEmoji(cat.name);
                return (
                  <Card key={cat.name} className="border-0 shadow-sm rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-sm shadow-sm`}>
                          {emoji}
                        </div>
                        <span className="font-semibold text-sm">{cat.name}</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{cat.items.length}</Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                          <div className="px-3 pb-3 space-y-1.5 border-t">
                            {cat.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                {/* Placeholder illustration */}
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-base flex-shrink-0 shadow-sm`}>
                                  {emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-primary flex-shrink-0">
                                  {item.price > 0 ? `₹${item.price}` : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>

            {/* Import button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={handleImport}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2 shadow-lg shadow-violet-500/25"
              >
                <Utensils className="h-5 w-5" />
                Import All {totalItems} Items
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* IMPORTING STEP */}
        {step === "importing" && (
          <motion.div key="importing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-5 py-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
              </div>
              <p className="font-semibold">Adding items to your menu...</p>
              <p className="text-sm text-muted-foreground mt-1">{importedCount} of {totalItems} items added</p>
            </div>
            <div className="space-y-2">
              <Progress value={importProgress} className="h-3 rounded-full" />
              <p className="text-xs text-center text-muted-foreground">{importProgress}% complete</p>
            </div>
          </motion.div>
        )}

        {/* DONE STEP */}
        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </motion.div>
            <div className="text-center">
              <p className="font-bold text-lg">Import Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importedCount} items added to your menu
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIMenuImport;
