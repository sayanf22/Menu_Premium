import { useEffect, useState, useRef } from "react";
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
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuUrl = `${window.location.origin}/menu/${restaurantId}`;

  useEffect(() => {
    generateQRCode();
  }, [restaurantId]);

  const generateQRCode = async () => {
    try {
      // Generate high-quality QR code with better error correction for distance scanning
      const url = await QRCode.toDataURL(menuUrl, {
        width: 1024,
        margin: 3,
        errorCorrectionLevel: 'H', // Highest error correction - better for distance
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const downloadQRCode = (size: 'small' | 'medium' | 'large') => {
    const sizes = { small: 512, medium: 1024, large: 2048 };
    const width = sizes[size];
    
    QRCode.toDataURL(menuUrl, {
      width,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then(url => {
      const link = document.createElement("a");
      link.download = `menu-qr-code-${size}.png`;
      link.href = url;
      link.click();
      toast({
        title: "Downloaded!",
        description: `QR code saved (${width}x${width}px)`,
      });
    });
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "Menu URL copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Your QR Code</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Print and display for customers to scan and view your menu
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* QR Code Display - Main Focus */}
        <Card className="lg:col-span-3 overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            {/* Modern QR Code Container */}
            <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10">
              <div className="max-w-sm mx-auto">
                {/* QR Frame with modern styling */}
                <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-2xl">
                  {/* Corner accents */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                  
                  {/* QR Code */}
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="Restaurant QR Code" 
                      className="w-full aspect-square rounded-xl"
                    />
                  )}
                  
                  {/* Scan instruction */}
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Scan to view menu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 md:p-6 bg-muted/30 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => downloadQRCode('small')}
                  className="flex-col h-auto py-3 gap-1"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Small</span>
                  <span className="text-[10px] text-muted-foreground">512px</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => downloadQRCode('medium')}
                  className="flex-col h-auto py-3 gap-1"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-xs">Medium</span>
                  <span className="text-[10px] text-muted-foreground">1024px</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => downloadQRCode('large')}
                  className="flex-col h-auto py-3 gap-1"
                >
                  <Printer className="h-4 w-4" />
                  <span className="text-xs">Print</span>
                  <span className="text-[10px] text-muted-foreground">2048px</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(menuUrl, '_blank')}
                  className="flex-col h-auto py-3 gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-xs">Preview</span>
                  <span className="text-[10px] text-muted-foreground">Menu</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions & URL */}
        <div className="lg:col-span-2 space-y-4">
          {/* Menu URL Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 md:p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <QrIcon className="w-4 h-4 text-primary" />
                Menu Link
              </h3>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg overflow-hidden">
                  <code className="text-xs break-all text-muted-foreground">{menuUrl}</code>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyUrl}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 md:p-5">
              <h3 className="font-semibold text-sm mb-4">📋 Quick Tips</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Use high contrast</p>
                    <p className="text-xs text-muted-foreground">Print on white paper for best scanning</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Size matters</p>
                    <p className="text-xs text-muted-foreground">Minimum 2x2 inches for table tents</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Good lighting</p>
                    <p className="text-xs text-muted-foreground">Avoid placing in dark areas</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Test before printing</p>
                    <p className="text-xs text-muted-foreground">Scan with your phone first</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placement Ideas */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4 md:p-5">
              <h3 className="font-semibold text-sm mb-3">💡 Where to place</h3>
              <div className="flex flex-wrap gap-2">
                {['Table tents', 'Menu cards', 'Wall posters', 'Receipts', 'Window', 'Counter'].map(place => (
                  <span key={place} className="px-3 py-1 bg-background rounded-full text-xs font-medium">
                    {place}
                  </span>
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
