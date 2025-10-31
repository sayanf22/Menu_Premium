import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode as QrIcon, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  restaurantId: string;
}

const QRCodeDisplay = ({ restaurantId }: QRCodeDisplayProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const menuUrl = `${window.location.origin}/menu/${restaurantId}`;

  useEffect(() => {
    generateQRCode();
  }, [restaurantId]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(menuUrl, {
        width: 500,
        margin: 2,
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

  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.download = `restaurant-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Your QR Code</h2>
        <p className="text-muted-foreground">
          Download and print this QR code for your customers to scan
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrIcon className="h-5 w-5 text-primary" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {qrCodeUrl && (
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <img src={qrCodeUrl} alt="Restaurant QR Code" className="w-64 h-64" />
              </div>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="hero" onClick={downloadQRCode} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open(menuUrl, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Menu
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300">
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Step 1: Download</h4>
              <p className="text-sm text-muted-foreground">
                Click the download button to save your QR code
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Step 2: Print</h4>
              <p className="text-sm text-muted-foreground">
                Print the QR code on table tents, menus, or posters
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Step 3: Display</h4>
              <p className="text-sm text-muted-foreground">
                Place the QR code where customers can easily scan it
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Menu URL:</h4>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-xs break-all">{menuUrl}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeDisplay;