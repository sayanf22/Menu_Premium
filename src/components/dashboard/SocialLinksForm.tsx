import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Facebook, Twitter, Globe, Edit2 } from "lucide-react";

interface Props {
  restaurantId: string;
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

const SocialLinksForm = ({ restaurantId }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<SocialLinks>({});

  const formatINR = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

  useEffect(() => {
    fetchLinks();
  }, [restaurantId]);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("social_links")
      .eq("id", restaurantId)
      .maybeSingle();
    if (!error && data?.social_links) setLinks(data.social_links as SocialLinks);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ social_links: links as any })
        .eq("id", restaurantId);
      if (error) throw error;
      toast({ title: "Social links updated" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasAny = links.instagram || links.facebook || links.twitter || links.website;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <CardTitle className="text-sm">Social Media</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs"><Edit2 className="h-3 w-3 mr-1"/>Edit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base">Update Social Links</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Instagram</Label>
                <Input value={links.instagram || ''} onChange={e => setLinks({ ...links, instagram: e.target.value })} placeholder="https://instagram.com/yourpage" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Facebook</Label>
                <Input value={links.facebook || ''} onChange={e => setLinks({ ...links, facebook: e.target.value })} placeholder="https://facebook.com/yourpage" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Twitter</Label>
                <Input value={links.twitter || ''} onChange={e => setLinks({ ...links, twitter: e.target.value })} placeholder="https://twitter.com/yourpage" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Website</Label>
                <Input value={links.website || ''} onChange={e => setLinks({ ...links, website: e.target.value })} placeholder="https://yourwebsite.com" className="h-8 text-sm" />
              </div>
              <Button type="submit" className="w-full h-8 text-sm" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {hasAny ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            {links.instagram && <a href={links.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram className="h-4 w-4"/></a>}
            {links.facebook && <a href={links.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook className="h-4 w-4"/></a>}
            {links.twitter && <a href={links.twitter} target="_blank" rel="noreferrer" aria-label="Twitter"><Twitter className="h-4 w-4"/></a>}
            {links.website && <a href={links.website} target="_blank" rel="noreferrer" aria-label="Website"><Globe className="h-4 w-4"/></a>}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No links yet. Click Edit to add.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialLinksForm;
