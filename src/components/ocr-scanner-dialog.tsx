'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { extractBatchDetailsAction } from '@/app/actions';
import { type BatchDetailsOutput } from '@/ai/flows/extract-batch-details-flow';
import { Loader2, Camera, Check, RotateCcw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface OcrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (data: BatchDetailsOutput) => void;
}

export function OcrScannerDialog({ open, onOpenChange, onScanSuccess }: OcrScannerDialogProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

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
    if (open && hasCameraPermission === null) {
      getCameraPermission();
    }
    // Cleanup function to stop video stream when component unmounts or dialog closes
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, getCameraPermission, hasCameraPermission]);

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
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const result = await extractBatchDetailsAction({ imageDataUri: capturedImage });
      toast({
        title: 'Scan Successful!',
        description: 'Batch details have been extracted and filled.',
      });
      onScanSuccess(result);
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast({
        variant: 'destructive',
        title: 'Processing Failed',
        description: error.message || 'Could not extract details from the image. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Batch Details</DialogTitle>
          <DialogDescription>
            Position the medicine's batch information within the frame and capture.
          </DialogDescription>
        </DialogHeader>
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
            <div className="relative">
              <video
                ref={videoRef}
                className={cn("w-full aspect-video rounded-md", capturedImage ? 'hidden' : 'block')}
                autoPlay
                muted
                playsInline
              />
              {capturedImage && (
                <img src={capturedImage} alt="Captured medicine" className="w-full aspect-video rounded-md" />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {!capturedImage ? (
            <Button onClick={handleCapture} disabled={!hasCameraPermission || isProcessing} className="w-full">
              <Camera className="mr-2" /> Capture
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button onClick={handleRetake} variant="outline" className="flex-1">
                <RotateCcw className="mr-2" /> Retake
              </Button>
              <Button onClick={handleConfirm} disabled={isProcessing} className="flex-1">
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2" />
                )}
                Confirm
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
