import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, FolderPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadToR2WithProgress, validateFile } from "@/lib/r2Upload";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  category_id: string | null;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

interface MenuManagementProps {
  restaurantId: string;
}

const MenuManagement = ({ restaurantId }: MenuManagementProps) => {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMenuItems(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [restaurantId]);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load menu items",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const { error } = await supabase
        .from("menu_categories")
        .insert([{
          restaurant_id: restaurantId,
          name: newCategoryName,
          display_order: categories.length
        }]);

      if (error) throw error;
      toast({ title: "Category added successfully" });
      setNewCategoryName("");
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Items in it will become uncategorized.")) return;

    try {
      const { error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Category deleted" });
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    // Check max size before compression (5MB)
    const MAX_ORIGINAL_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_ORIGINAL_SIZE) {
      toast({
        title: "Image too large",
        description: "Please upload an image under 5MB",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    try {
      // Import compression function
      const { compressImage } = await import("@/lib/imageOptimization");
      
      toast({
        title: "Optimizing image...",
        description: "Compressing for best quality and size",
      });

      // Compress image for menu items (target: 80KB, high quality)
      const compressedFile = await compressImage(file, 'menu');
      
      setImageFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressedFile);

      toast({
        title: "Image optimized!",
        description: `Reduced to ${(compressedFile.size / 1024).toFixed(0)}KB with excellent quality`,
      });
    } catch (error) {
      console.error('Image compression error:', error);
      toast({
        title: "Compression failed",
        description: "Using original image",
        variant: "destructive",
      });
      // Fallback to original
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload to Cloudflare R2
      const result = await uploadToR2WithProgress(
        file,
        "menu-items",
        (progress) => setUploadProgress(progress)
      );
      
      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || "Upload failed");
      }
      
      return result.publicUrl;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = editingItem?.image_url || "";

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const itemData = {
        restaurant_id: restaurantId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: imageUrl,
        is_available: true,
        category_id: formData.category_id || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({ title: "Menu item updated successfully" });
      } else {
        const { error } = await supabase
          .from("menu_items")
          .insert([itemData]);

        if (error) throw error;
        toast({ title: "Menu item added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchMenuItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !item.is_available })
        .eq("id", item.id);

      if (error) throw error;
      fetchMenuItems();
      toast({ 
        title: item.is_available ? "Item disabled" : "Item enabled",
        description: `${item.name} is now ${!item.is_available ? "available" : "unavailable"}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Menu item deleted" });
      fetchMenuItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", category_id: "" });
    setImageFile(null);
    setImagePreview("");
    setEditingItem(null);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category_id: item.category_id || "",
    });
    setImagePreview(item.image_url);
    setDialogOpen(true);
  };

  const groupedItems = categories.reduce((acc, category) => {
    acc[category.id] = menuItems.filter(item => item.category_id === category.id);
    return acc;
  }, {} as Record<string, MenuItem[]>);
  
  const uncategorizedItems = menuItems.filter(item => !item.category_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Menu Management</h2>
          <p className="text-sm md:text-base text-muted-foreground">Add and manage your menu items and categories</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm">
                <FolderPlus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Add </span>Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Starters, Main Courses, Desserts"
                  />
                </div>
                <Button variant="hero" className="w-full" onClick={addCategory}>
                  Add Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero" className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Add </span>Item
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Item Image * <span className="text-xs text-muted-foreground">(max 500KB)</span></Label>
                <div className="flex flex-col gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingItem}
                  />
                  {imagePreview && (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image... {uploadProgress}%
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <Button type="submit" variant="hero" className="w-full" disabled={loading || isUploading}>
                {loading || isUploading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {categories.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Menu Categories</h3>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5 md:gap-2 bg-primary/10 text-primary px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg border border-primary/20 text-sm md:text-base">
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs md:text-sm opacity-70">({groupedItems[cat.id]?.length || 0})</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 md:h-6 md:w-6 hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => deleteCategory(cat.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {categories.map(category => (
        groupedItems[category.id]?.length > 0 && (
          <div key={category.id} className="space-y-4">
            <h3 className="text-2xl font-bold">{category.name}</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groupedItems[category.id].map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-[var(--shadow-medium)] transition-all duration-300">
                  <div className="relative h-48">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      item.is_available 
                        ? "bg-accent text-accent-foreground" 
                        : "bg-destructive text-destructive-foreground"
                    }`}>
                      {item.is_available ? "Available" : "Unavailable"}
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{item.name}</span>
                      <span className="text-primary">₹{item.price.toFixed(2)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => toggleAvailability(item)}
                        />
                        <span className="text-sm">Available</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      ))}

      {uncategorizedItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">Uncategorized</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {uncategorizedItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-[var(--shadow-medium)] transition-all duration-300">
                <div className="relative h-48">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    item.is_available 
                      ? "bg-accent text-accent-foreground" 
                      : "bg-destructive text-destructive-foreground"
                  }`}>
                    {item.is_available ? "Available" : "Unavailable"}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{item.name}</span>
                    <span className="text-primary">₹{item.price.toFixed(2)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => toggleAvailability(item)}
                      />
                      <span className="text-sm">Available</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {menuItems.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No menu items yet</p>
          <Button variant="hero" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </Card>
      )}
    </div>
  );
};

export default MenuManagement;