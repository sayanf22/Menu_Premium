import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download, QrCode as QrIcon, ExternalLink, Copy, Check, Smartphone, Printer,
  Palette, Circle, Square, Diamond, Hexagon, Star, Settings2, RotateCcw,
  Grid3X3, LayoutGrid, Plus, Minus, X, ChevronDown, ChevronUp, Layers, Table2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessType } from "@/hooks/useBusinessType";

interface QRCodeDisplayProps {
  restaurantId: string;
}

// QR Style presets
const QR_STYLES = [
  { id: 'standard', name: 'Standard', icon: QrIcon, dotStyle: 'standard' },
  { id: 'modern', name: 'Modern', icon: Circle, dotStyle: 'circle' },
  { id: 'classic', name: 'Classic', icon: Square, dotStyle: 'square' },
  { id: 'rounded', name: 'Rounded', icon: Diamond, dotStyle: 'rounded' },
  { id: 'dots', name: 'Dots', icon: Hexagon, dotStyle: 'dots' },
  { id: 'elegant', name: 'Elegant', icon: Star, dotStyle: 'elegant' },
] as const;

// Color presets
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
  skip: number[];
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

const QRCodeDisplay = ({ restaurantId }: QRCodeDisplayProps) => {
  const { toast } = useToast();
  const { locationLabel } = useBusinessType(restaurantId);
  const [copied, setCopied] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'per_table'>('single');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Per-table state
  const [qrMode, setQrMode] = useState<QRMode>('single');
  const [tableConfig, setTableConfig] = useState<TableConfig>({ total: 10, skip: [], custom_labels: {} });
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedTableForPreview, setSelectedTableForPreview] = useState<number | null>(null);
  const [skipInput, setSkipInput] = useState("");
  const [totalInput, setTotalInput] = useState("10");
  const [showAllTables, setShowAllTables] = useState(false);

  // QR Configuration state
  const [config, setConfig] = useState<QRConfig>({
    style: 'standard',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    dotScale: 0.85,
    showLogo: false,
    frameStyle: 'rounded',
  });

  // Load restaurant QR config from DB
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("qr_mode, table_config")
        .eq("id", restaurantId)
        .single();
      if (data) {
        const mode = (data.qr_mode as QRMode) || 'single';
        setQrMode(mode);
        setActiveTab(mode);
        const tc = (data.table_config as TableConfig) || { total: 10, skip: [], custom_labels: {} };
        setTableConfig(tc);
        setTotalInput(String(tc.total));
      }
    };
    loadConfig();
  }, [restaurantId]);

  // Computed list of active table numbers (total minus skipped)
  const activeTableNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let i = 1; i <= tableConfig.total; i++) {
      if (!tableConfig.skip.includes(i)) nums.push(i);
    }
    return nums;
  }, [tableConfig]);

  const scanUrl = `${window.location.origin}/scan/${restaurantId}`;
  const getTableScanUrl = (tableNum: number) =>
    `${window.location.origin}/scan/${restaurantId}?table=${tableNum}`;
  const menuUrl = `${window.location.origin}/menu/${restaurantId}`;

  // Parse gradient colors
  const parseColor = (color: string): { isGradient: boolean; colors: string[] } => {
    if (color.startsWith('gradient:')) {
      return { isGradient: true, colors: color.replace('gradient:', '').split(',').map(c => `#${c}`) };
    }
    return { isGradient: false, colors: [color] };
  };

  const generateQR = useCallback(async (canvas: HTMLCanvasElement, size: number, cfg: QRConfig = config, url?: string) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetUrl = url || scanUrl;
    const qrData = await QRCode.create(targetUrl, { errorCorrectionLevel: "H" });
    const modules = qrData.modules;
    const moduleCount = modules.size;
    
    const margin = Math.floor(size * 0.08);
    const qrSize = size - margin * 2;
    const dotSize = qrSize / moduleCount;
    const dotRadius = (dotSize / 2) * cfg.dotScale;
    
    canvas.width = size;
    canvas.height = size;
    
    // Background
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, size, size);
    
    // Parse foreground color
    const { isGradient, colors } = parseColor(cfg.fgColor);
    
    if (isGradient && colors.length >= 2) {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colors[0];
    }
    
    // Standard style - universal QR like Google Pay/PhonePe
    if (cfg.style === 'standard') {
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col)) {
            // Simple filled squares - universal compatibility
            ctx.fillRect(
              margin + col * dotSize,
              margin + row * dotSize,
              dotSize,
              dotSize
            );
          }
        }
      }
      return;
    }
    
    // Draw QR modules based on style
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = margin + col * dotSize + dotSize / 2;
          const y = margin + row * dotSize + dotSize / 2;
          
          // Finder patterns (corners)
          const isFinderOuter = 
            (row < 7 && col < 7) ||
            (row < 7 && col >= moduleCount - 7) ||
            (row >= moduleCount - 7 && col < 7);
          
          const isFinderInner = 
            ((row >= 2 && row <= 4) && (col >= 2 && col <= 4)) ||
            ((row >= 2 && row <= 4) && (col >= moduleCount - 5 && col <= moduleCount - 3)) ||
            ((row >= moduleCount - 5 && row <= moduleCount - 3) && (col >= 2 && col <= 4));

          if (isFinderInner || isFinderOuter) {
            // Always use rounded squares for finder patterns
            const scale = isFinderInner ? 0.75 : 0.9;
            const cornerRadius = dotSize * 0.25;
            ctx.beginPath();
            ctx.roundRect(
              margin + col * dotSize + dotSize * (1 - scale) / 2,
              margin + row * dotSize + dotSize * (1 - scale) / 2,
              dotSize * scale,
              dotSize * scale,
              cornerRadius
            );
            ctx.fill();
          } else {
            // Data modules - style based
            drawModule(ctx, x, y, dotRadius, dotSize, cfg.style, row, col);
          }
        }
      }
    }
  }, [scanUrl, config]);

  const drawModule = (
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, 
    radius: number, dotSize: number,
    style: DotStyle,
    _row: number, _col: number
  ) => {
    ctx.beginPath();
    
    switch (style) {
      case 'standard':
        // Full square - handled separately in generateQR
        ctx.rect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
        break;
        
      case 'circle':
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        break;
        
      case 'square':
        const sqSize = radius * 1.8;
        ctx.rect(x - sqSize/2, y - sqSize/2, sqSize, sqSize);
        break;
        
      case 'rounded':
        const rSize = radius * 1.8;
        ctx.roundRect(x - rSize/2, y - rSize/2, rSize, rSize, radius * 0.4);
        break;
        
      case 'dots':
        // Smaller dots with gaps
        ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        break;
        
      case 'elegant':
        // Diamond-ish shape
        const eSize = radius * 1.4;
        ctx.moveTo(x, y - eSize);
        ctx.quadraticCurveTo(x + eSize, y, x, y + eSize);
        ctx.quadraticCurveTo(x - eSize, y, x, y - eSize);
        break;
    }
    
    ctx.fill();
  };

  useEffect(() => {
    if (canvasRef.current) {
      const url = (activeTab === 'per_table' && selectedTableForPreview)
        ? getTableScanUrl(selectedTableForPreview)
        : scanUrl;
      generateQR(canvasRef.current, 400, config, url);
    }
  }, [restaurantId, generateQR, config, activeTab, selectedTableForPreview]);

  const downloadQRCode = async (downloadSize: "small" | "medium" | "large", tableNum?: number) => {
    const sizes = { small: 512, medium: 1024, large: 2048 };
    const width = sizes[downloadSize];
    
    const url = tableNum ? getTableScanUrl(tableNum) : scanUrl;
    const tempCanvas = document.createElement("canvas");
    await generateQR(tempCanvas, width, config, url);
    
    const link = document.createElement("a");
    const filename = tableNum
      ? `qr-${locationLabel.toLowerCase()}-${tableNum}-${downloadSize}.png`
      : `menu-qr-${config.style}-${downloadSize}.png`;
    link.download = filename;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
    
    toast({ title: "Downloaded!", description: `QR code saved (${width}x${width}px)` });
  };

  // Download ALL per-table QR codes as individual files
  const downloadAllTableQRs = async (downloadSize: "small" | "medium" | "large") => {
    const sizes = { small: 512, medium: 1024, large: 2048 };
    const width = sizes[downloadSize];
    toast({ title: "Preparing...", description: `Generating ${activeTableNumbers.length} QR codes` });

    for (const tableNum of activeTableNumbers) {
      const url = getTableScanUrl(tableNum);
      const tempCanvas = document.createElement("canvas");
      await generateQR(tempCanvas, width, config, url);
      const link = document.createElement("a");
      link.download = `qr-${locationLabel.toLowerCase()}-${tableNum}.png`;
      link.href = tempCanvas.toDataURL("image/png");
      link.click();
      // Small delay to avoid browser blocking multiple downloads
      await new Promise(r => setTimeout(r, 200));
    }
    toast({ title: "Done!", description: `${activeTableNumbers.length} QR codes downloaded` });
  };

  // Save QR mode and table config to DB
  const saveTableConfig = async (newMode: QRMode, newConfig: TableConfig) => {
    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ qr_mode: newMode, table_config: newConfig as any })
        .eq("id", restaurantId);
      if (error) throw error;
      setQrMode(newMode);
      setTableConfig(newConfig);
      toast({ title: "✅ Saved", description: "QR configuration updated" });
    } catch {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddSkip = () => {
    const num = parseInt(skipInput.trim());
    if (isNaN(num) || num < 1 || num > tableConfig.total) {
      toast({ title: "Invalid number", description: `Enter a number between 1 and ${tableConfig.total}`, variant: "destructive" });
      return;
    }
    if (tableConfig.skip.includes(num)) {
      toast({ title: "Already skipped", description: `${locationLabel} ${num} is already in the skip list` });
      return;
    }
    const newConfig = { ...tableConfig, skip: [...tableConfig.skip, num].sort((a, b) => a - b) };
    setTableConfig(newConfig);
    setSkipInput("");
  };

  const handleRemoveSkip = (num: number) => {
    const newConfig = { ...tableConfig, skip: tableConfig.skip.filter(n => n !== num) };
    setTableConfig(newConfig);
  };

  const handleTotalChange = () => {
    const num = parseInt(totalInput);
    if (isNaN(num) || num < 1 || num > 200) {
      toast({ title: "Invalid", description: "Total must be between 1 and 200", variant: "destructive" });
      return;
    }
    // Remove skips that are now out of range
    const newSkip = tableConfig.skip.filter(s => s <= num);
    setTableConfig(prev => ({ ...prev, total: num, skip: newSkip }));
  };

  const copyUrl = async (url?: string) => {
    const target = url || scanUrl;
    await navigator.clipboard.writeText(target);
    setCopied(true);
    toast({ title: "Copied!", description: "URL copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetConfig = () => {
    setConfig({
      style: 'standard',
      fgColor: '#000000',
      bgColor: '#FFFFFF',
      dotScale: 0.85,
      showLogo: false,
      frameStyle: 'rounded',
    });
  };

  const setColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setConfig(prev => ({ ...prev, fgColor: preset.fg, bgColor: preset.bg }));
  };

  const displayedTables = showAllTables ? activeTableNumbers : activeTableNumbers.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">QR Code Manager</h2>
          <p className="text-sm text-muted-foreground">Single QR for all or unique QR per {locationLabel.toLowerCase()}</p>
        </div>
        <Button 
          variant={showCustomize ? "default" : "outline"} 
          size="default"
          onClick={() => setShowCustomize(!showCustomize)}
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left ${
            activeTab === 'single'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
          }`}
        >
          <div className={`p-3 rounded-xl ${activeTab === 'single' ? 'bg-primary/10' : 'bg-muted'}`}>
            <QrIcon className={`h-6 w-6 ${activeTab === 'single' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${activeTab === 'single' ? 'text-primary' : ''}`}>Single QR</p>
            <p className="text-xs text-muted-foreground">One code for all {locationLabel.toLowerCase()}s</p>
          </div>
          {qrMode === 'single' && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs" variant="outline">Active</Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab('per_table')}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left ${
            activeTab === 'per_table'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
          }`}
        >
          <div className={`p-3 rounded-xl ${activeTab === 'per_table' ? 'bg-primary/10' : 'bg-muted'}`}>
            <Grid3X3 className={`h-6 w-6 ${activeTab === 'per_table' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${activeTab === 'per_table' ? 'text-primary' : ''}`}>Per {locationLabel} QR</p>
            <p className="text-xs text-muted-foreground">Unique QR per {locationLabel.toLowerCase()} number</p>
          </div>
          {qrMode === 'per_table' && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs" variant="outline">Active</Badge>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SINGLE QR MODE */}
        {activeTab === 'single' && (
          <motion.div key="single" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid lg:grid-cols-5 gap-6">
              <Card className="lg:col-span-3 overflow-hidden border-0 shadow-xl">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
                    <div className="max-w-sm mx-auto">
                      <motion.div layout className="relative bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
                        {config.frameStyle !== 'none' && (
                          <>
                            <div className={`absolute top-3 left-3 w-8 h-8 border-t-3 border-l-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-tl-xl' : 'rounded-tl-lg'}`} />
                            <div className={`absolute top-3 right-3 w-8 h-8 border-t-3 border-r-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-tr-xl' : 'rounded-tr-lg'}`} />
                            <div className={`absolute bottom-3 left-3 w-8 h-8 border-b-3 border-l-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-bl-xl' : 'rounded-bl-lg'}`} />
                            <div className={`absolute bottom-3 right-3 w-8 h-8 border-b-3 border-r-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-br-xl' : 'rounded-br-lg'}`} />
                          </>
                        )}
                        <motion.canvas ref={canvasRef} className="w-full aspect-square rounded-lg" style={{ imageRendering: "crisp-edges" }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} />
                        <div className="mt-4 text-center">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                            <Smartphone className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Scan to view menu</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 border-t">
                    <div className="grid grid-cols-4 gap-3">
                      <Button variant="outline" size="default" onClick={() => downloadQRCode("small")} className="flex-col h-auto py-3 gap-1"><Download className="h-4 w-4" /><span className="text-xs">Small</span></Button>
                      <Button variant="outline" size="default" onClick={() => downloadQRCode("medium")} className="flex-col h-auto py-3 gap-1"><Download className="h-4 w-4" /><span className="text-xs">Medium</span></Button>
                      <Button variant="outline" size="default" onClick={() => downloadQRCode("large")} className="flex-col h-auto py-3 gap-1"><Printer className="h-4 w-4" /><span className="text-xs">Print</span></Button>
                      <Button variant="outline" size="default" onClick={() => window.open(menuUrl, "_blank")} className="flex-col h-auto py-3 gap-1"><ExternalLink className="h-4 w-4" /><span className="text-xs">Preview</span></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence mode="wait">
                  {showCustomize ? (
                    <motion.div key="customize" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />QR Style</h3>
                            <Button variant="ghost" size="sm" onClick={resetConfig} className="h-8 px-3 text-xs"><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {QR_STYLES.map((style) => {
                              const Icon = style.icon;
                              return (
                                <motion.button key={style.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => setConfig(prev => ({ ...prev, style: style.dotStyle }))}
                                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${config.style === style.dotStyle ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                  <Icon className="h-5 w-5" />
                                  <span className="text-xs font-medium">{style.name}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-sm mb-4">🎨 Color Theme</h3>
                          <div className="grid grid-cols-4 gap-2">
                            {COLOR_PRESETS.map((preset) => {
                              const isGradient = preset.fg.startsWith('gradient:');
                              const displayColor = isGradient 
                                ? `linear-gradient(135deg, #${preset.fg.split(':')[1].split(',')[0]}, #${preset.fg.split(':')[1].split(',')[1]})`
                                : preset.fg;
                              return (
                                <motion.button key={preset.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => setColorPreset(preset)}
                                  className={`relative h-10 rounded-lg border-2 transition-all ${config.fgColor === preset.fg ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'}`}
                                  style={{ background: displayColor }} title={preset.name}
                                />
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-semibold">Dot Size</Label>
                            <span className="text-xs text-muted-foreground">{Math.round(config.dotScale * 100)}%</span>
                          </div>
                          <Slider value={[config.dotScale]} onValueChange={([value]) => setConfig(prev => ({ ...prev, dotScale: value }))} min={0.5} max={1} step={0.05} className="w-full" />
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-sm mb-4">🖼️ Frame Style</h3>
                          <div className="grid grid-cols-4 gap-2">
                            {(['none', 'simple', 'rounded', 'fancy'] as const).map((frame) => (
                              <Button key={frame} variant={config.frameStyle === frame ? "default" : "outline"} size="sm"
                                onClick={() => setConfig(prev => ({ ...prev, frameStyle: frame }))} className="capitalize text-xs h-9">{frame}</Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div key="info" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><QrIcon className="w-4 h-4 text-primary" />QR Scan Link</h3>
                          <div className="flex gap-2">
                            <div className="flex-1 p-3 bg-muted rounded-lg overflow-hidden">
                              <code className="text-xs break-all text-muted-foreground">{scanUrl}</code>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => copyUrl()} className="flex-shrink-0 h-10 w-10">
                              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">⏱️ Each scan creates a 90-minute session</p>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-sm mb-3">📋 Quick Tips</h3>
                          <div className="space-y-2 text-sm">
                            <p>• Print on white paper for best contrast</p>
                            <p>• Minimum size: 2x2 inches for tables</p>
                            <p>• Place in well-lit areas</p>
                            <p>• Test scan before printing bulk</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
                {qrMode !== 'single' && (
                  <Button className="w-full" onClick={() => saveTableConfig('single', tableConfig)} disabled={savingConfig}>
                    {savingConfig ? "Saving..." : "Switch to Single QR Mode"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* PER-TABLE QR MODE */}
        {activeTab === 'per_table' && (
          <motion.div key="per_table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Table Setup */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-5 space-y-5">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-primary" />
                    {locationLabel} Configuration
                  </h3>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total {locationLabel}s</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={totalInput} onChange={(e) => setTotalInput(e.target.value)} min={1} max={200} className="h-10" placeholder="e.g. 20" />
                      <Button variant="outline" onClick={handleTotalChange} className="h-10 px-4">Set</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{activeTableNumbers.length} active {locationLabel.toLowerCase()}s (1–{tableConfig.total}, minus skipped)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Skip Numbers</Label>
                    <p className="text-xs text-muted-foreground">Skip unlucky or unused numbers (e.g. 13, 113)</p>
                    <div className="flex gap-2">
                      <Input type="number" value={skipInput} onChange={(e) => setSkipInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSkip()} placeholder="e.g. 13" className="h-10" />
                      <Button variant="outline" onClick={handleAddSkip} className="h-10 px-4"><Plus className="h-4 w-4" /></Button>
                    </div>
                    {tableConfig.skip.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tableConfig.skip.map(num => (
                          <Badge key={num} variant="secondary" className="gap-1 pr-1">
                            {locationLabel} {num}
                            <button onClick={() => handleRemoveSkip(num)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={() => saveTableConfig('per_table', tableConfig)} disabled={savingConfig}>
                    {savingConfig ? "Saving..." : qrMode === 'per_table' ? "Save Configuration" : `Activate Per-${locationLabel} QR Mode`}
                  </Button>
                  {qrMode === 'per_table' && (
                    <Button variant="outline" className="w-full" onClick={() => saveTableConfig('single', tableConfig)} disabled={savingConfig}>
                      Switch back to Single QR
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Right: QR Preview */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <QrIcon className="h-5 w-5 text-primary" />
                    Preview
                    {selectedTableForPreview && <Badge variant="secondary">{locationLabel} {selectedTableForPreview}</Badge>}
                  </h3>
                  <div className="bg-white rounded-2xl p-4 shadow-inner flex items-center justify-center min-h-[200px]">
                    {selectedTableForPreview ? (
                      <div className="text-center w-full">
                        <canvas ref={canvasRef} className="w-full max-w-[200px] aspect-square rounded-lg mx-auto" style={{ imageRendering: "crisp-edges" }} />
                        <p className="text-sm font-semibold mt-2 text-zinc-700">{locationLabel} {selectedTableForPreview}</p>
                        <code className="text-xs text-zinc-400 break-all block mt-1">{getTableScanUrl(selectedTableForPreview)}</code>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Grid3X3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Select a {locationLabel.toLowerCase()} below to preview its QR code</p>
                      </div>
                    )}
                  </div>
                  {selectedTableForPreview && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadQRCode("medium", selectedTableForPreview)} className="gap-1">
                        <Download className="h-3.5 w-3.5" />Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyUrl(getTableScanUrl(selectedTableForPreview))} className="gap-1">
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        Copy URL
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Table Grid */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    All {locationLabel}s ({activeTableNumbers.length} active)
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => downloadAllTableQRs("medium")} className="gap-2">
                    <Layers className="h-4 w-4" />Download All
                  </Button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {displayedTables.map(num => (
                    <motion.button key={num} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTableForPreview(num === selectedTableForPreview ? null : num)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                        selectedTableForPreview === num
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-primary/50'
                      }`}
                    >
                      <QrIcon className={`h-5 w-5 ${selectedTableForPreview === num ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-bold ${selectedTableForPreview === num ? 'text-primary' : ''}`}>{num}</span>
                    </motion.button>
                  ))}
                </div>
                {activeTableNumbers.length > 12 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllTables(!showAllTables)} className="w-full mt-3 gap-2">
                    {showAllTables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showAllTables ? 'Show less' : `Show all ${activeTableNumbers.length} ${locationLabel.toLowerCase()}s`}
                  </Button>
                )}
                {tableConfig.skip.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Skipped: {tableConfig.skip.map(n => `${locationLabel} ${n}`).join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QRCodeDisplay;

      <div className="grid lg:grid-cols-5 gap-6">
        {/* QR Code Preview */}
        <Card className="lg:col-span-3 overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
              <div className="max-w-sm mx-auto">
                <motion.div 
                  layout
                  className="relative bg-white rounded-2xl p-6 md:p-8 shadow-2xl"
                >
                  {/* Corner decorations */}
                  {config.frameStyle !== 'none' && (
                    <>
                      <div className={`absolute top-3 left-3 w-8 h-8 border-t-3 border-l-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-tl-xl' : 'rounded-tl-lg'}`} />
                      <div className={`absolute top-3 right-3 w-8 h-8 border-t-3 border-r-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-tr-xl' : 'rounded-tr-lg'}`} />
                      <div className={`absolute bottom-3 left-3 w-8 h-8 border-b-3 border-l-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-bl-xl' : 'rounded-bl-lg'}`} />
                      <div className={`absolute bottom-3 right-3 w-8 h-8 border-b-3 border-r-3 border-primary ${config.frameStyle === 'fancy' ? 'rounded-br-xl' : 'rounded-br-lg'}`} />
                    </>
                  )}
                  
                  <motion.canvas 
                    ref={canvasRef} 
                    className="w-full aspect-square rounded-lg" 
                    style={{ imageRendering: "crisp-edges" }}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                  
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Scan to view menu</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Download buttons */}
            <div className="p-4 bg-muted/30 border-t">
              <div className="grid grid-cols-4 gap-3">
                <Button variant="outline" size="default" onClick={() => downloadQRCode("small")} className="flex-col h-auto py-3 gap-1">
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Small</span>
                </Button>
                <Button variant="outline" size="default" onClick={() => downloadQRCode("medium")} className="flex-col h-auto py-3 gap-1">
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Medium</span>
                </Button>
                <Button variant="outline" size="default" onClick={() => downloadQRCode("large")} className="flex-col h-auto py-3 gap-1">
                  <Printer className="h-4 w-4" />
                  <span className="text-xs">Print</span>
                </Button>
                <Button variant="outline" size="default" onClick={() => window.open(menuUrl, "_blank")} className="flex-col h-auto py-3 gap-1">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-xs">Preview</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Customization or Info */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {showCustomize ? (
              <motion.div
                key="customize"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Style Selection */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary" />
                        QR Style
                      </h3>
                      <Button variant="ghost" size="sm" onClick={resetConfig} className="h-8 px-3 text-xs">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {QR_STYLES.map((style) => {
                        const Icon = style.icon;
                        const isStandard = style.id === 'standard';
                        return (
                          <motion.button
                            key={style.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setConfig(prev => ({ ...prev, style: style.dotStyle }))}
                            className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                              config.style === style.dotStyle 
                                ? 'bg-primary text-primary-foreground shadow-lg' 
                                : 'bg-muted hover:bg-muted/80'
                            } ${isStandard ? 'ring-1 ring-green-500/30' : ''}`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-medium">{style.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Color Presets */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-4">🎨 Color Theme</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PRESETS.map((preset) => {
                        const isGradient = preset.fg.startsWith('gradient:');
                        const displayColor = isGradient 
                          ? `linear-gradient(135deg, #${preset.fg.split(':')[1].split(',')[0]}, #${preset.fg.split(':')[1].split(',')[1]})`
                          : preset.fg;
                        return (
                          <motion.button
                            key={preset.id}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setColorPreset(preset)}
                            className={`relative h-10 rounded-lg border-2 transition-all ${
                              config.fgColor === preset.fg 
                                ? 'border-primary ring-2 ring-primary/30' 
                                : 'border-transparent hover:border-muted-foreground/30'
                            }`}
                            style={{ background: displayColor }}
                            title={preset.name}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Dot Size */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Dot Size</Label>
                      <span className="text-xs text-muted-foreground">{Math.round(config.dotScale * 100)}%</span>
                    </div>
                    <Slider
                      value={[config.dotScale]}
                      onValueChange={([value]) => setConfig(prev => ({ ...prev, dotScale: value }))}
                      min={0.5}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                {/* Frame Style */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-4">🖼️ Frame Style</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {(['none', 'simple', 'rounded', 'fancy'] as const).map((frame) => (
                        <Button
                          key={frame}
                          variant={config.frameStyle === frame ? "default" : "outline"}
                          size="sm"
                          onClick={() => setConfig(prev => ({ ...prev, frameStyle: frame }))}
                          className="capitalize text-xs h-9"
                        >
                          {frame}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* QR Link */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <QrIcon className="w-4 h-4 text-primary" />
                      QR Scan Link
                    </h3>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 bg-muted rounded-lg overflow-hidden">
                        <code className="text-xs break-all text-muted-foreground">{scanUrl}</code>
                      </div>
                      <Button variant="outline" size="icon" onClick={copyUrl} className="flex-shrink-0 h-10 w-10">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      ⏱️ Each scan creates a 90-minute session
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Tips */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-3">📋 Quick Tips</h3>
                    <div className="space-y-2 text-sm">
                      <p>• Print on white paper for best contrast</p>
                      <p>• Minimum size: 2x2 inches for tables</p>
                      <p>• Place in well-lit areas</p>
                      <p>• Test scan before printing bulk</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Where to place */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm mb-3">💡 Where to place</h3>
                    <div className="flex flex-wrap gap-2">
                      {["Table tents", "Menu cards", "Wall posters", "Receipts", "Window", "Counter"].map(place => (
                        <span key={place} className="px-3 py-1 bg-background rounded-full text-xs font-medium">{place}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
