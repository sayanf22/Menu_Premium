import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Download, QrCode as QrIcon, ExternalLink, Copy, Check, Smartphone, Printer,
  Palette, Circle, Square, Diamond, Hexagon, Star, Settings2, RotateCcw,
  Grid3X3, LayoutGrid, Plus, X, ChevronDown, ChevronUp, Layers, Table2,
  PauseCircle, PlayCircle, AlertTriangle, Unlock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessType } from "@/hooks/useBusinessType";

interface QRCodeDisplayProps {
  restaurantId: string;
}

const QR_STYLES = [
  { id: 'standard', name: 'Standard', icon: QrIcon, dotStyle: 'standard' },
  { id: 'modern', name: 'Modern', icon: Circle, dotStyle: 'circle' },
  { id: 'classic', name: 'Classic', icon: Square, dotStyle: 'square' },
  { id: 'rounded', name: 'Rounded', icon: Diamond, dotStyle: 'rounded' },
  { id: 'dots', name: 'Dots', icon: Hexagon, dotStyle: 'dots' },
  { id: 'elegant', name: 'Elegant', icon: Star, dotStyle: 'elegant' },
] as const;

const COLOR_PRESETS = [
  { id: 'black', name: 'Classic', fg: '#000000', bg: '#FFFFFF' },
  { id: 'blue', name: 'Ocean', fg: '#1E40AF', bg: '#FFFFFF' },
  { id: 'green', name: 'Forest', fg: '#166534', bg: '#FFFFFF' },
  { id: 'purple', name: 'Royal', fg: '#7C3AED', bg: '#FFFFFF' },
  { id: 'red', name: 'Ruby', fg: '#DC2626', bg: '#FFFFFF' },
  { id: 'orange', name: 'Sunset', fg: '#EA580C', bg: '#FFFFFF' },
  { id: 'gradient1', name: 'Fire', fg: 'gradient:FF6B6B,FF8E53', bg: '#FFFFFF' },
  { id: 'gradient2', name: 'Ocean', fg: 'gradient:667EEA,764BA2', bg: '#FFFFFF' },
];

type DotStyle = 'standard' | 'circle' | 'square' | 'rounded' | 'dots' | 'elegant';
type QRMode = 'single' | 'per_table';

interface TableConfig {
  total: number;
  skip: number[];       // permanently skipped (e.g. 13, 113)
  disabled: number[];   // temporarily stopped (QR exists but won't work)
  custom_labels: Record<string, string>;
}

interface QRConfig {
  style: DotStyle;
  fgColor: string;
  bgColor: string;
  dotScale: number;
  showLogo: boolean;
  frameStyle: 'none' | 'simple' | 'rounded' | 'fancy';
}

