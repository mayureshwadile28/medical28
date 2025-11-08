
'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type ScanMode = 'full' | 'batchOnly';
type ScanResult<T extends ScanMode> = T extends 'full'
    ? {
          name: string;
          category: string;
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
    // --- Name and Category Extraction ---
    let name = 'Unknown';
    let category = 'Other';
    const categoryKeywords = ['Tablets', 'Tablet', 'Capsules', 'Capsule', 'Syrup', 'Ointment', 'Injection'];
    
    let parts = decodedText.split(',');

    const compositionPartIndex = parts.findIndex(part => 
        categoryKeywords.some(keyword => part.toLowerCase().includes(keyword.toLowerCase()))
    );

    if (compositionPartIndex !== -1 && parts.length > compositionPartIndex + 1) {
        name = parts[compositionPartIndex + 1].trim();
        const compositionPart = parts[compositionPartIndex];
        const foundCategoryKeyword = categoryKeywords.find(keyword => compositionPart.toLowerCase().includes(keyword.toLowerCase()));
        if (foundCategoryKeyword) {
            category = foundCategoryKeyword.endsWith('s') && foundCategoryKeyword !== 'Capsules' ? foundCategoryKeyword.slice(0, -1) : foundCategoryKeyword;
            if (category === 'Capsules') category = 'Capsule';
        }
    }

    // --- Batch Number Extraction ---
    let batchNumber: string | undefined = undefined;
    const batchRegex = /(?:B\.\s*No\.|B\.No\.)\s*([A-Z0-9]+)/i;
    const batchMatch = decodedText.match(batchRegex);
    if (batchMatch && batchMatch[1]) {
        batchNumber = batchMatch[1];
    }
    
    // --- Manufacturing Date Extraction ---
    let mfg: string | undefined = undefined;
    const mfgRegex = /MFD\.\s*([A-Z]{3})\.(\d{4})/i;
    const mfgMatch = decodedText.match(mfgRegex);
    if (mfgMatch && mfgMatch[1] && mfgMatch[2]) {
        const month = mfgMatch[1].toUpperCase();
        const year = mfgMatch[2];
        if (monthMap[month]) {
            mfg = `${year}-${monthMap[month]}`;
        }
    }

    // --- Expiry Date Extraction ---
    let expiry: string | undefined = undefined;
    const expiryRegex = /EXP\.\s*([A-Z]{3})\.(\d{4})/i;
    const expiryMatch = decodedText.match(expiryRegex);
    if (expiryMatch && expiryMatch[1] && expiryMatch[2]) {
        const month = expiryMatch[1].toUpperCase();
        const year = expiryMatch[2];
        if (monthMap[month]) {
            expiry = `${year}-${monthMap[month]}`;
        }
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

                    // Ensure the container is clean before starting
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
