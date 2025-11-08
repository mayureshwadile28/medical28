
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, RefreshCcw, Check, Zap } from 'lucide-react';
import { extractBatchDetailsAction } from '@/app/actions';

// We get the output type by inferring it from the return type of the action
type ExtractBatchDetailsOutput = Awaited<ReturnType<typeof extractBatchDetailsAction>>;


interface AiScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanSuccess: (result: ExtractBatchDetailsOutput) => void;
}

export function AiScannerDialog({ open, onOpenChange, onScanSuccess }: AiScannerDialogProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera permission error:", err);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Camera Error',
                description: 'Could not access camera. Please check permissions.',
            });
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        if (open) {
            startCamera();
        } else {
            stopCamera();
            setCapturedImage(null);
        }

        return () => {
            stopCamera();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUri = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUri);
                stopCamera();
            }
        }
    };
    
    const handleRetake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const handleConfirm = async () => {
        if (!capturedImage) return;

        setIsProcessing(true);
        try {
            const blob = await (await fetch(capturedImage)).blob();
            const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
            
            const formData = new FormData();
            formData.append('image', file);

            const result = await extractBatchDetailsAction(formData);

            toast({
                title: 'Scan Successful',
                description: 'Extracted batch details from the image.',
            });
            onScanSuccess(result);

        } catch (error: any) {
            console.error("AI processing error:", error);
            toast({
                variant: 'destructive',
                title: 'AI Scan Failed',
                description: error.message || 'Could not extract details from the image. Please try again with a clearer picture.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Scan Batch Details with AI</DialogTitle>
                    <DialogDescription>
                        {capturedImage ? 'Confirm the image or retake.' : 'Point your camera at the batch details on the medicine box.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="w-full border rounded-lg overflow-hidden aspect-video relative bg-muted">
                        {!capturedImage && (
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        )}
                        {capturedImage && (
                            <img src={capturedImage} alt="Captured medicine batch details" className="w-full h-full object-contain" />
                        )}
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p>AI is analyzing the image...</p>
                            </div>
                        )}
                    </div>
                     <canvas ref={canvasRef} className="hidden"></canvas>
                    {hasCameraPermission === false && (
                         <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please enable camera permissions in your browser settings to use the scanner.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    {!capturedImage ? (
                        <>
                         <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                         <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>
                             <Camera className="mr-2" /> Capture
                         </Button>
                        </>
                    ) : (
                         <>
                         <Button variant="outline" onClick={handleRetake} disabled={isProcessing}>
                             <RefreshCcw className="mr-2" /> Retake
                         </Button>
                         <Button onClick={handleConfirm} disabled={isProcessing}>
                             <Zap className="mr-2" /> Use AI
                         </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
