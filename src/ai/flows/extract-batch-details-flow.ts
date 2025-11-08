'use server';
/**
 * @fileOverview An AI flow to extract batch details from an image.
 *
 * - extractBatchDetails - A function that handles the batch detail extraction.
 * - ExtractBatchDetailsInput - The input type for the function.
 * - ExtractBatchDetailsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractBatchDetailsInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a medicine's packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractBatchDetailsInput = z.infer<
  typeof ExtractBatchDetailsInputSchema
>;

const ExtractBatchDetailsOutputSchema = z.object({
  batchNumber: z.string().optional().describe('The batch number of the medicine.'),
  mfg: z
    .string()
    .optional()
    .describe('The manufacturing date in YYYY-MM format.'),
  expiry: z
    .string()
    "use client"

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Camera, RefreshCcw, Zap, Loader2 } from 'lucide-react';
import { extractBatchDetailsAction } from '@/app/actions';

type ScanResult = { batchNumber?: string; mfg?: string; expiry?: string };

interface AiScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (result: ScanResult) => void;
}

export function AiScannerDialog({
  open,
  onOpenChange,
  onScanSuccess,
}: AiScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      if (open) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions to use this feature.',
          });
        }
      }
    };

    getCameraPermission();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCapturedImage(null);
      setIsLoading(false);
    };
  }, [open, toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsLoading(false);
  };

  const handleProcessImage = async () => {
    if (!capturedImage) return;

    setIsLoading(true);

    try {
      const blob = await (await fetch(capturedImage)).blob();
      const formData = new FormData();
      formData.append('image', blob, 'scan.png');

      const result = await extractBatchDetailsAction(formData);

      if (result) {
        onScanSuccess(result);
      } else {
        throw new Error('AI could not extract details.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'AI Scan Failed',
        description:
          'Could not extract details from the image. Please try again with a clearer picture.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Scan Batch Details</DialogTitle>
          <DialogDescription>
            {capturedImage
              ? 'Review the captured image or retake.'
              : 'Capture a clear photo of the batch details.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative w-full border rounded-lg overflow-hidden aspect-video bg-muted">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${
                capturedImage ? 'hidden' : 'block'
              }`}
              autoPlay
              playsInline
              muted
            />
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured medicine"
                className="w-full h-full object-contain"
              />
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Alert variant="destructive" className="m-4">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please enable camera permissions in your browser settings.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          {isLoading && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm text-muted-foreground">
                AI is analyzing the image...
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          {capturedImage ? (
            <div className="w-full flex justify-between">
              <Button
                variant="outline"
                onClick={handleRetake}
                disabled={isLoading}
              >
                <RefreshCcw className="mr-2" /> Retake
              </Button>
              <Button onClick={handleProcessImage} disabled={isLoading}>
                <Zap className="mr-2" /> Process Image
              </Button>
            </div>
          ) : (
            <Button onClick={handleCapture} disabled={!hasCameraPermission}>
              <Camera className="mr-2" /> Capture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
