
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { createWorker } from 'tesseract.js';
import { Progress } from '@/components/ui/progress';
import { Camera, RefreshCcw, Zap } from 'lucide-react';

type ScanMode = 'batchOnly';
type ScanResult = { batchNumber?: string, mfg?: string, expiry?: string };


interface OcrScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanSuccess: (result: ScanResult) => void;
    scanMode?: ScanMode;
}

const monthMap: { [key: string]: string } = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

const parseText = (text: string): ScanResult => {
    let batchNumber: string | undefined = undefined;
    let mfg: string | undefined = undefined;
    let expiry: string | undefined = undefined;
    
    // Look for Batch Number
    const batchRegex = /(?:Batch\s*No\.?|B\.\s*No\.?)\s*([A-Z0-9\-/]+)/i;
    const batchMatch = text.match(batchRegex);
    if (batchMatch && batchMatch[1]) {
        batchNumber = batchMatch[1];
    } else {
        // Fallback for cases like the image where the value is separate
        const lines = text.split('\n');
        const batchLineIndex = lines.findIndex(line => line.match(/Batch\s*No/i));
        if (batchLineIndex > 0) {
            // Check the line above or the same line for a potential value
            const potentialBatch = lines[batchLineIndex - 1].trim();
            if (potentialBatch.match(/^[A-Z0-9-/]{5,}$/i)) {
                 batchNumber = potentialBatch;
            }
        }
        // Last resort: find any long alphanumeric string
        if (!batchNumber) {
            const genericBatchMatch = text.match(/([A-Z0-9]{5,}[A-Z][0-9]{2,})/i);
             if(genericBatchMatch) batchNumber = genericBatchMatch[0];
        }
    }


    // Look for MFG and Expiry Dates
    const dateRegex = /(Mfg\.|Mfd\.|Exp\.)\s*[:.]?\s*([A-Z]{3})\.?\s*(\d{4}|\d{2})/gi;
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
        const type = match[1].toLowerCase();
        const month = match[2].toUpperCase();
        const year = match[3].length === 2 ? `20${match[3]}` : match[3];

        if (monthMap[month]) {
            if (type.startsWith('mfg') || type.startsWith('mfd')) {
                mfg = `${year}-${monthMap[month]}`;
            } else if (type.startsWith('exp')) {
                expiry = `${year}-${monthMap[month]}`;
            }
        }
    }
    
    // Fallback if regex fails, based on the image provided
    if (!mfg || !expiry) {
        const lines = text.split('\n').map(l => l.trim());
        const mfgLineIndex = lines.findIndex(l => l.match(/Mfg\./i));
        const expLineIndex = lines.findIndex(l => l.match(/Exp\./i));
        if (mfgLineIndex !== -1 && mfgLineIndex > 0) {
             const potentialDateLine = lines[mfgLineIndex-1];
             const dateMatch = potentialDateLine.match(/([A-Z]{3})\.?\s*(\d{4}|\d{2})/i);
             if (dateMatch && monthMap[dateMatch[1].toUpperCase()]) {
                 mfg = `${dateMatch[2].length === 2 ? `20${dateMatch[2]}` : dateMatch[2]}-${monthMap[dateMatch[1].toUpperCase()]}`;
             }
        }
         if (expLineIndex !== -1 && expLineIndex > 0) {
             const potentialDateLine = lines[expLineIndex-1];
             const dateMatch = potentialDateLine.match(/([A-Z]{3})\.?\s*(\d{4}|\d{2})/i);
             if (dateMatch && monthMap[dateMatch[1].toUpperCase()]) {
                 expiry = `${dateMatch[2].length === 2 ? `20${dateMatch[2]}` : dateMatch[2]}-${monthMap[dateMatch[1].toUpperCase()]}`;
             }
         }
    }


    return { batchNumber, mfg, expiry };
};


export function OcrScannerDialog({
    open,
    onOpenChange,
    onScanSuccess,
    scanMode = 'batchOnly',
}: OcrScannerDialogProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [ocrStatus, setOcrStatus] = useState<{ progress: number, status: string } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const { toast } = useToast();
    const workerRef = useRef<Tesseract.Worker | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const getCameraPermission = async () => {
            if (open) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
                        description: 'Please enable camera permissions to use this feature.',
                    });
                }
            }
        };

        getCameraPermission();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setCapturedImage(null);
            setOcrStatus(null);
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [open, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                setCapturedImage(canvas.toDataURL('image/png'));
            }
        }
    };
    
    const handleRetake = () => {
        setCapturedImage(null);
        setOcrStatus(null);
    }

    const handleProcessImage = async () => {
        if (!capturedImage) return;

        setOcrStatus({ status: 'Initializing OCR Engine...', progress: 0 });
        
        const worker = await createWorker({
            logger: m => {
                if (m.status === 'recognizing text' && m.progress) {
                     setOcrStatus({ status: 'Recognizing Text...', progress: Math.round(m.progress * 100) });
                }
            }
        });
        workerRef.current = worker;
        
        try {
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            const { data: { text } } = await worker.recognize(capturedImage);
            
            const parsedData = parseText(text);

            onScanSuccess(parsedData);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'OCR Failed', description: 'Could not recognize text from the image.' });
        } finally {
            await worker.terminate();
            workerRef.current = null;
            setOcrStatus(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Scan Batch Details from Image</DialogTitle>
                    <DialogDescription>
                        {capturedImage ? 'Review the captured image or retake.' : 'Capture a clear photo of the batch details.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="relative w-full border rounded-lg overflow-hidden aspect-video bg-muted">
                        <video 
                            ref={videoRef} 
                            className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`} 
                            autoPlay 
                            playsInline 
                            muted 
                        />
                        {capturedImage && <img src={capturedImage} alt="Captured medicine" className="w-full h-full object-contain" />}
                         <canvas ref={canvasRef} className="hidden"></canvas>
                         {hasCameraPermission === false && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <Alert variant="destructive" className="m-4">
                                    <AlertTitle>Camera Access Required</AlertTitle>
                                    <AlertDescription>
                                        Please enable camera permissions in your browser settings.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                    {ocrStatus && (
                        <div className="space-y-2">
                           <p className="text-sm text-center font-medium capitalize text-muted-foreground">{ocrStatus.status}</p>
                           <Progress value={ocrStatus.progress} />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    {capturedImage ? (
                         <div className="w-full flex justify-between">
                            <Button variant="outline" onClick={handleRetake} disabled={!!ocrStatus}>
                                <RefreshCcw className="mr-2" /> Retake
                            </Button>
                            <Button onClick={handleProcessImage} disabled={!!ocrStatus}>
                                <Zap className="mr-2" /> Process Image
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={handleCapture} disabled={!hasCameraPermission}>
                            <Camera className="mr-2" /> Capture
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
