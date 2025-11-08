'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface QrScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanSuccess: (decodedText: string) => void;
}

export function QrScannerDialog({ open, onOpenChange, onScanSuccess }: QrScannerDialogProps) {
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
                    
                    const successCallback = (decodedText: string, decodedResult: any) => {
                        if (scannerRef.current?.isScanning) {
                            scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
                        }
                        onScanSuccess(decodedText);
                    };

                    const errorCallback = (errorMessage: string) => {
                        // Ignore common errors
                    };

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
            
            startScanner();
        } else {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                    console.error("Error stopping the scanner:", err);
                });
            }
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                     console.error("Error stopping the scanner on cleanup:", err);
                });
            }
        };
    }, [open, onScanSuccess, toast]);

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
                    <div id={scannerContainerId} className="w-full border rounded-lg"></div>
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
