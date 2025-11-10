'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Check, RotateCcw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';

export type BatchDetailsOutput = {
  batchNumber?: string;
  mfgDate?: string;
  expDate?: string;
  mrp?: number;
};

interface OcrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (data: BatchDetailsOutput) => void;
}

export function OcrScannerDialog({ open, onOpenChange, onScanSuccess }: OcrScannerDialogProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const [batchDetails, setBatchDetails] = useState<BatchDetailsOutput>({
    batchNumber: '',
    mfgDate: '',
    expDate: '',
    mrp: undefined,
  });

  const getCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: 'Your browser does not support camera access.',
        });
        setHasCameraPermission(false);
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
        if (hasCameraPermission === null) {
            getCameraPermission();
        }
    } else {
        // Reset state when closing
        setCapturedImage(null);
        setHasCameraPermission(null);
        setBatchDetails({ batchNumber: '', mfgDate: '', expDate: '', mrp: undefined });
        // Stop video stream
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }
  }, [open, hasCameraPermission, getCameraPermission]);


  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUri);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setBatchDetails({ batchNumber: '', mfgDate: '', expDate: '', mrp: undefined });
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    onScanSuccess(batchDetails);
  };
  
  const handleInputChange = (field: keyof BatchDetailsOutput, value: string) => {
    setBatchDetails(prev => ({...prev, [field]: value}));
  }

  const renderInitialView = () => (
     <div className="my-4 relative">
          {hasCameraPermission === null && (
            <div className="flex items-center justify-center h-48 bg-muted rounded-md">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Requesting camera access...</p>
            </div>
          )}
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser to use this feature. You may need to refresh the page after granting permission.
              </AlertDescription>
            </Alert>
          )}
          {hasCameraPermission && (
             <video
                ref={videoRef}
                className={"w-full aspect-video rounded-md"}
                autoPlay
                muted
                playsInline
              />
          )}
        </div>
  );

  const renderCapturedView = () => (
    <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <img src={capturedImage!} alt="Captured medicine" className="w-full aspect-video rounded-md" />
        <div className="space-y-3">
            <div>
                <Label htmlFor="ocr-batch">Batch Number</Label>
                <Input id="ocr-batch" value={batchDetails.batchNumber} onChange={(e) => handleInputChange('batchNumber', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="ocr-mrp">MRP</Label>
                <Input id="ocr-mrp" type="number" value={batchDetails.mrp ?? ''} onChange={(e) => handleInputChange('mrp', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label htmlFor="ocr-mfg">MFG Date</Label>
                    <Input id="ocr-mfg" type="month" value={batchDetails.mfgDate} onChange={(e) => handleInputChange('mfgDate', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="ocr-exp">Expiry Date</Label>
                    <Input id="ocr-exp" type="month" value={batchDetails.expDate} onChange={(e) => handleInputChange('expDate', e.target.value)} />
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Scan Batch Details</DialogTitle>
          <DialogDescription>
            {capturedImage 
                ? 'Review the captured image and manually enter the batch details.' 
                : 'Position the medicine\'s batch information within the frame and capture.'
            }
          </DialogDescription>
        </DialogHeader>
        
        {capturedImage ? renderCapturedView() : renderInitialView()}
        
        <DialogFooter>
          {!capturedImage ? (
            <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
              <Camera className="mr-2" /> Capture
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button onClick={handleRetake} variant="outline" className="flex-1">
                <RotateCcw className="mr-2" /> Retake
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                <Check className="mr-2" />
                Confirm Details
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
