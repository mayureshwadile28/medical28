"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

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

  useEffect(() => {
    if (open) {
        toast({
            variant: 'destructive',
            title: "Feature Temporarily Disabled",
            description: "The AI-powered scanning feature is currently unavailable. Please enter batch details manually."
        });
        onOpenChange(false);
    }
  }, [open, onOpenChange, toast]);


  return null;
}
