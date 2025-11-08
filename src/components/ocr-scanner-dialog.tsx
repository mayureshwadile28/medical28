"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Tesseract from "tesseract.js"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Camera, Zap, Scan, X, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface OcrScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (result: {
    batchNumber?: string
    mfgDate?: string
    expiryDate?: string
    price?: number
  }) => void
}

type ScanPhase = "idle" | "requesting" | "streaming" | "captured" | "processing" | "error";

const monthMap: { [key: string]: string } = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

const parseDate = (text: string): string | undefined => {
    if (!text) return undefined;
    
    // Format: MMM.YYYY or MMM YYYY or MMM/YYYY
    const match = text.toUpperCase().match(/([A-Z]{3})[.\s/]*(\d{4})/);
    if (match) {
        const month = monthMap[match[1]];
        const year = match[2];
        if (month && year) {
            return `${year}-${month}`;
        }
    }
     // Format: MM/YYYY
    const slashMatch = text.match(/(\d{2})\/(\d{4})/);
    if (slashMatch) {
        return `${slashMatch[2]}-${slashMatch[1]}`;
    }
    return undefined;
};

const parseOcrText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    let result: {
        batchNumber?: string;
        mfgDate?: string;
        expiryDate?: string;
        price?: number;
    } = {};

    lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();
        
        // --- Keyword-based extraction ---

        // Batch Number
        if (lowerLine.includes('batch no') || lowerLine.includes('b. no')) {
            const value = line.split(/[:.]/).pop()?.trim().toUpperCase();
            if (value && value.length > 2) result.batchNumber = value;
            else if (lines[index + 1]) result.batchNumber = lines[index + 1].toUpperCase();
        }

        // Dates (MFG and EXP)
        if (lowerLine.includes('mfg')) {
            const dateStr = line.split(/[:.]/).pop() || lines[index + 1];
            if (!result.mfgDate) result.mfgDate = parseDate(dateStr);
        }
        if (lowerLine.includes('exp')) {
            const dateStr = line.split(/[:.]/).pop() || lines[index + 1];
            if (!result.expiryDate) result.expiryDate = parseDate(dateStr);
        }
        
        // Price / MRP
        if (lowerLine.includes('m.r.p') || lowerLine.includes('mrp')) {
            const priceMatch = line.match(/(\d[\d,.]*\d)/);
            if (priceMatch) {
                result.price = parseFloat(priceMatch[1].replace(/,/g, ''));
            }
        }
    });

    // --- Positional fallbacks (if keywords failed) ---

    // 1. Find Batch Number (usually alphanumeric, 5+ chars)
    if (!result.batchNumber) {
        const potentialBatch = lines.find(l => /^[A-Z0-9]{5,}[A-Z0-9]*$/.test(l) && !/\d{4}/.test(l) && !/price/i.test(l));
        if (potentialBatch) result.batchNumber = potentialBatch;
    }
    
    // 2. Find Dates
    const potentialDates = lines.map(parseDate).filter((d): d is string => !!d);
    if (potentialDates.length >= 2) {
        const sortedDates = potentialDates.sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        if (!result.mfgDate) result.mfgDate = sortedDates[0];
        if (!result.expiryDate) result.expiryDate = sortedDates[1];
    } else if (potentialDates.length === 1) {
        // Guess based on whether it's past or future
        if (new Date(potentialDates[0]) < new Date()) {
             if (!result.mfgDate) result.mfgDate = potentialDates[0];
        } else {
             if (!result.expiryDate) result.expiryDate = potentialDates[0];
        }
    }

    // 3. Find Price (looks for a number with decimals at the end)
    if (!result.price) {
        const potentialPriceLine = lines.find(l => /(?:₹|\bRs\b|\bINR\b)?[.\s]*(\d+\.\d{2})/.test(l));
        if (potentialPriceLine) {
            const priceMatch = potentialPriceLine.match(/(\d+\.\d{2})/);
            if (priceMatch) result.price = parseFloat(priceMatch[1]);
        }
    }
    
    return result;
};


export function OcrScannerDialog({
  open,
  onOpenChange,
  onResult,
}: OcrScannerDialogProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<ScanPhase>("idle")
  const [hasCameraPermission, setHasCameraPermission] = useState(true)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState("")

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera(); // Ensure any existing stream is stopped

    setPhase("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // The onloadedmetadata event is more reliable
        videoRef.current.onloadedmetadata = () => {
             setHasCameraPermission(true)
             setPhase("streaming")
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setHasCameraPermission(false)
      setPhase("error")
    }
  }, [stopCamera])


  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }
    // Cleanup function
    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || phase !== 'streaming') return;
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Check if video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
            variant: "destructive",
            title: "Camera Error",
            description: "Could not get video dimensions. Please try again.",
        });
        setPhase('error');
        return;
    }

    setPhase("captured");

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/png")
      
      // Stop the camera stream after capture to save resources
      stopCamera();
      setPhase("processing")
      
      try {
        const result = await Tesseract.recognize(dataUrl, "eng", {
          logger: m => {
            setOcrStatus(m.status)
            if (m.status === "recognizing text") {
              setOcrProgress(m.progress * 100)
            }
          },
        })

        const parsedData = parseOcrText(result.data.text);
        onResult(parsedData)
        toast({
          title: "OCR Scan Complete",
          description: "Data has been extracted. Please verify the fields.",
        })
        
      } catch (err) {
        console.error(err)
        toast({
          variant: "destructive",
          title: "OCR Failed",
          description: "Could not recognize text from the image.",
        })
        setPhase("error");
      }
    }
  }

  const handleClose = () => {
    stopCamera()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan Batch Details</DialogTitle>
          <DialogDescription>
            Point your camera at the medicine package. Make sure the text is
            clear and well-lit.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 aspect-video w-full rounded-md border bg-muted flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className={cn("w-full h-full object-cover", phase !== 'streaming' && 'hidden')}
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className={cn("w-full h-full object-contain", phase !== 'captured' && 'hidden')} />
          {phase === "requesting" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-12 w-12" />
                <p>Starting camera...</p>
            </div>
          )}
          {phase === "processing" && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 w-full">
                <Scan className="h-12 w-12 animate-pulse" />
                <p className="font-semibold capitalize">{ocrStatus}...</p>
                <Progress value={ocrProgress} className="w-full" />
            </div>
          )}
           {(phase === "error") && (
                <div className="flex flex-col items-center gap-4 p-4">
                    {!hasCameraPermission ? (
                        <Alert variant="destructive">
                            <Zap className="h-4 w-4" />
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please enable camera permissions in your browser settings to use this feature.
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <Alert variant="destructive">
                            <Zap className="h-4 w-4" />
                            <AlertTitle>Camera Error</AlertTitle>
                            <AlertDescription>
                                The camera could not be started. Please try again.
                            </AlertDescription>
                        </Alert>
                    )}
                    <Button onClick={startCamera}>
                        <RotateCw className="mr-2" /> Try Again
                    </Button>
                </div>
            )}
        </div>
        <DialogFooter>
          {phase === "streaming" && (
            <Button onClick={handleCapture} className="w-full" size="lg">
              <Camera className="mr-2" /> Capture
            </Button>
          )}
           {phase === "captured" && (
            <Button onClick={startCamera} variant="outline" className="w-full">
              <RotateCw className="mr-2" /> Retake
            </Button>
           )}
           {(phase === 'idle' || phase === 'error') && (
                <Button onClick={startCamera} className="w-full">
                    <Camera className="mr-2" /> Start Camera
                </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
