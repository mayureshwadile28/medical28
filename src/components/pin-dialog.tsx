'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, Unlock } from 'lucide-react';
import type { PinSettings, UserRole } from '@/lib/types';

// This is the hardcoded MASTER password.
const MASTER_PASSWORD = 'MAYURESH-VINOD-WADILE-2009';

type DialogState = 'request_license' | 'request_master_password' | 'create_license' | 'pin_entry';

export function PinDialog({
  onPinSuccess,
  pinSettings,
  setPinSettings,
  licenseKey,
  setLicenseKey,
}: {
  onPinSuccess: (role: UserRole) => void;
  pinSettings: PinSettings | null;
  setPinSettings: (settings: PinSettings) => void;
  licenseKey: string | null;
  setLicenseKey: (key: string) => void;
}) {
  const [dialogState, setDialogState] = useState<DialogState>('pin_entry');
  const [input, setInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (licenseKey && pinSettings) {
      setDialogState('pin_entry');
    } else if (licenseKey && !pinSettings) {
      // If there's a license but no PINs, admin needs to create them
      toast({ title: 'Setup Required', description: 'Please create Admin and Staff PINs.'});
      setDialogState('request_master_password');
    } else {
      // First time setup
      setDialogState('request_master_password');
    }
  }, [licenseKey, pinSettings, toast]);

  const handleMasterPasswordSubmit = () => {
    if (input === MASTER_PASSWORD) {
      toast({
        title: 'Master Password Verified!',
        description: 'You can now create a new license key.',
      });
      setDialogState('create_license');
      setInput('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Master Password',
        description: 'The password you entered is incorrect.',
      });
    }
  };

  const handleCreateLicenseSubmit = () => {
    if (input.trim().length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid License Key',
        description: 'The new license key must be at least 6 characters long.',
      });
      return;
    }
    setLicenseKey(input.trim());
    toast({
      title: 'License Key Created!',
      description: 'The application is now licensed. Please set up your PINs.',
    });
    // Don't create PINs here, let the SettingsDialog handle it
    // Force a reload or state change to trigger useEffect to show PIN setup
    // For simplicity, we just guide the user.
    setDialogState('request_master_password'); // Go back to a safe state, useEffect will guide.
  };

  const handlePinEntry = () => {
    if (!pinSettings) {
      toast({ variant: 'destructive', title: 'Setup Error', description: 'PINs have not been set up yet.' });
      return;
    }

    if (input === pinSettings.adminPin) {
      toast({ title: 'Admin Access Granted', description: 'Welcome, Admin!' });
      onPinSuccess('Admin');
    } else if (input === pinSettings.staffPin) {
      toast({ title: 'Staff Access Granted', description: 'Welcome!' });
      onPinSuccess('Staff');
    } else {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'The PIN you entered is incorrect.' });
    }
    setInput('');
  };

  const renderContent = () => {
    switch (dialogState) {
      case 'request_master_password':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Administrator Setup</DialogTitle>
              <DialogDescription>
                To perform initial setup, please enter the master password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="master-password">Master Password</Label>
              <Input
                id="master-password"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMasterPasswordSubmit()}
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleMasterPasswordSubmit}>
                <Unlock className="mr-2" /> Authorize
              </Button>
            </DialogFooter>
          </>
        );

      case 'create_license':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Create New License Key</DialogTitle>
              <DialogDescription>
                Create a unique license key for this installation. This key will be required to change critical settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="new-license-key">New License Key</Label>
              <Input
                id="new-license-key"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLicenseSubmit()}
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleCreateLicenseSubmit}>
                <ShieldCheck className="mr-2" /> Create and Save Key
              </Button>
            </DialogFooter>
          </>
        );

      case 'pin_entry':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Enter Your PIN</DialogTitle>
              <DialogDescription>
                Please enter your Admin or Staff PIN to access the application.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="pin-input">PIN</Label>
              <Input
                id="pin-input"
                type="password"
                placeholder="****"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinEntry()}
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={handlePinEntry}>
                <KeyRound className="mr-2" /> Login
              </Button>
            </DialogFooter>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
