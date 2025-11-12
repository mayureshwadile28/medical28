'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Settings, KeyRound, ShieldCheck } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { Textarea } from './ui/textarea';

interface SettingsDialogProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  disabled?: boolean;
}

type DialogState = 'closed' | 'request_license' | 'manage_settings';

export function SettingsDialog({ appSettings, setAppSettings, disabled }: SettingsDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('closed');
  const [licenseInput, setLicenseInput] = useState('');
  
  const [adminPin, setAdminPin] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [licenseLine1, setLicenseLine1] = useState('');
  const [licenseLine2, setLicenseLine2] = useState('');
  
  const { toast } = useToast();

  const handleOpen = () => {
    if (disabled) return;
    // Reset local state when opening
    setAdminPin(appSettings?.pinSettings?.adminPin || '');
    setStaffPin(appSettings?.pinSettings?.staffPin || '');
    setLicenseLine1(appSettings?.licenseInfo?.line1 || '');
    setLicenseLine2(appSettings?.licenseInfo?.line2 || '');
    setLicenseInput('');
    if (appSettings?.licenseKey) {
        setDialogState('request_license');
    } else {
        toast({ variant: 'destructive', title: 'Setup Required', description: 'Master password setup is required first.'});
    }
  };

  const handleClose = () => {
    setDialogState('closed');
  };

  const handleLicenseCheck = () => {
    if (!appSettings?.licenseKey) {
      toast({ variant: 'destructive', title: 'Setup Error', description: 'No license key has been created for this application yet.' });
      return;
    }
    if (licenseInput === appSettings.licenseKey) {
      toast({ title: 'Access Granted', description: 'You can now manage settings.' });
      setDialogState('manage_settings');
    } else {
      toast({ variant: 'destructive', title: 'Invalid License Key' });
    }
  };

  const handleSave = () => {
    if (!appSettings) {
        toast({ variant: 'destructive', title: 'Error', description: 'App settings not loaded.' });
        return;
    }
    // PIN Validation
    if (adminPin.trim().length < 4 || staffPin.trim().length < 4) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Both Admin and Staff PINs must be at least 4 characters long.' });
      return;
    }
    if (adminPin.trim() === staffPin.trim()) {
      toast({ variant: 'destructive', title: 'Invalid PINs', description: 'Admin and Staff PINs cannot be the same.' });
      return;
    }

    // License Info Validation
    if (!licenseLine1.trim()) {
        toast({ variant: 'destructive', title: 'Invalid License Info', description: 'License Line 1 cannot be empty.' });
        return;
    }

    const newSettings: AppSettings = {
        ...appSettings,
        pinSettings: { adminPin: adminPin.trim(), staffPin: staffPin.trim() },
        licenseInfo: { line1: licenseLine1.trim(), line2: licenseLine2.trim() },
    };

    setAppSettings(newSettings);

    toast({ title: 'Settings Updated Successfully!' });
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
        {dialogState === 'manage_settings' && (
          <>
            <DialogHeader>
              <DialogTitle>Manage Application Settings</DialogTitle>
              <DialogDescription>
                Update access PINs and the license numbers displayed on bills.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
               <div className="space-y-4 p-4 border rounded-lg">
                 <h4 className="font-semibold text-lg">Access PINs</h4>
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

               <div className="space-y-4 p-4 border rounded-lg">
                 <h4 className="font-semibold text-lg">Bill License Numbers</h4>
                 <div className="space-y-2">
                    <Label htmlFor="license-line-1">License Line 1</Label>
                    <Textarea
                    id="license-line-1"
                    value={licenseLine1}
                    onChange={(e) => setLicenseLine1(e.target.value)}
                    placeholder="e.g., Lic. No.: 20-DHL-212349, 21-DHL-212351"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="license-line-2">License Line 2 (Optional)</Label>
                    <Textarea
                    id="license-line-2"
                    value={licenseLine2}
                    onChange={(e) => setLicenseLine2(e.target.value)}
                     placeholder="e.g., Lic. No.: 20-DHL-212350"
                    />
                </div>
               </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="button" onClick={handleSave}>
                <ShieldCheck className="mr-2" /> Save Settings
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
