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
import { Loader2, Camera, ScanLine, X } from "lucide-react"
import { extractBatchDetailsAction } from "@/app/actions"
import { Alert, AlertTitle, AlertDescription } from "./ui/alert"

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

export function OcrScannerDialog({
  open,
  onOpenChange,
  onResult,
}: OcrScannerDialogProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        setHasCameraPermission(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
        setHasCameraPermission(false)
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description:
            "Please enable camera permissions in your browser settings to use the scanner.",
        })
      }
    }

    if (open && !capturedImage) {
      getCameraPermission()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [open, capturedImage, toast, stopCamera])

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext("2d")
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
        const dataUri = canvas.toDataURL("image/jpeg")
        setCapturedImage(dataUri)
        stopCamera() // Stop camera after capture
      }
    }
  }

  const handleProcessImage = async () => {
    if (!capturedImage) return
    setIsProcessing(true)
    try {
      const result = await extractBatchDetailsAction({
        imageDataUri: capturedImage,
      })
      onResult(result)
      toast({
        title: "Scan Successful",
        description: "Batch details have been extracted.",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("AI extraction failed:", error)
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description:
          "Could not extract details from the image. Please try again or enter manually.",
      })
    } finally {
      setIsProcessing(false)
      setCapturedImage(null) // Reset for next time
    }
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setCapturedImage(null)
      setIsProcessing(false)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan Batch Details</DialogTitle>
          <DialogDescription>
            Point your camera at the medicine packaging. Focus on the area with
            the batch number, MRP, and expiry date.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          {hasCameraPermission === null && (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {hasCameraPermission === false && (
            <div className="flex h-full w-full flex-col items-center justify-center p-4">
              <Alert variant="destructive">
                <Camera className="h-4 w-4" />
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access in your browser to use this
                  feature.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {hasCameraPermission && (
            <>
              <video
                ref={videoRef}
                className={cn(
                  "h-full w-full object-cover",
                  capturedImage && "hidden"
                )}
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured batch details"
                  className="h-full w-full object-contain"
                />
              )}

              {!isProcessing && !capturedImage && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 rounded-lg border-2 border-dashed border-white/50" />
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Analyzing image...</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={() => setCapturedImage(null)}
                disabled={isProcessing}
              >
                <X className="mr-2" /> Retake
              </Button>
              <Button onClick={handleProcessImage} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 animate-spin" />
                ) : (
                  <ScanLine className="mr-2" />
                )}
                Process Image
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCapture}
              disabled={!hasCameraPermission || isProcessing}
              className="w-full"
            >
              <Camera className="mr-2" /> Capture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
