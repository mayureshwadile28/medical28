
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { createWorker } from 'tesseract.js';
import { Progress } from '@/components/ui/progress';
import { Camera, RefreshCcw, Check, Zap } from 'lucide-react';

type ScanMode = 'full' | 'batchOnly';
type ScanResult<T extends ScanMode> = T extends 'full'
    ? {
          name?: string;
          category?: string;
          batchNumber?: string;
          mfg?: string;
          expiry?: string;
      }
    : { batchNumber?: string, mfg?: string, expiry?: string };


interface OcrScannerDialogProps<T extends ScanMode> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanSuccess: (result: ScanResult<T>) => void;
    scanMode?: T;
}

const monthMap: { [key: string]: string } = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

const parseText = (text: string) => {
    let name: string | undefined = undefined;
    let category: string | undefined = undefined;
    
    // Name and Category Extraction (improved logic)
    const categoryKeywords = ['Tablets', 'Tablet', 'Capsules', 'Capsule', 'Syrup', 'Ointment', 'Injection'];
    const lines = text.split('\n');
    for (const line of lines) {
        const foundKeyword = categoryKeywords.find(keyword => line.toLowerCase().includes(keyword.toLowerCase()));
        if (foundKeyword) {
            let potentialName = line.replace(new RegExp(foundKeyword, 'i'), '').trim();
            // Often the brand name is before the composition, so let's try to find it
            const compositionMatch = text.match(/Composition:([\s\S]*?)(?=Dosage:|Indications:|$)/i);
            if (compositionMatch && compositionMatch[1]) {
                 const nameFromComposition = compositionMatch[1].split('\n')[0].trim();
                 if (nameFromComposition.length > 2) name = nameFromComposition;
            }
            if (!name && potentialName.length > 2) name = potentialName;
            
            category = foundKeyword.endsWith('s') && foundKeyword !== 'Capsules' ? foundKeyword.slice(0, -1) : foundKeyword;
            if (category === 'Capsules') category = 'Capsule';
            break; 
        }
    }


    const batchRegex = /(?:B\.\s*No\.|Batch\s*No|B\.N)\s*[:.]?\s*([A-Z0-9\-/]+)/i;
    const batchMatch = text.match(batchRegex);
    const batchNumber = batchMatch ? batchMatch[1] : undefined;

    const mfgRegex = /(?:Mfg\.|Mfd\.|M\.?D\.)\s*[:.]?\s*([A-Z]{3})\.?\s*(\d{4}|\d{2})/i;
    const mfgMatch = text.match(mfgRegex);
    let mfg: string | undefined = undefined;
    if (mfgMatch && monthMap[mfgMatch[1].toUpperCase()]) {
        const year = mfgMatch[2].length === 2 ? `20${mfgMatch[2]}` : mfgMatch[2];
        mfg = `${year}-${monthMap[mfgMatch[1].toUpperCase()]}`;
    }

    const expiryRegex = /(?:Exp\.|Expiry|E\.?D\.)\s*[:.]?\s*([A-Z]{3})\.?\s*(\d{4}|\d{2})/i;
    const expiryMatch = text.match(expiryRegex);
    let expiry: string | undefined = undefined;
    if (expiryMatch && monthMap[expiryMatch[1].toUpperCase()]) {
        const year = expiryMatch[2].length === 2 ? `20${expiryMatch[2]}` : expiryMatch[2];
        expiry = `${year}-${monthMap[expiryMatch[1].toUpperCase()]}`;
    }
    
    return { name, category, batchNumber, mfg, expiry };
};


export function OcrScannerDialog<T extends ScanMode = 'full'>({
    open,
    onOpenChange,
    onScanSuccess,
    scanMode = 'full' as T,
}: OcrScannerDialogProps<T>) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [ocrStatus, setOcrStatus] = useState<{ progress: number, status: string } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const { toast } = useToast();

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

        const worker = await createWorker({
            logger: m => {
                if (m.status === 'recognizing text') {
                    setOcrStatus({ status: 'Recognizing Text...', progress: Math.round(m.progress * 100) });
                } else {
                    setOcrStatus({ status: m.status.replace(/_/g, ' '), progress: 0 });
                }
            }
        });
        
        try {
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data: { text } } = await worker.recognize(capturedImage);
            
            const parsedData = parseText(text);

            if (scanMode === 'batchOnly') {
                onScanSuccess({ batchNumber: parsedData.batchNumber, mfg: parsedData.mfg, expiry: parsedData.expiry } as ScanResult<T>);
            } else {
                onScanSuccess(parsedData as ScanResult<T>);
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'OCR Failed', description: 'Could not recognize text from the image.' });
        } finally {
            await worker.terminate();
            setOcrStatus(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Scan from Image</DialogTitle>
                    <DialogDescription>
                        {capturedImage ? 'Review the captured image or retake.' : 'Capture a clear photo of the medicine packaging.'}
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
