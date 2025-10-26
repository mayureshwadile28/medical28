'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, Camera, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { scanBill } from '@/ai/flows/scan-bill';
import { type ScanBillOutput } from '@/ai/flows/scan-bill';
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

interface BillScannerProps {
  inventory: Medicine[];
  onUpdateInventory: (updates: { medicineId: string; newStock: number }[]) => void;
  onClose: () => void;
}

type ScanStep = 'requesting' | 'ready' | 'scanning' | 'confirming' | 'error';
type ScannedItem = ScanBillOutput['items'][0];

interface MappedItem extends ScannedItem {
  medicineId?: string;
  currentStock?: number;
  newStock?: number;
  status: 'found' | 'not-found' | 'out-of-stock';
}

export function BillScanner({ inventory, onUpdateInventory, onClose }: BillScannerProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [step, setStep] = useState<ScanStep>('requesting');
  const [scannedItems, setScannedItems] = useState<MappedItem[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
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
        setStep('error');
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
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

  const handleScan = async () => {
    if (!videoRef.current) return;

    setStep('scanning');

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoDataUri = canvas.toDataURL('image/jpeg');

    try {
      const result = await scanBill({ photoDataUri });
      if (!result || result.items.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Scan Failed',
          description: 'Could not detect any items on the bill. Please try again.',
        });
        setStep('ready');
        return;
      }

      const mappedItems: MappedItem[] = result.items.map(item => {
        const foundMedicine = inventory.find(
          med => med.name.toLowerCase() === item.name.toLowerCase()
        );

        if (foundMedicine) {
            const currentStock = isTablet(foundMedicine) ? foundMedicine.stock.tablets : foundMedicine.stock.quantity;
            return {
                ...item,
                medicineId: foundMedicine.id,
                currentStock: currentStock,
                newStock: currentStock + item.quantity,
                status: 'found',
            }
        } else {
            return {
                ...item,
                status: 'not-found',
            }
        }
      });
      setScannedItems(mappedItems);
      setStep('confirming');
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: e.message || 'The AI model failed to process the bill.',
      });
      setStep('ready');
    }
  };
  
  const handleConfirmUpdate = () => {
    const updates = scannedItems
        .filter(item => item.status === 'found' && item.medicineId && item.newStock !== undefined)
        .map(item => ({
            medicineId: item.medicineId!,
            newStock: item.newStock!,
        }));
    
    onUpdateInventory(updates);
    toast({
        title: 'Inventory Updated',
        description: `${updates.length} item(s) have been updated successfully.`
    });
    onClose();
  }

  const renderContent = () => {
    switch (step) {
      case 'requesting':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Requesting camera access...</p>
          </div>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Camera Error</AlertTitle>
            <AlertDescription>
              Could not access the camera. Please ensure you have a camera connected and have granted permission in your browser settings.
            </AlertDescription>
          </Alert>
        );
      case 'ready':
      case 'scanning':
        return (
          <div className="space-y-4">
            <div className="relative aspect-video w-full rounded-md overflow-hidden border bg-muted">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              {step === 'scanning' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <p className="mt-4 text-lg font-semibold">Scanning...</p>
                </div>
              )}
            </div>
            <Button onClick={handleScan} disabled={step === 'scanning'} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Scan Bill
            </Button>
          </div>
        );
      case 'confirming':
        return (
            <div className='space-y-4'>
                <h3 className='font-semibold text-lg'>Confirm Inventory Updates</h3>
                <p className='text-sm text-muted-foreground'>The AI has scanned the following items. Please review and confirm the stock updates.</p>
                <div className="rounded-md border max-h-60 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medicine</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Stock Update</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scannedItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className='font-medium'>{item.name}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                        {item.status === 'found' && <Badge variant='secondary' className='bg-green-600/20 text-green-200 border-green-600/40'>Found</Badge>}
                                        {item.status === 'not-found' && <Badge variant='destructive'>Not Found</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.status === 'found' ? (
                                            <span>{item.currentStock} &rarr; {item.newStock}</span>
                                        ): (
                                            <span className='text-muted-foreground'>-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className='flex justify-end gap-2'>
                    <Button variant='ghost' onClick={() => setStep('ready')}>Scan Again</Button>
                    <Button onClick={handleConfirmUpdate}>
                        <CheckCircle className='mr-2 h-4 w-4' />
                        Confirm and Update Stock
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
