import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose?: () => void;
  title?: string;
}

export const BarcodeScanner = ({ onScan, onClose, title = 'Scan Barcode' }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setError(null);
    } catch (err: any) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  // Use BarcodeDetector API if available, else fall back to manual input
  useEffect(() => {
    if (!active || !videoRef.current) return;

    // Check for BarcodeDetector support
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
      });

      let animId: number;
      const detect = async () => {
        if (!videoRef.current || !active) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            onScan(code);
            stopCamera();
            return;
          }
        } catch { /* detection cycle */ }
        animId = requestAnimationFrame(detect);
      };
      detect();
      return () => cancelAnimationFrame(animId);
    }
    return undefined;
  }, [active, onScan, stopCamera]);

  const [manualCode, setManualCode] = useState('');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanLine className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose(); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!active ? (
          <div className="space-y-3">
            <Button onClick={startCamera} className="w-full gap-2">
              <Camera className="h-4 w-4" /> Open Camera Scanner
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or enter manually</span></div>
            </div>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter barcode / QR code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && manualCode.trim()) { onScan(manualCode.trim()); setManualCode(''); } }}
              />
              <Button onClick={() => { if (manualCode.trim()) { onScan(manualCode.trim()); setManualCode(''); } }}>
                Submit
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 h-1/3 border-2 border-primary/60 rounded-lg" />
            </div>
            {error && <p className="text-destructive text-xs p-2">{error}</p>}
            <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={stopCamera}>
              Stop
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
