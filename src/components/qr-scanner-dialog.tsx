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
          expiry?: string;
      }
    : { batchNumber?: string, expiry?: string };


interface QrScannerDialogProps<T extends ScanMode> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanSuccess: (result: ScanResult<T>) => void;
    scanMode?: T;
}

const parseQrCode = (decodedText: string) => {
    const parts = decodedText.split(',');
    
    // --- Name and Category Extraction ---
    let name = 'Unknown';
    let category = 'Other'; // Default category
    const categoryKeywords = ['Tablets', 'Tablet', 'Capsules', 'Capsule', 'Syrup', 'Ointment', 'Injection'];
    
    // Find the keyword that indicates a category
    const categoryPartIndex = parts.findIndex(part => 
        categoryKeywords.some(keyword => part.toLowerCase().endsWith(keyword.toLowerCase()))
    );

    if (categoryPartIndex !== -1 && parts.length > categoryPartIndex + 1) {
        // The name is the part immediately following the category part
        name = parts[categoryPartIndex + 1].trim();
        
        // Find which keyword was in the category part
        const compositionPart = parts[categoryPartIndex];
        const foundCategoryKeyword = categoryKeywords.find(keyword => compositionPart.toLowerCase().includes(keyword.toLowerCase()));
        
        if (foundCategoryKeyword) {
            // Standardize the category name (e.g., "Tablets" -> "Tablet")
            category = foundCategoryKeyword.endsWith('s') ? foundCategoryKeyword.slice(0, -1) : foundCategoryKeyword;
        }
    }

    // --- Batch Number Extraction ---
    let batchNumber: string | undefined = undefined;
    const batchRegex = /(?:B\.\s*No\.|B\.No\.)\s*([A-Z0-9]+)/i;
    const batchMatch = decodedText.match(batchRegex);
    if (batchMatch && batchMatch[1]) {
        batchNumber = batchMatch[1];
    }

    // --- Expiry Date Extraction ---
    let expiry: string | undefined = undefined;
    const expiryRegex = /EXP\.\s*([A-Z]{3})\.(\d{4})/i;
    const expiryMatch = decodedText.match(expiryRegex);
    if (expiryMatch && expiryMatch[1] && expiryMatch[2]) {
        const monthMap: { [key: string]: string } = {
            JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
            JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
        };
        const month = expiryMatch[1].toUpperCase();
        const year = expiryMatch[2];
        if (monthMap[month]) {
            expiry = `${year}-${monthMap[month]}`;
        }
    }

    return { name, category, batchNumber, expiry };
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

                    const html5QrCode = new Html5Qrcode(scannerContainerId);
                    scannerRef.current = html5QrCode;

                    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                    
                    const successCallback = async (decodedText: string, decodedResult: any) => {
                        if (scannerRef.current?.isScanning) {
                            try {
                                await scannerRef.current.stop();
                            } catch (err) {
                                console.error("Failed to stop scanner", err);
                            }
                        }

                        const parsedData = parseQrCode(decodedText);
                        
                        if (scanMode === 'batchOnly') {
                            onScanSuccess({ batchNumber: parsedData.batchNumber, expiry: parsedData.expiry } as ScanResult<T>);
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
            
            const timer = setTimeout(startScanner, 300);
            return () => clearTimeout(timer);

        } else {
             if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                    console.error("Error stopping the scanner on dialog close:", err);
                });
            }
        }

    }, [open, onScanSuccess, toast, scanMode]);

    useEffect(() => {
        return () => {
             if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                     scannerRef.current.stop().catch(err => {
                        console.error("Error stopping the scanner on cleanup:", err);
                    });
                }
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
                    <div id={scannerContainerId} className="w-full border rounded-lg overflow-hidden"></div>
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