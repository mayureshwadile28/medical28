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

type ScanPhase = "idle" | "requesting" | "streaming" | "captured" | "processing" | "error"

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
    return undefined;
};

const parseOcrText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let result: {
        batchNumber?: string;
        mfgDate?: string;
        expiryDate?: string;
        price?: number;
    } = {};

    lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();

        // Batch Number
        if (lowerLine.includes('batch no')) {
            const nextLine = lines[index + 1];
            if (nextLine && !nextLine.toLowerCase().includes('date')) {
                 result.batchNumber = nextLine.split(/[:\s]/).pop()?.trim().toUpperCase();
            } else {
                 result.batchNumber = line.split(/[:\s]/).pop()?.trim().toUpperCase();
            }
        } else if (!result.batchNumber && /^[A-Z0-9]{8,}$/.test(line.trim())) {
             if(!/M\/\d{3}\/\d{4}/.test(line.trim())) { // Avoid matching M.L.
                result.batchNumber = line.trim();
            }
        }

        // Dates
        if (lowerLine.includes('mfg. date') || lowerLine.includes('mfg date')) {
            result.mfgDate = parseDate(line.split(/[:]/).pop() || lines[index+1]);
        }
        
        if (lowerLine.includes('expiry date') || lowerLine.includes('exp. date') || lowerLine.includes('exp date')) {
            result.expiryDate = parseDate(line.split(/[:]/).pop() || lines[index+1]);
        }

        // Fallback for dates if they are on separate lines
        const dateMatch = parseDate(line);
        if(dateMatch) {
            const date = new Date(dateMatch);
            // Heuristic: Mfg date is usually in the past, expiry in the future
            if (date < new Date()) {
                if (!result.mfgDate) result.mfgDate = dateMatch;
            } else {
                if (!result.expiryDate) result.expiryDate = dateMatch;
            }
        }

        // Price
        if (lowerLine.includes('price') || lowerLine.includes('m.r.p')) {
            const priceMatch = line.match(/(\d+\.\d{2})/);
            if (priceMatch) {
                result.price = parseFloat(priceMatch[1]);
            }
        }
    });

    // Special handling for the example image format
    const potentialBatch = lines.find(l => /^[A-Z0-9]{10,}/.test(l));
    if (potentialBatch && !result.batchNumber) result.batchNumber = potentialBatch;

    const potentialMfg = lines.find(l => /[A-Z]{3}\.\d{4}/.test(l));
    const potentialExp = lines.find(l => /[A-Z]{3}\.\d{4}.*/.test(l) && l !== potentialMfg);
     if (potentialMfg && !result.mfgDate) result.mfgDate = parseDate(potentialMfg);
    if (potentialExp && !result.expiryDate) result.expiryDate = parseDate(potentialExp);
    
    const potentialPrice = lines.find(l => /^\d+\.\d{2}$/.test(l));
    if(potentialPrice && !result.price) result.price = parseFloat(potentialPrice);

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

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }

    setPhase("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setHasCameraPermission(true)
      setPhase("streaming")
    } catch (error) {
      console.error("Error accessing camera:", error)
      setHasCameraPermission(false)
      setPhase("error")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setPhase("idle")
  }, [])

  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [open, startCamera, stopCamera])

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setPhase("captured")

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/png")
      
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
           {!hasCameraPermission && phase === "error" && (
                <Alert variant="destructive">
                    <Zap className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                        Please enable camera permissions in your browser settings to use this feature.
                    </AlertDescription>
                </Alert>
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
