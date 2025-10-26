
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, ImageUp, Loader2, RefreshCw, ScanLine, X } from 'lucide-react';
import { type AnalyzeImageOutput } from '@/lib/types';
import { analyzeImageAction } from '@/app/actions';

interface ImageAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BillScanner({ isOpen, onClose }: ImageAnalyzerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImageOutput | null>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);
  
  const startCamera = useCallback(async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play(); // Explicitly play the video
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (!analysisResult) {
        startCamera();
      }
    } else {
      stopCamera();
    }
    
    // Cleanup function to stop camera when component unmounts or dialog closes
    return () => {
        stopCamera();
    };
  }, [isOpen, analysisResult, startCamera, stopCamera]);
  
  const handleClose = () => {
    setAnalysisResult(null);
    setIsScanning(false);
    onClose();
  };

  const processImage = useCallback(async (dataUri: string) => {
    setIsScanning(true);
    stopCamera();

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
        };
        img.src = dataUri;
    }

    try {
        const result = await analyzeImageAction({ photoDataUri: dataUri });
        setAnalysisResult(result);

        if (!result.description) {
            toast({ title: "Analysis Complete", description: "The AI couldn't describe the image." });
        }
    } catch (error: any) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: error.message || 'The AI failed to process the image.',
        });
        setAnalysisResult({ description: 'Analysis failed. Please try again.' });
    } finally {
        setIsScanning(false);
    }
  }, [stopCamera, toast]);


  const handleCaptureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg');
      processImage(dataUri);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        if(dataUri) {
          processImage(dataUri);
        }
      };
      reader.readAsDataURL(file);
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleRetry = () => {
    setAnalysisResult(null);
    if(canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    startCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analyze Image</DialogTitle>
          <DialogDescription>
            Point your camera at an image, or upload one. The AI will describe what it sees.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
            <video
                ref={videoRef}
                className={`h-full w-full object-cover ${analysisResult || !hasCameraPermission ? 'hidden' : ''}`}
                autoPlay
                playsInline
                muted
            />
            
            {isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white z-10">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin" />
                    <p className="text-lg font-semibold">Analyzing...</p>
                    <p className="text-sm">This may take a moment.</p>
                </div>
            )}

            {(hasCameraPermission === false && !analysisResult) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4">
                    <Alert variant="destructive">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                        Please allow camera access in your browser settings to use the scanner, or upload an image instead.
                        </AlertDescription>
                    </Alert>
                 </div>
            )}

             <canvas ref={canvasRef} className={`h-full w-full object-contain ${!analysisResult ? 'hidden' : ''}`} />
        </div>
        
        <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
        />

        {analysisResult && (
            <div>
                <h3 className="font-semibold mb-2">AI Description:</h3>
                {analysisResult.description && analysisResult.description !== 'Analysis failed. Please try again.' ? (
                    <div className="max-h-60 overflow-y-auto rounded-md border p-4 bg-muted/50">
                        <p className="text-foreground">{analysisResult.description}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                        <ScanLine className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No description generated</h3>
                        <p className="text-muted-foreground">The AI could not describe the image. Please try again.</p>
                    </div>
                )}
            </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-between">
          <div>
            {!analysisResult ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCaptureAndScan} disabled={!hasCameraPermission || isScanning} className="flex-1 sm:flex-initial">
                  {isScanning ? <Loader2 className="mr-2 animate-spin" /> : <Camera className="mr-2" />}
                  Capture & Analyze
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex-1 sm:flex-initial">
                   {isScanning ? <Loader2 className="mr-2 animate-spin" /> : <ImageUp className="mr-2" />}
                   Upload Image
                </Button>
              </div>
            ) : (
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRetry}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Analyze Another
                    </Button>
                </div>
            )}
          </div>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
