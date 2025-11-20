import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Copy, Check } from "lucide-react";

interface SignupCode {
  id: string;
  code: string;
  is_used: boolean | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number | null;
  description: string | null;
}

export const SignupCodeManagement = () => {
  const [codes, setCodes] = useState<SignupCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<SignupCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [newCode, setNewCode] = useState({
    code: "",
    description: "",
    maxUses: "1",
    expiresInDays: "",
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("signup_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast({
        title: "Error",
        description: "Failed to load signup codes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateCode = async () => {
    try {
      const codeToInsert = newCode.code.trim() || generateRandomCode();
      const expiresAt = newCode.expiresInDays
        ? new Date(Date.now() + parseInt(newCode.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from("signup_codes").insert({
        code: codeToInsert,
        description: newCode.description || null,
        max_uses: parseInt(newCode.maxUses) || 1,
        expires_at: expiresAt,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Signup code created successfully",
      });

      setCreateDialogOpen(false);
      setNewCode({ code: "", description: "", maxUses: "1", expiresInDays: "" });
      fetchCodes();
    } catch (error: any) {
      console.error("Error creating code:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create signup code",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCode) return;

    try {
      const { error } = await supabase
        .from("signup_codes")
        .delete()
        .eq("id", selectedCode.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Signup code deleted successfully",
      });

      setDeleteDialogOpen(false);
      setSelectedCode(null);
      fetchCodes();
    } catch (error) {
      console.error("Error deleting code:", error);
      toast({
        title: "Error",
        description: "Failed to delete signup code",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isCodeExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isCodeExhausted = (code: SignupCode) => {
    if (!code.max_uses) return false;
    return (code.current_uses || 0) >= code.max_uses;
  };

  const getCodeStatus = (code: SignupCode) => {
    if (isCodeExpired(code.expires_at)) return { label: "Expired", variant: "destructive" as const };
    if (isCodeExhausted(code)) return { label: "Exhausted", variant: "destructive" as const };
    if (code.is_used && code.max_uses === 1) return { label: "Used", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  const stats = {
    total: codes.length,
    active: codes.filter(c => !isCodeExpired(c.expires_at) && !isCodeExhausted(c)).length,
    used: codes.filter(c => c.is_used || isCodeExhausted(c)).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Codes</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Active</div>
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Used/Exhausted</div>
          <div className="text-3xl font-bold text-gray-600">{stats.used}</div>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Signup Code
        </Button>
      </div>

      {/* Codes Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expires</TableHead>
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
            ) : codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No signup codes found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => {
                const status = getCodeStatus(code);
                return (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{code.description || "—"}</TableCell>
                    <TableCell>
                      {code.current_uses || 0} / {code.max_uses || "∞"}
                    </TableCell>
                    <TableCell>
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCode(code);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Signup Code</DialogTitle>
            <DialogDescription>
              Generate a new signup code for restaurant registration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code (leave empty to auto-generate)</Label>
              <Input
                id="code"
                placeholder="e.g., WELCOME2024"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., For premium partners"
                value={newCode.description}
                onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={newCode.maxUses}
                onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In (days, optional)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="1"
                placeholder="Leave empty for no expiration"
                value={newCode.expiresInDays}
                onChange={(e) => setNewCode({ ...newCode, expiresInDays: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCode}>Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Signup Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the code{" "}
              <strong>{selectedCode?.code}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCode}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
