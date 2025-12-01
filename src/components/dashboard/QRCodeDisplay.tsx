import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode as QrIcon, ExternalLink, Copy, Check, Smartphone, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  restaurantId: string;
}

const QRCodeDisplay = ({ restaurantId }: QRCodeDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // QR code points to /scan/ which creates a session and redirects to menu
  // This ensures each scan creates a fresh 90-minute session
  const scanUrl = `${window.location.origin}/scan/${restaurantId}`;
  // Direct menu URL for backward compatibility (works without session)
  const menuUrl = `${window.location.origin}/menu/${restaurantId}`;

  const generateModernQR = useCallback(async (canvas: HTMLCanvasElement, size: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use scanUrl for QR code - creates session on scan
    const qrData = await QRCode.create(scanUrl, { errorCorrectionLevel: "H" });
    const modules = qrData.modules;
    const moduleCount = modules.size;
    
    const margin = Math.floor(size * 0.1);
    const qrSize = size - margin * 2;
    const dotSize = qrSize / moduleCount;
    const dotRadius = dotSize * 0.42;
    
    canvas.width = size;
    canvas.height = size;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000000";
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = margin + col * dotSize + dotSize / 2;
          const y = margin + row * dotSize + dotSize / 2;
          
          const isFinderOuter = 
            (row < 7 && col < 7) ||
            (row < 7 && col >= moduleCount - 7) ||
            (row >= moduleCount - 7 && col < 7);
          
          const isFinderInner = 
            ((row >= 2 && row <= 4) && (col >= 2 && col <= 4)) ||
            ((row >= 2 && row <= 4) && (col >= moduleCount - 5 && col <= moduleCount - 3)) ||
            ((row >= moduleCount - 5 && row <= moduleCount - 3) && (col >= 2 && col <= 4));
          
          if (isFinderInner) {
            ctx.beginPath();
            ctx.roundRect(
              margin + col * dotSize + dotSize * 0.1,
              margin + row * dotSize + dotSize * 0.1,
              dotSize * 0.8,
              dotSize * 0.8,
              dotSize * 0.2
            );
            ctx.fill();
          } else if (isFinderOuter) {
            ctx.beginPath();
            ctx.roundRect(
              margin + col * dotSize + dotSize * 0.05,
              margin + row * dotSize + dotSize * 0.05,
              dotSize * 0.9,
              dotSize * 0.9,
              dotSize * 0.15
            );
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }, [scanUrl]);

  useEffect(() => {
    if (canvasRef.current) {
      generateModernQR(canvasRef.current, 400);
    }
  }, [restaurantId, generateModernQR]);

  const downloadQRCode = async (downloadSize: "small" | "medium" | "large") => {
    const sizes = { small: 512, medium: 1024, large: 2048 };
    const width = sizes[downloadSize];
    
    const tempCanvas = document.createElement("canvas");
    await generateModernQR(tempCanvas, width);
    
    const link = document.createElement("a");
    link.download = `menu-qr-${downloadSize}.png`;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Your QR Code</h2>
        <p className="text-sm md:text-base text-muted-foreground">Modern rounded QR code for easy scanning</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10">
              <div className="max-w-sm mx-auto">
                <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-2xl">
                  <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                  
                  <canvas ref={canvasRef} className="w-full aspect-square rounded-xl" style={{ imageRendering: "crisp-edges" }} />
                  
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Scan to view menu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-muted/30 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                <Button variant="outline" onClick={() => downloadQRCode("small")} className="flex-col h-auto py-3 gap-1">
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Small</span>
                  <span className="text-[10px] text-muted-foreground">512px</span>
                </Button>
                <Button variant="outline" onClick={() => downloadQRCode("medium")} className="flex-col h-auto py-3 gap-1">
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Medium</span>
                  <span className="text-[10px] text-muted-foreground">1024px</span>
                </Button>
                <Button variant="outline" onClick={() => downloadQRCode("large")} className="flex-col h-auto py-3 gap-1">
                  <Printer className="h-4 w-4" />
                  <span className="text-xs">Print</span>
                  <span className="text-[10px] text-muted-foreground">2048px</span>
                </Button>
                <Button variant="outline" onClick={() => window.open(menuUrl, "_blank")} className="flex-col h-auto py-3 gap-1">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-xs">Preview</span>
                  <span className="text-[10px] text-muted-foreground">Menu</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 md:p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <QrIcon className="w-4 h-4 text-primary" />
                QR Scan Link
              </h3>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg overflow-hidden">
                  <code className="text-xs break-all text-muted-foreground">{scanUrl}</code>
                </div>
                <Button variant="outline" size="icon" onClick={copyUrl} className="flex-shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⏱️ Each scan creates a 90-minute session
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 md:p-5">
              <h3 className="font-semibold text-sm mb-4">📋 Quick Tips</h3>
              <div className="space-y-3 text-sm">
                <p>• Print on white paper for best contrast</p>
                <p>• Minimum size: 2x2 inches for tables</p>
                <p>• Place in well-lit areas</p>
                <p>• Test scan before printing bulk</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4 md:p-5">
              <h3 className="font-semibold text-sm mb-3">💡 Where to place</h3>
              <div className="flex flex-wrap gap-2">
                {["Table tents", "Menu cards", "Wall posters", "Receipts", "Window", "Counter"].map(place => (
                  <span key={place} className="px-3 py-1 bg-background rounded-full text-xs font-medium">{place}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
