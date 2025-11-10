"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { ScanLine } from "lucide-react"

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

  const handleOpen = () => {
    toast({
      variant: 'destructive',
      title: "Feature Temporarily Disabled",
      description: "The AI-powered scanning feature is currently unavailable. Please enter batch details manually."
    });
    onOpenChange(false);
  }

  // The dialog is opened via a trigger in the parent, but we immediately show a toast and close it.
  if (open) {
      handleOpen();
  }

  return null;
}
