
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
import { type Medicine, type SaleItem, isTablet, isGeneric, ScanBillOutput } from '@/lib/types';
import { analyzeBillAction } from '@/app/actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BillScannerProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Medicine[];
  onAddItems: (items: SaleItem[]) => void;
}

export function BillScanner({ isOpen, onClose, inventory, onAddItems }: BillScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScanBillOutput | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

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
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        // Do not show toast here, let the UI show the error message.
    }
  }, []);

  useEffect(() => {
    if (isOpen && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
        stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, scannedResult]);
  
  const handleClose = () => {
    setScannedResult(null);
    setIsScanning(false);
    setSelectedItems({});
    onClose();
  };

  const processImage = useCallback(async (dataUri: string) => {
    setIsScanning(true);
    stopCamera();

    // Draw the image on the canvas to show a preview
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
        const result = await analyzeBillAction({ photoDataUri: dataUri });
        setScannedResult(result);
        const initialSelection: Record<string, boolean> = {};
        result.items.forEach((_, index) => {
            initialSelection[index] = true; // Select all items by default
        });
        setSelectedItems(initialSelection);

        if (result.items.length === 0) {
            toast({ title: "Scan Complete", description: "The AI couldn't find any medicine items on the bill." });
        }
    } catch (error: any) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Scan Failed',
            description: error.message || 'The AI failed to process the image.',
        });
        setScannedResult({ items: [] }); // Set to empty result to allow retry
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
        processImage(dataUri);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow selecting the same file again
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleRetry = () => {
    setScannedResult(null);
    setSelectedItems({});
    startCamera();
  };

  const handleAddSelectedToBill = () => {
    if (!scannedResult) return;

    const saleItemsToAdd: SaleItem[] = [];
    let itemsNotFound: string[] = [];

    scannedResult.items.forEach((item, index) => {
      if (selectedItems[index]) {
        // Simple name matching for now. Could be improved with fuzzy search.
        const matchedMedicine = inventory.find(
          (invItem) => invItem.name.toLowerCase() === item.name.toLowerCase()
        );

        if (matchedMedicine) {
            let stockLimit = Infinity;
            if (isTablet(matchedMedicine)) {
                stockLimit = matchedMedicine.stock.tablets;
            } else if (isGeneric(matchedMedicine)) {
                stockLimit = matchedMedicine.stock.quantity;
            }
          
            const quantityToAdd = Math.min(item.quantity, stockLimit);
            if(quantityToAdd <= 0) {
                itemsNotFound.push(`${item.name} (Out of stock)`);
                return;
            }

            const pricePerUnit = isTablet(matchedMedicine)
            ? matchedMedicine.price / matchedMedicine.tabletsPerStrip 
            : matchedMedicine.price;

          saleItemsToAdd.push({
            medicineId: matchedMedicine.id,
            name: matchedMedicine.name,
            category: matchedMedicine.category,
            quantity: quantityToAdd,
            pricePerUnit: pricePerUnit,
            total: pricePerUnit * quantityToAdd,
          });
        } else {
          itemsNotFound.push(item.name);
        }
      }
    });

    if (saleItemsToAdd.length > 0) {
      onAddItems(saleItemsToAdd);
      toast({
        title: 'Items Added',
        description: `${saleItemsToAdd.length} item(s) have been added to the bill.`,
      });
    }

    if (itemsNotFound.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Some Items Not Found',
        description: `Could not find in inventory or out of stock: ${itemsNotFound.join(', ')}`,
      });
    }
    
    handleClose();
  };
  
  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scan Medical Bill</DialogTitle>
          <DialogDescription>
            Point your camera at a bill, or upload an image. The AI will try to extract the items.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
            {!scannedResult && hasCameraPermission && (
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    autoPlay
                    playsInline
                    muted
                />
            )}
            
            {isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white z-10">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin" />
                    <p className="text-lg font-semibold">Scanning...</p>
                    <p className="text-sm">This may take a moment.</p>
                </div>
            )}

            {(hasCameraPermission === false && !scannedResult) && (
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

             <canvas ref={canvasRef} className="h-full w-full object-contain" />
        </div>
        
        {/* Hidden file input */}
        <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
        />

        {scannedResult && (
            <div>
                <h3 className="font-semibold mb-2">Scanned Items:</h3>
                {scannedResult.items.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <input 
                                            type="checkbox" 
                                            className="cursor-pointer"
                                            checked={Object.values(selectedItems).every(Boolean)}
                                            onChange={() => {
                                                const allSelected = Object.values(selectedItems).every(Boolean);
                                                const newSelection: Record<string, boolean> = {};
                                                scannedResult.items.forEach((_, index) => {
                                                    newSelection[index] = !allSelected;
                                                });
                                                setSelectedItems(newSelection);
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scannedResult.items.map((item, index) => (
                                    <TableRow key={index} className="cursor-pointer" onClick={() => toggleItemSelection(index)}>
                                        <TableCell>
                                            <input 
                                                type="checkbox"
                                                checked={!!selectedItems[index]}
                                                onChange={e => {
                                                    e.stopPropagation();
                                                    toggleItemSelection(index);
                                                }}
                                                className="cursor-pointer"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                        <ScanLine className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No items detected</h3>
                        <p className="text-muted-foreground">The AI could not find any items on the bill. Please try again.</p>
                    </div>
                )}
            </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-between">
          <div>
            {!scannedResult ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCaptureAndScan} disabled={!hasCameraPermission || isScanning} className="flex-1 sm:flex-initial">
                  {isScanning ? <Loader2 className="mr-2 animate-spin" /> : <Camera className="mr-2" />}
                  Capture & Scan
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
                        Scan Again
                    </Button>
                     <Button 
                        onClick={handleAddSelectedToBill} 
                        disabled={Object.values(selectedItems).every(val => !val)}
                     >
                        Add to Bill
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

    