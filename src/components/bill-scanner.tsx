'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, Camera, CheckCircle, AlertTriangle, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { scanBill } from '@/ai/flows/scan-bill';
import { type ScanBillOutput } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isTablet, type Medicine } from '@/lib/types';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

interface BillScannerProps {
  inventory: Medicine[];
  onUpdateInventory: (updates: { medicineId: string; newStock: number }[]) => void;
  onClose: () => void;
}

type ScanStep = 'requesting' | 'ready' | 'scanning' | 'confirming' | 'error';

export function BillScanner({ inventory, onUpdateInventory, onClose }: BillScannerProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [step, setStep] = useState<ScanStep>('requesting');
  const [description, setDescription] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not available.');
        setHasCameraPermission(false);
        setStep('ready'); // Go to ready to allow file upload
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
        setStep('ready');
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setStep('ready'); // Still allow uploads
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'You can still upload an image file.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const processImage = async (photoDataUri: string) => {
    setStep('scanning');
    try {
      const result = await scanBill({ photoDataUri });
      if (!result || !result.description) {
        toast({
          variant: 'destructive',
          title: 'Scan Failed',
          description: 'Could not get a description from the image. Please try again.',
        });
        setStep('ready');
        return;
      }
      
      setDescription(result.description);
      setStep('confirming');

    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: e.message || 'The AI model failed to process the image.',
      });
      setStep('ready');
    }
  }

  const handleScanFromCamera = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoDataUri = canvas.toDataURL('image/jpeg');
    processImage(photoDataUri);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoDataUri = e.target?.result as string;
      if (photoDataUri) {
        processImage(photoDataUri);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input to allow selecting the same file again
    if(fileInputRef.current) fileInputRef.current.value = "";
  }
  

  const renderContent = () => {
    switch (step) {
      case 'requesting':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Initializing scanner...</p>
          </div>
        );
      case 'error': // This case is less likely now, but kept as a fallback
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Scanner Error</AlertTitle>
            <AlertDescription>
              An unexpected error occurred. Please try again or upload an image file.
            </AlertDescription>
          </Alert>
        );
      case 'ready':
      case 'scanning':
        return (
          <div className="space-y-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*"
              className="hidden" 
            />
            {hasCameraPermission ? (
              <div className="relative aspect-video w-full rounded-md overflow-hidden border bg-muted">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {step === 'scanning' && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="mt-4 text-lg font-semibold">Scanning...</p>
                  </div>
                )}
              </div>
            ) : (
                <div className='flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-md bg-muted/50'>
                    <Camera className="h-12 w-12 text-muted-foreground" />
                    <p className='text-muted-foreground mt-2 text-center'>Camera not available or permission denied.<br/>Please upload an image instead.</p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={handleScanFromCamera} disabled={step === 'scanning' || !hasCameraPermission}>
                    <Camera className="mr-2 h-4 w-4" />
                    Scan from Camera
                </Button>
                 <Button onClick={() => fileInputRef.current?.click()} disabled={step === 'scanning'} variant="secondary">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                </Button>
            </div>
          </div>
        );
      case 'confirming':
        return (
            <div className='space-y-4'>
                <h3 className='font-semibold text-lg'>Image Description</h3>
                <p className='text-sm text-muted-foreground'>The AI provided the following description for your image:</p>
                <Textarea
                    readOnly
                    value={description}
                    className="min-h-[150px] max-h-60"
                />
                <div className='flex justify-end gap-2'>
                    <Button variant='ghost' onClick={() => setStep('ready')}>Scan Again</Button>
                    <Button onClick={onClose}>
                        <CheckCircle className='mr-2 h-4 w-4' />
                        Done
                    </Button>
                </div>
            </div>
        )
    }
  };

  return (
    <div>
        <div className='absolute top-2 right-2'>
             <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
             </Button>
        </div>
        {renderContent()}
    </div>
  );
}
