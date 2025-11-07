'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Settings, KeyRound, ShieldCheck } from 'lucide-react';
import type { PinSettings } from '@/lib/types';

interface SettingsDialogProps {
  licenseKey: string | null;
  pinSettings: PinSettings | null;
  setPinSettings: (settings: PinSettings | null) => void;
  disabled?: boolean;
}

type DialogState = 'closed' | 'request_license' | 'manage_pins';

export function SettingsDialog({ licenseKey, pinSettings, setPinSettings, disabled }: SettingsDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('closed');
  const [licenseInput, setLicenseInput] = useState('');
  const [adminPin, setAdminPin] = useState(pinSettings?.adminPin || '');
  const [staffPin, setStaffPin] = useState(pinSettings?.staffPin || '');
  const { toast } = useToast();

  const handleOpen = () => {
    // Reset local state when opening
    setAdminPin(pinSettings?.adminPin || '');
    setStaffPin(pinSettings?.staffPin || '');
    setLicenseInput('');
    setDialogState('request_license');
  };

  const handleClose = () => {
    setDialogState('closed');
  };

  const handleLicenseCheck = () => {
    if (!licenseKey) {
      toast({ variant: 'destructive', title: 'Setup Error', description: 'No license key has been created for this application yet.' });
      return;
    }
    if (licenseInput === licenseKey) {
      toast({ title: 'Access Granted', description: 'You can now manage PINs.' });
      setDialogState('manage_pins');
    } else {
      toast({ variant: 'destructive', title: 'Invalid License Key' });
    }
  };

  const handleSavePins = () => {
    if (adminPin.trim().length < 4 || staffPin.trim().length < 4) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Both Admin and Staff PINs must be at least 4 characters long.' });
      return;
    }
    if (adminPin.trim() === staffPin.trim()) {
      toast({ variant: 'destructive', title: 'Invalid PINs', description: 'Admin and Staff PINs cannot be the same.' });
      return;
    }

    setPinSettings({ adminPin: adminPin.trim(), staffPin: staffPin.trim() });
    toast({ title: 'PINs Updated Successfully!' });
    handleClose();
  };

  return (
    <Dialog open={dialogState !== 'closed'} onOpenChange={(open) => !open && handleClose()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleOpen} disabled={disabled}>
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        {dialogState === 'request_license' && (
          <>
            <DialogHeader>
              <DialogTitle>Enter License Key</DialogTitle>
              <DialogDescription>
                To access settings, please enter your software license key.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2 py-4">
              <Label htmlFor="license-key-input">License Key</Label>
              <Input
                id="license-key-input"
                type="password"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLicenseCheck()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="button" onClick={handleLicenseCheck}>
                <KeyRound className="mr-2" /> Unlock
              </Button>
            </DialogFooter>
          </>
        )}
        {dialogState === 'manage_pins' && (
          <>
            <DialogHeader>
              <DialogTitle>Manage Access PINs</DialogTitle>
              <DialogDescription>
                Set the PINs for Admin and Staff roles. PINs must be at least 4 characters.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="admin-pin">Admin PIN</Label>
                <Input
                  id="admin-pin"
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter Admin PIN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-pin">Staff PIN</Label>
                <Input
                  id="staff-pin"
                  type="password"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  placeholder="Enter Staff PIN"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="button" onClick={handleSavePins}>
                <ShieldCheck className="mr-2" /> Save PINs
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
