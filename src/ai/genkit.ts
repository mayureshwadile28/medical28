"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Camera, Zap, RotateCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface OcrScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (result: {
    batchNumber?: string
    mfg?: string
    expiry?: string
    price?: number
  }) => void
}

type ScanPhase = "idle" | "requesting" | "streaming" | "error";

export function OcrScannerDialog({
  open,
  onOpenChange,
  onResult,
}: OcrScannerDialogProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<ScanPhase>("idle")
  const [hasCameraPermission, setHasCameraPermission] = useState(true)

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
    stopCamera(); 

    setPhase("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
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
    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  const handleCapture = async () => {
    // This is a placeholder, as the AI functionality is removed for stability.
    toast({
        title: "Feature Temporarily Disabled",
        description: "The AI scanning feature is currently unavailable. Please enter batch details manually.",
    });
    onOpenChange(false);
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
            Point your camera at the medicine package to scan the details.
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
          {phase === "requesting" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-12 w-12" />
                <p>Starting camera...</p>
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