
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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


interface QrScannerDialogProps<T extends ScanMode> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanSuccess: (result: ScanResult<T>) => void;
    scanMode?: T;
}

const monthMap: { [key: string]: string } = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

const parseQrCode = (decodedText: string) => {
    const parts = decodedText.split(',');

    let name: string | undefined = undefined;
    let category: string | undefined = undefined;

    const categoryKeywords = ['Tablets', 'Tablet', 'Capsules', 'Capsule', 'Syrup', 'Ointment', 'Injection'];
    const categoryPartIndex = parts.findIndex(part => 
        categoryKeywords.some(keyword => part.toLowerCase().includes(keyword.toLowerCase()))
    );

    if (categoryPartIndex !== -1) {
        const categoryPart = parts[categoryPartIndex];
        const foundCategoryKeyword = categoryKeywords.find(keyword => categoryPart.toLowerCase().includes(keyword.toLowerCase()));
        
        if (foundCategoryKeyword) {
            category = foundCategoryKeyword.endsWith('s') && foundCategoryKeyword !== 'Capsules' ? foundCategoryKeyword.slice(0, -1) : foundCategoryKeyword;
            if (category === 'Capsules') category = 'Capsule';
        }

        if (parts.length > categoryPartIndex + 1) {
             const namePart = parts[categoryPartIndex + 1];
             if(namePart) name = namePart.trim();
        }
    }
    
    const batchRegex = /(?:B\.\s*No\.|B\.No\.)\s*([A-Z0-9\-/]+)/i;
    const batchMatch = decodedText.match(batchRegex);
    const batchNumber = batchMatch ? batchMatch[1] : undefined;

    const mfgRegex = /(?:Mfg\.|Mfd\.|M\.?D\.)\s*[:.]?\s*([A-Z]{3})\.?\s*(\d{4}|\d{2})/i;
    const mfgMatch = decodedText.match(mfgRegex);
    let mfg: string | undefined = undefined;
    if (mfgMatch && monthMap[mfgMatch[1].toUpperCase()]) {
        const year = mfgMatch[2].length === 2 ? `20${mfgMatch[2]}` : mfgMatch[2];
        mfg = `${year}-${monthMap[mfgMatch[1].toUpperCase()]}`;
    }

    const expiryRegex = /(?:Exp\.|Expiry|E\.?D\.)\s*[:.]?\s*([A-Z]{3})\.?\s*(\d{4}|\d{2})/i;
    const expiryMatch = decodedText.match(expiryRegex);
    let expiry: string | undefined = undefined;
    if (expiryMatch && monthMap[expiryMatch[1].toUpperCase()]) {
        const year = expiryMatch[2].length === 2 ? `20${expiryMatch[2]}` : expiryMatch[2];
        expiry = `${year}-${monthMap[expiryMatch[1].toUpperCase()]}`;
    }

    return { name, category, batchNumber, mfg, expiry };
};


export function QrScannerDialog<T extends ScanMode = 'full'>({
    open,
    onOpenChange,
    onScanSuccess,
    scanMode = 'full' as T,
}: QrScannerDialogProps<T>) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = 'qr-reader';
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            const startScanner = async () => {
                try {
                    await Html5Qrcode.getCameras();
                    setHasCameraPermission(true);

                    const container = document.getElementById(scannerContainerId);
                    if(container) container.innerHTML = '';
                    
                    const html5QrCode = new Html5Qrcode(scannerContainerId);
                    scannerRef.current = html5QrCode;

                    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                    
                    const successCallback = async (decodedText: string, decodedResult: any) => {
                        if (scannerRef.current?.isScanning) {
                            await scannerRef.current.stop();
                        }
                        
                        const parsedData = parseQrCode(decodedText);
                        
                        if (scanMode === 'batchOnly') {
                            onScanSuccess({ batchNumber: parsedData.batchNumber, mfg: parsedData.mfg, expiry: parsedData.expiry } as ScanResult<T>);
                        } else {
                            onScanSuccess(parsedData as ScanResult<T>);
                        }
                    };

                    const errorCallback = (errorMessage: string) => {};

                    if (html5QrCode.isScanning) {
                        await html5QrCode.stop();
                    }

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        successCallback,
                        errorCallback
                    );
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
            
            const timer = setTimeout(startScanner, 100);
            return () => clearTimeout(timer);

        } else {
             if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                    // This error can happen if the scanner is already stopped, so we can ignore it.
                });
            }
        }
    }, [open, onScanSuccess, toast, scanMode]);
    
     useEffect(() => {
        return () => {
             if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                    // This error can happen if the scanner is already stopped, so we can ignore it on cleanup.
                });
            }
        }
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Scan Medicine QR Code</DialogTitle>
                    <DialogDescription>
                        Point your camera at the QR code on the medicine box.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div id={scannerContainerId} className="w-full border rounded-lg overflow-hidden aspect-square"></div>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
