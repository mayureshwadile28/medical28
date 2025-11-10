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
import { Loader2, Camera, ScanLine, X, AlertTriangle } from "lucide-react"
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
  
  useEffect(() => {
    if (open) {
      toast({
        variant: "destructive",
        title: "Feature Temporarily Disabled",
        description:
          "The AI-powered scanning feature is currently unavailable. Please enter batch details manually.",
      })
      onOpenChange(false);
    }
  }, [open, onOpenChange, toast]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Batch Details</DialogTitle>
          <DialogDescription>
            This feature is temporarily disabled.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="mt-4 text-muted-foreground">The scanner is currently unavailable.</p>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}