// Sanitize table number for URL embedding
function sanitizeTableNum(val: string): string {
  return val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

const QRCodeDisplay = ({ restaurantId }: QRCodeDisplayProps) => {
  const { toast } = useToast();
  const { locationLabel } = useBusinessType(restaurantId);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'per_table'>('single');
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const perTableCanvasRef = useRef<HTMLCanvasElement>(null);

  // DB state
  const [qrMode, setQrMode] = useState<QRMode>('single');
  const [tableConfig, setTableConfig] = useState<TableConfig>({ total: 10, skip: [], disabled: [], custom_labels: {} });
  const [savingConfig, setSavingConfig] = useState(false);

  // Per-table UI state
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [addInput, setAddInput] = useState("");
  const [skipInput, setSkipInput] = useState("");
  const [showAllTables, setShowAllTables] = useState(false);

  // Confirmation dialogs
  const [confirmSwitchMode, setConfirmSwitchMode] = useState<QRMode | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<number | null>(null);
  const [confirmEnable, setConfirmEnable] = useState<number | null>(null);
  const [confirmSkipNum, setConfirmSkipNum] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // QR style config
  const [config, setConfig] = useState<QRConfig>({
    style: 'standard',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    dotScale: 0.85,
    showLogo: false,
    frameStyle: 'rounded',
  });

  const scanUrl = `${window.location.origin}/scan/${restaurantId}`;
  const menuUrl = `${window.location.origin}/menu/${restaurantId}`;
  const getTableScanUrl = (num: number) =>
    `${window.location.origin}/scan/${restaurantId}?table=${sanitizeTableNum(String(num))}`;

  // Load config from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("qr_mode, table_config")
        .eq("id", restaurantId)
        .single();
      if (data) {
        const mode = (data.qr_mode as QRMode) || 'single';
        setQrMode(mode);
        setActiveTab(mode);
        const tc = (data.table_config as any) || {};
        setTableConfig({
          total: tc.total || 10,
          skip: Array.isArray(tc.skip) ? tc.skip : [],
          disabled: Array.isArray(tc.disabled) ? tc.disabled : [],
          custom_labels: tc.custom_labels || {},
        });
      }
    };
    load();
  }, [restaurantId]);

  // Active table numbers = 1..total minus skipped
  const activeTableNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let i = 1; i <= tableConfig.total; i++) {
      if (!tableConfig.skip.includes(i)) nums.push(i);
    }
    return nums;
  }, [tableConfig.total, tableConfig.skip]);

  const displayedTables = showAllTables ? activeTableNumbers : activeTableNumbers.slice(0, 16);

  // QR generation
  const parseColor = (color: string) => {
    if (color.startsWith('gradient:')) {
      return { isGradient: true, colors: color.replace('gradient:', '').split(',').map(c => `#${c}`) };
    }
    return { isGradient: false, colors: [color] };
  };

  const generateQR = async (canvas: HTMLCanvasElement, size: number, cfg: QRConfig, url: string) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const qrData = await QRCode.create(url, { errorCorrectionLevel: "H" });
    const modules = qrData.modules;
    const moduleCount = modules.size;
    const margin = Math.floor(size * 0.08);
    const qrSize = size - margin * 2;
    const dotSize = qrSize / moduleCount;
    const dotRadius = (dotSize / 2) * cfg.dotScale;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, size, size);
    const { isGradient, colors } = parseColor(cfg.fgColor);
    if (isGradient && colors.length >= 2) {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colors[0];
    }
    if (cfg.style === 'standard') {
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col)) {
            ctx.fillRect(margin + col * dotSize, margin + row * dotSize, dotSize, dotSize);
          }
        }
      }
      return;
    }
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = margin + col * dotSize + dotSize / 2;
          const y = margin + row * dotSize + dotSize / 2;
          const isFinderOuter = (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7);
          const isFinderInner = ((row >= 2 && row <= 4) && (col >= 2 && col <= 4)) || ((row >= 2 && row <= 4) && (col >= moduleCount - 5 && col <= moduleCount - 3)) || ((row >= moduleCount - 5 && row <= moduleCount - 3) && (col >= 2 && col <= 4));
          if (isFinderInner || isFinderOuter) {
            const scale = isFinderInner ? 0.75 : 0.9;
            ctx.beginPath();
            ctx.roundRect(margin + col * dotSize + dotSize * (1 - scale) / 2, margin + row * dotSize + dotSize * (1 - scale) / 2, dotSize * scale, dotSize * scale, dotSize * 0.25);
            ctx.fill();
          } else {
            ctx.beginPath();
            switch (cfg.style) {
              case 'circle': ctx.arc(x, y, dotRadius, 0, Math.PI * 2); break;
              case 'square': { const s = dotRadius * 1.8; ctx.rect(x - s/2, y - s/2, s, s); break; }
              case 'rounded': { const r = dotRadius * 1.8; ctx.roundRect(x - r/2, y - r/2, r, r, dotRadius * 0.4); break; }
              case 'dots': ctx.arc(x, y, dotRadius * 0.7, 0, Math.PI * 2); break;
              case 'elegant': { const e = dotRadius * 1.4; ctx.moveTo(x, y - e); ctx.quadraticCurveTo(x + e, y, x, y + e); ctx.quadraticCurveTo(x - e, y, x, y - e); break; }
              default: ctx.rect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
            }
            ctx.fill();
          }
        }
      }
    }
  };

  // Redraw QR whenever config/tab/selection changes — use requestAnimationFrame for stability
  const drawSingleQR = useCallback(() => {
    if (singleCanvasRef.current) {
      generateQR(singleCanvasRef.current, 400, config, scanUrl);
    }
  }, [config, scanUrl, restaurantId]);

  const drawPerTableQR = useCallback(() => {
    if (selectedTable && perTableCanvasRef.current) {
      generateQR(perTableCanvasRef.current, 400, config, getTableScanUrl(selectedTable));
    }
  }, [config, selectedTable, restaurantId]);

  // Draw single QR when tab is active
  useEffect(() => {
    if (activeTab === 'single') {
      // Small delay to ensure canvas is mounted after AnimatePresence transition
      const timer = setTimeout(drawSingleQR, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, drawSingleQR]);

  // Draw per-table QR when tab is active and table selected
  useEffect(() => {
    if (activeTab === 'per_table' && selectedTable) {
      const timer = setTimeout(drawPerTableQR, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedTable, drawPerTableQR]);

  // Save config via secure DB function
  const saveConfig = async (newMode: QRMode, newConfig: TableConfig) => {
    setSavingConfig(true);
    try {
      const { data, error } = await supabase.rpc('update_table_config' as any, {
        p_restaurant_id: restaurantId,
        p_qr_mode: newMode,
        p_table_config: newConfig as any,
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw new Error(error.message || 'Failed to save');
      }
      
      const result = data as any;
      if (result?.success === false) {
        throw new Error(result.error || 'Save failed');
      }
      
      // Update local state only after confirmed DB save
      setQrMode(newMode);
      setTableConfig(newConfig);
      toast({ title: "✅ Saved", description: "Configuration saved to database" });
    } catch (err: any) {
      console.error('Save config error:', err);
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
      // Reload from DB to ensure local state matches
      const { data: fresh } = await supabase
        .from("restaurants")
        .select("qr_mode, table_config")
        .eq("id", restaurantId)
        .single();
      if (fresh) {
        setQrMode((fresh.qr_mode as QRMode) || 'single');
        const tc = (fresh.table_config as any) || {};
        setTableConfig({
          total: tc.total || 10,
          skip: Array.isArray(tc.skip) ? tc.skip : [],
          disabled: Array.isArray(tc.disabled) ? tc.disabled : [],
          custom_labels: tc.custom_labels || {},
        });
      }
    } finally {
      setSavingConfig(false);
    }
  };

  // Switch mode with confirmation
  const handleSwitchMode = (mode: QRMode) => {
    if (mode === qrMode) { setActiveTab(mode); return; }
    setConfirmText("");
    setConfirmSwitchMode(mode);
  };

  const confirmModeSwitch = async () => {
    if (!confirmSwitchMode) return;
    if (confirmText.toUpperCase() !== "CONFIRM") {
      toast({ title: "Type CONFIRM to proceed", variant: "destructive" });
      return;
    }
    await saveConfig(confirmSwitchMode, tableConfig);
    setActiveTab(confirmSwitchMode);
    setConfirmSwitchMode(null);
    setConfirmText("");
  };

  // Add new table/room (only add, never delete)
  const handleAddTable = () => {
    const num = parseInt(addInput.trim());
    if (isNaN(num) || num < 1 || num > 500) {
      toast({ title: "Invalid number", description: "Enter a number between 1 and 500", variant: "destructive" });
      return;
    }
    // If within current total and not skipped, it already exists
    if (num <= tableConfig.total && !tableConfig.skip.includes(num)) {
      toast({ title: `${locationLabel} ${num} already exists` });
      setAddInput("");
      return;
    }
    // If it was skipped, un-skip it
    if (tableConfig.skip.includes(num)) {
      const newConfig = { ...tableConfig, skip: tableConfig.skip.filter(s => s !== num) };
      if (num > tableConfig.total) newConfig.total = num;
      saveConfig(qrMode, newConfig);
      toast({ title: `${locationLabel} ${num} restored`, description: "Removed from skip list" });
      setAddInput("");
      return;
    }
    // Extend total to include this number
    const newConfig = { ...tableConfig, total: num };
    saveConfig(qrMode, newConfig);
    setAddInput("");
  };

  // Un-skip a number (restore it)
  const handleUnskip = (num: number) => {
    const newConfig = { ...tableConfig, skip: tableConfig.skip.filter(s => s !== num) };
    saveConfig(qrMode, newConfig);
    toast({ title: `${locationLabel} ${num} restored` });
  };

  // Skip a number — requires confirmation
  const handleSkipRequest = () => {
    const num = parseInt(skipInput.trim());
    if (isNaN(num) || num < 1 || num > tableConfig.total) {
      toast({ title: "Invalid", description: `Enter a number between 1 and ${tableConfig.total}`, variant: "destructive" });
      return;
    }
    if (tableConfig.skip.includes(num)) {
      toast({ title: "Already skipped" });
      return;
    }
    setConfirmSkipNum(num);
    setConfirmText("");
    setSkipInput("");
  };

  const confirmSkipNumber = async () => {
    if (!confirmSkipNum) return;
    if (confirmText.toUpperCase() !== "CONFIRM") {
      toast({ title: "Type CONFIRM to proceed", variant: "destructive" });
      return;
    }
    const newConfig = { ...tableConfig, skip: [...tableConfig.skip, confirmSkipNum].sort((a, b) => a - b) };
    await saveConfig(qrMode, newConfig);
    setConfirmSkipNum(null);
    setConfirmText("");
  };

  // Disable/enable QR (temporary stop - QR exists but won't work)
  const handleDisableQR = async (num: number) => {
    const newDisabled = [...tableConfig.disabled, num];
    await saveConfig(qrMode, { ...tableConfig, disabled: newDisabled });
    setConfirmDisable(null);
    setConfirmText("");
  };

  const handleEnableQR = async (num: number) => {
    const newDisabled = tableConfig.disabled.filter(d => d !== num);
    await saveConfig(qrMode, { ...tableConfig, disabled: newDisabled });
    setConfirmEnable(null);
  };

  // Download
  const downloadQR = async (size: "small" | "medium" | "large", tableNum?: number) => {
    const sizes = { small: 512, medium: 1024, large: 2048 };
    const url = tableNum ? getTableScanUrl(tableNum) : scanUrl;
    const tempCanvas = document.createElement("canvas");
    await generateQR(tempCanvas, sizes[size], config, url);
    const link = document.createElement("a");
    link.download = tableNum ? `qr-${locationLabel.toLowerCase()}-${tableNum}.png` : `menu-qr.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
    toast({ title: "Downloaded!" });
  };

  const downloadAll = async () => {
    toast({ title: "Preparing...", description: `Generating ${activeTableNumbers.length} QR codes` });
    for (const num of activeTableNumbers) {
      const tempCanvas = document.createElement("canvas");
      await generateQR(tempCanvas, 1024, config, getTableScanUrl(num));
      const link = document.createElement("a");
      link.download = `qr-${locationLabel.toLowerCase()}-${num}.png`;
      link.href = tempCanvas.toDataURL("image/png");
      link.click();
      await new Promise(r => setTimeout(r, 150));
    }
    toast({ title: "Done!", description: `${activeTableNumbers.length} QR codes downloaded` });
  };

  const copyToClipboard = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(label);
    toast({ title: "Copied!", description: url });
    setTimeout(() => setCopied(null), 2000);
  };

  const resetConfig = () => setConfig({ style: 'standard', fgColor: '#000000', bgColor: '#FFFFFF', dotScale: 0.85, showLogo: false, frameStyle: 'rounded' });

  // QR Customization panel
  const CustomizePanel = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />QR Style</h3>
            <Button variant="ghost" size="sm" onClick={resetConfig} className="h-7 px-2 text-xs gap-1"><RotateCcw className="h-3 w-3" />Reset</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QR_STYLES.map((style) => {
              const Icon = style.icon;
              return (
                <motion.button key={style.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setConfig(prev => ({ ...prev, style: style.dotStyle }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${config.style === style.dotStyle ? 'border-primary bg-primary/8 shadow-sm' : 'border-zinc-200 dark:border-zinc-700 hover:border-primary/40'}`}
                >
                  <Icon className={`h-5 w-5 ${config.style === style.dotStyle ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${config.style === style.dotStyle ? 'text-primary' : ''}`}>{style.name}</span>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-3">Color Theme</h3>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map((preset) => {
              const isGradient = preset.fg.startsWith('gradient:');
              const bg = isGradient ? `linear-gradient(135deg, #${preset.fg.split(':')[1].split(',')[0]}, #${preset.fg.split(':')[1].split(',')[1]})` : preset.fg;
              return (
                <motion.button key={preset.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setConfig(prev => ({ ...prev, fgColor: preset.fg, bgColor: preset.bg }))}
                  className={`h-10 rounded-xl border-2 transition-all ${config.fgColor === preset.fg ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-transparent hover:border-zinc-300'}`}
                  style={{ background: bg }} title={preset.name}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Dot Size</Label>
            <span className="text-xs text-muted-foreground font-mono">{Math.round(config.dotScale * 100)}%</span>
          </div>
          <Slider value={[config.dotScale]} onValueChange={([v]) => setConfig(prev => ({ ...prev, dotScale: v }))} min={0.5} max={1} step={0.05} className="w-full" />
        </CardContent>
      </Card>
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-3">Frame Style</h3>
          <div className="grid grid-cols-4 gap-2">
            {(['none', 'simple', 'rounded', 'fancy'] as const).map((frame) => (
              <Button key={frame} variant={config.frameStyle === frame ? "default" : "outline"} size="sm"
                onClick={() => setConfig(prev => ({ ...prev, frameStyle: frame }))} className="capitalize text-xs h-9 rounded-xl">{frame}</Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Frame corners helper
  const FrameCorners = () => config.frameStyle === 'none' ? null : (
    <>
      <div className={`absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-primary ${config.frameStyle === 'fancy' ? 'rounded-tl-xl' : 'rounded-tl-lg'}`} />
      <div className={`absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-primary ${config.frameStyle === 'fancy' ? 'rounded-tr-xl' : 'rounded-tr-lg'}`} />
      <div className={`absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-primary ${config.frameStyle === 'fancy' ? 'rounded-bl-xl' : 'rounded-bl-lg'}`} />
      <div className={`absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-primary ${config.frameStyle === 'fancy' ? 'rounded-br-xl' : 'rounded-br-lg'}`} />
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">QR Code Manager</h2>
          <p className="text-sm text-muted-foreground mt-1">Single QR for all or unique QR per {locationLabel.toLowerCase()}</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant={showCustomize ? "default" : "outline"} onClick={() => setShowCustomize(!showCustomize)} className="gap-2 rounded-xl shadow-sm">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">{showCustomize ? "Hide Style" : "Customize"}</span>
          </Button>
        </motion.div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['single', 'per_table'] as const).map((mode) => {
          const isActive = qrMode === mode;
          const isViewing = activeTab === mode;
          return (
            <motion.button key={mode} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { if (mode !== qrMode) { handleSwitchMode(mode); } else { setActiveTab(mode); } }}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left shadow-sm ${
                isViewing ? 'border-primary bg-primary/5 shadow-md' : 'border-zinc-200 dark:border-zinc-700 hover:border-primary/40 hover:shadow-md'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${isViewing ? 'bg-primary/15' : 'bg-muted'}`}>
                {mode === 'single' ? <QrIcon className={`h-5 w-5 ${isViewing ? 'text-primary' : 'text-muted-foreground'}`} /> : <Grid3X3 className={`h-5 w-5 ${isViewing ? 'text-primary' : 'text-muted-foreground'}`} />}
              </div>
              <div>
                <p className={`font-bold text-sm ${isViewing ? 'text-primary' : ''}`}>{mode === 'single' ? 'Single QR' : `Per ${locationLabel} QR`}</p>
                <p className="text-xs text-muted-foreground">{mode === 'single' ? `One code for all ${locationLabel.toLowerCase()}s` : `Unique QR per ${locationLabel.toLowerCase()}`}</p>
              </div>
              {isActive && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs rounded-full" variant="outline">Active</Badge>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* -- SINGLE QR TAB -- */}
        {activeTab === 'single' && (
          <motion.div key="single" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Preview */}
              <Card className="lg:col-span-3 border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
                    <div className="max-w-xs mx-auto">
                      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-100 dark:border-zinc-800">
                        <FrameCorners />
                        <canvas ref={singleCanvasRef} className="w-full aspect-square rounded-xl" style={{ imageRendering: "crisp-edges" }} />
                        <div className="mt-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-xs font-semibold text-primary">
                            <Smartphone className="w-3.5 h-3.5" />Scan to view menu
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 border-t grid grid-cols-4 gap-2">
                    {(['small', 'medium', 'large'] as const).map(s => (
                      <motion.div key={s} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                        <Button variant="outline" className="w-full flex-col h-auto py-3 gap-1 rounded-xl" onClick={() => downloadQR(s)}>
                          <Download className="h-4 w-4" /><span className="text-xs capitalize">{s}</span>
                        </Button>
                      </motion.div>
                    ))}
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Button variant="outline" className="w-full flex-col h-auto py-3 gap-1 rounded-xl" onClick={() => window.open(menuUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4" /><span className="text-xs">Preview</span>
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar */}
              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence mode="wait">
                  {showCustomize ? (
                    <motion.div key="cust" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                      <CustomizePanel />
                    </motion.div>
                  ) : (
                    <motion.div key="info" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
                      <Card className="border-0 shadow-md rounded-2xl">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><QrIcon className="w-4 h-4 text-primary" />Scan URL</h3>
                          <div className="flex gap-2">
                            <div className="flex-1 p-3 bg-muted rounded-xl overflow-hidden">
                              <code className="text-xs break-all text-muted-foreground">{scanUrl}</code>
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="outline" size="icon" onClick={() => copyToClipboard(scanUrl, 'single')} className="h-10 w-10 rounded-xl flex-shrink-0">
                                {copied === 'single' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </motion.div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Each scan creates a 90-minute session</p>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-md rounded-2xl">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-sm mb-3">Quick Tips</h3>
                          <ul className="space-y-1.5 text-sm text-muted-foreground">
                            <li>� Print on white paper for best contrast</li>
                            <li>� Minimum 2�2 inches for table placement</li>
                            <li>� Test scan before printing in bulk</li>
                            <li>� Place in well-lit, visible areas</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* -- PER-TABLE QR TAB -- */}
        {activeTab === 'per_table' && (
          <motion.div key="per_table" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Config Panel */}
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-bold flex items-center gap-2 text-base">
                    <Table2 className="h-5 w-5 text-primary" />{locationLabel} Configuration
                  </h3>

                  {/* Add new room/table */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Add {locationLabel}</Label>
                    <p className="text-xs text-muted-foreground">You can add new {locationLabel.toLowerCase()}s but cannot delete existing ones</p>
                    <div className="flex gap-2">
                      <Input type="number" value={addInput} onChange={(e) => setAddInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
                        placeholder={`e.g. ${tableConfig.total + 1}`} className="h-10 rounded-xl" min={1} max={500} />
                      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                        <Button onClick={handleAddTable} disabled={savingConfig} className="h-10 px-4 rounded-xl gap-1">
                          <Plus className="h-4 w-4" />Add
                        </Button>
                      </motion.div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Currently: {locationLabel}s 1�{tableConfig.total} ({activeTableNumbers.length} active)
                    </p>
                  </div>

                  {/* Skip numbers */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Skip Numbers</Label>
                    <p className="text-xs text-muted-foreground">Hide numbers from the list (can be restored later)</p>
                    <div className="flex gap-2">
                      <Input type="number" value={skipInput} onChange={(e) => setSkipInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSkipRequest()}
                        placeholder="e.g. 13" className="h-10 rounded-xl" />
                      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                        <Button variant="outline" onClick={handleSkipRequest} disabled={savingConfig} className="h-10 px-4 rounded-xl">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </div>
                    {tableConfig.skip.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tableConfig.skip.map(num => (
                          <motion.div key={num} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 gap-1.5">
                              {locationLabel} {num}
                              <button
                                onClick={() => handleUnskip(num)}
                                className="ml-0.5 hover:text-primary transition-colors"
                                title={`Restore ${locationLabel} ${num}`}
                              >
                                <Unlock className="h-3 w-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Disabled count */}
                  {tableConfig.disabled.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                        <PauseCircle className="h-3.5 w-3.5" />
                        {tableConfig.disabled.length} {locationLabel.toLowerCase()}(s) have QR temporarily stopped
                      </p>
                    </div>
                  )}

                  {/* Customize QR style */}
                  {showCustomize && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <CustomizePanel />
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* QR Preview */}
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-base">
                    <QrIcon className="h-5 w-5 text-primary" />
                    QR Preview
                    {selectedTable && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Badge variant="secondary" className="rounded-full">{locationLabel} {selectedTable}</Badge>
                      </motion.div>
                    )}
                  </h3>

                  <AnimatePresence mode="wait">
                    {selectedTable ? (
                      <motion.div key={selectedTable} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-100 dark:border-zinc-800">
                          <FrameCorners />
                          <canvas ref={perTableCanvasRef} className="w-full aspect-square rounded-xl" style={{ imageRendering: "crisp-edges" }} />
                          <div className="mt-3 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-xs font-semibold text-primary">
                              <Smartphone className="w-3.5 h-3.5" />{locationLabel} {selectedTable}
                            </span>
                          </div>
                        </div>
                        {tableConfig.disabled.includes(selectedTable) && (
                          <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                            <PauseCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">QR is stopped � customers cannot scan this</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
                        <Grid3X3 className="h-14 w-14 mb-3 opacity-20" />
                        <p className="text-sm">Select a {locationLabel.toLowerCase()} to preview its QR</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selectedTable && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadQR("medium", selectedTable)} className="gap-1.5 rounded-xl">
                        <Download className="h-3.5 w-3.5" />Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(getTableScanUrl(selectedTable), `t${selectedTable}`)} className="gap-1.5 rounded-xl">
                        {copied === `t${selectedTable}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        Copy URL
                      </Button>
                      {tableConfig.disabled.includes(selectedTable) ? (
                        <Button size="sm" onClick={() => setConfirmEnable(selectedTable)} className="gap-1.5 rounded-xl col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                          <PlayCircle className="h-3.5 w-3.5" />Re-enable QR
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => { setConfirmDisable(selectedTable); setConfirmText(""); }} className="gap-1.5 rounded-xl col-span-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700">
                          <PauseCircle className="h-3.5 w-3.5" />Stop QR Temporarily
                        </Button>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Table Grid */}
            <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    All {locationLabel}s
                    <Badge variant="secondary" className="rounded-full">{activeTableNumbers.length} active</Badge>
                    {tableConfig.disabled.length > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 rounded-full" variant="outline">{tableConfig.disabled.length} stopped</Badge>
                    )}
                  </h3>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" size="sm" onClick={downloadAll} className="gap-2 rounded-xl shadow-sm">
                      <Layers className="h-4 w-4" />Download All
                    </Button>
                  </motion.div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {displayedTables.map(num => {
                    const isSelected = selectedTable === num;
                    const isDisabled = tableConfig.disabled.includes(num);
                    return (
                      <motion.button key={num} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }}
                        onClick={() => setSelectedTable(num === selectedTable ? null : num)}
                        className={`relative flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all text-center shadow-sm ${
                          isSelected ? 'border-primary bg-primary/10 shadow-md' :
                          isDisabled ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' :
                          'border-zinc-200 dark:border-zinc-700 hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        {isDisabled ? (
                          <PauseCircle className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-amber-500'}`} />
                        ) : (
                          <QrIcon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                        <span className={`text-xs font-bold ${isSelected ? 'text-primary' : isDisabled ? 'text-amber-600 dark:text-amber-400' : ''}`}>{num}</span>
                        {isDisabled && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {activeTableNumbers.length > 16 && (
                  <motion.div whileHover={{ scale: 1.01 }} className="mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowAllTables(!showAllTables)} className="w-full gap-2 rounded-xl">
                      {showAllTables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showAllTables ? 'Show less' : `Show all ${activeTableNumbers.length} ${locationLabel.toLowerCase()}s`}
                    </Button>
                  </motion.div>
                )}

                {(tableConfig.skip.length > 0 || tableConfig.disabled.length > 0) && (
                  <div className="mt-4 pt-4 border-t space-y-1">
                    {tableConfig.skip.length > 0 && (
                      <p className="text-xs text-muted-foreground">Skipped (hidden): {tableConfig.skip.map(n => `${locationLabel} ${n}`).join(', ')}</p>
                    )}
                    {tableConfig.disabled.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">QR stopped: {tableConfig.disabled.map(n => `${locationLabel} ${n}`).join(', ')}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- CONFIRMATION DIALOGS -- */}

      {/* Switch Mode Confirmation */}
      <AlertDialog open={!!confirmSwitchMode} onOpenChange={(o) => { if (!o) { setConfirmSwitchMode(null); setConfirmText(""); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Switch to {confirmSwitchMode === 'single' ? 'Single QR' : `Per-${locationLabel} QR`} Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {confirmSwitchMode === 'per_table'
                  ? `This will activate unique QR codes for each ${locationLabel.toLowerCase()}. The single QR will still redirect to the menu (customers just need to enter their ${locationLabel.toLowerCase()} number manually).`
                  : `This will switch to a single QR code. Your per-${locationLabel.toLowerCase()} QR setup will be saved and can be re-activated anytime — nothing is deleted.`}
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type <span className="font-bold text-primary">CONFIRM</span> to proceed:</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CONFIRM" className="font-mono rounded-xl" autoComplete="off" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setConfirmSwitchMode(null); setConfirmText(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={confirmModeSwitch} disabled={savingConfig || confirmText.toUpperCase() !== "CONFIRM"}>
              {savingConfig ? "Switching..." : "Confirm Switch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop QR Confirmation */}
      <AlertDialog open={!!confirmDisable} onOpenChange={(o) => { if (!o) { setConfirmDisable(null); setConfirmText(""); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-500" />
              Stop QR for {locationLabel} {confirmDisable}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                The QR code will still exist but customers scanning it will see an error. You can re-enable it at any time.
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type <span className="font-bold text-primary">CONFIRM</span> to stop:</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CONFIRM" className="font-mono rounded-xl" autoComplete="off" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setConfirmDisable(null); setConfirmText(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-amber-500 hover:bg-amber-600" onClick={() => confirmDisable && handleDisableQR(confirmDisable)} disabled={savingConfig || confirmText.toUpperCase() !== "CONFIRM"}>
              {savingConfig ? "Stopping..." : "Stop QR"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-enable QR Confirmation */}
      <AlertDialog open={!!confirmEnable} onOpenChange={(o) => { if (!o) setConfirmEnable(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-emerald-500" />
              Re-enable QR for {locationLabel} {confirmEnable}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Customers will be able to scan this QR code again immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setConfirmEnable(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={() => confirmEnable && handleEnableQR(confirmEnable)} disabled={savingConfig}>
              {savingConfig ? "Enabling..." : "Re-enable QR"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Skip Number Confirmation */}
      <AlertDialog open={!!confirmSkipNum} onOpenChange={(o) => { if (!o) { setConfirmSkipNum(null); setConfirmText(""); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Skip {locationLabel} {confirmSkipNum}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {locationLabel} {confirmSkipNum} will be hidden from the list and its QR code will stop working. You can restore it later using the unlock button.
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type <span className="font-bold text-primary">CONFIRM</span> to skip:</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="CONFIRM" className="font-mono rounded-xl" autoComplete="off" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setConfirmSkipNum(null); setConfirmText(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={confirmSkipNumber} disabled={savingConfig || confirmText.toUpperCase() !== "CONFIRM"}>
              {savingConfig ? "Skipping..." : `Skip ${locationLabel} ${confirmSkipNum}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QRCodeDisplay;
