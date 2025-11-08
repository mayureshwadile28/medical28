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
import { Camera, Zap, Scan, RotateCw } from "lucide-react"
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

const parseOcrText = (text: string) => {
    const lines = text.split('\n');
    const result: {
        batchNumber?: string;
        mfgDate?: string;
        expiryDate?: string;
        price?: number;
    } = {};

    const batchRegex = /(?:B(?:atch)?.?No|B\.NO)\.?\s*:?\s*([A-Z0-9\-\/]+)/i;
    const dateRegex = /(\d{2})\/(\d{4})/; // MM/YYYY
    const mrpRegex = /(?:M\.R\.P|MRP)\.?\s*(?:Rs\.?)?\s*[:\s]*([\d\.]+)/i;

    lines.forEach(line => {
        // Batch Number
        const batchMatch = line.match(batchRegex);
        if (batchMatch && batchMatch[1]) {
            result.batchNumber = batchMatch[1].trim();
        }

        // Dates (MFG/EXP)
        if (line.match(/MFG|Mfd/i) && !result.mfgDate) {
            const dateMatch = line.match(dateRegex);
            if (dateMatch && dateMatch[2] && dateMatch[1]) {
                result.mfgDate = `${dateMatch[2]}-${dateMatch[1]}`; // YYYY-MM
            }
        }
        
        if (line.match(/EXP/i) && !result.expiryDate) {
            const dateMatch = line.match(dateRegex);
            if (dateMatch && dateMatch[2] && dateMatch[1]) {
                result.expiryDate = `${dateMatch[2]}-${dateMatch[1]}`; // YYYY-MM
            }
        }

        // Price
        const mrpMatch = line.match(mrpRegex);
        if (mrpMatch && mrpMatch[1]) {
            result.price = parseFloat(mrpMatch[1]);
        }
    });

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
  const [status, setStatus] = useState("")
  const [progress, setProgress] = useState(0);

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
       toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
    }
  }, [stopCamera, toast])


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
        setStatus("Initializing OCR engine...");
        setProgress(0);

        const result = await Tesseract.recognize(dataUrl, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    setStatus(m.status);
                    setProgress(Math.round(m.progress * 100));
                }
            }
        });
        
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
          title: "OCR Scan Failed",
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
                <p className="font-semibold capitalize">{status}...</p>
                <Progress value={progress} className="w-full" />
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
