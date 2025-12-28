import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Download, QrCode as QrIcon, ExternalLink, Copy, Check, Smartphone, Printer,
  Palette, Circle, Square, Diamond, Hexagon, Star, Settings2, RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";

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
  const [copied, setCopied] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // QR Configuration state - default to standard (universal) style
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

  // Parse gradient colors
  const parseColor = (color: string): { isGradient: boolean; colors: string[] } => {
    if (color.startsWith('gradient:')) {
      return { isGradient: true, colors: color.replace('gradient:', '').split(',').map(c => `#${c}`) };
    }
    return { isGradient: false, colors: [color] };
  };

  const generateQR = useCallback(async (canvas: HTMLCanvasElement, size: number, cfg: QRConfig = config) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const qrData = await QRCode.create(scanUrl, { errorCorrectionLevel: "H" });
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
      generateQR(canvasRef.current, 400);
    }
  }, [restaurantId, generateQR, config]);

  const downloadQRCode = async (downloadSize: "small" | "medium" | "large") => {
    const sizes = { small: 512, medium: 1024, large: 2048 };
    const width = sizes[downloadSize];
    
    const tempCanvas = document.createElement("canvas");
    await generateQR(tempCanvas, width);
    
    const link = document.createElement("a");
    link.download = `menu-qr-${config.style}-${downloadSize}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
    
    toast({ title: "Downloaded!", description: `QR code saved (${width}x${width}px)` });
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "QR scan URL copied to clipboard" });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">Your QR Code</h2>
          <p className="text-sm text-muted-foreground">Customizable QR code for your menu</p>
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
