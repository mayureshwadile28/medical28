'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, Unlock } from 'lucide-react';
import type { PinSettings, UserRole, AppSettings } from '@/lib/types';
import { useUser, initiateAnonymousSignIn, useAuth } from '@/firebase';

// This is the hardcoded MASTER password.
const MASTER_PASSWORD = 'MAYURESH-VINOD-WADILE-2009';

type DialogState = 'request_license' | 'request_master_password' | 'create_license' | 'pin_entry' | 'awaiting_pin_setup' | 'authenticating';

export function PinDialog({
  onPinSuccess,
  appSettings,
  setAppSettings,
}: {
  onPinSuccess: (role: UserRole) => void;
  appSettings: AppSettings | null;
  setAppSettings: (settings: AppSettings) => void;
}) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [dialogState, setDialogState] = useState<DialogState>('authenticating');
  const [input, setInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
        initiateAnonymousSignIn(auth);
    } else if (!isUserLoading && user) {
        if (appSettings) {
            if (appSettings.pinSettings?.adminPin && appSettings.pinSettings?.staffPin) {
                setDialogState('pin_entry');
            } else {
                setDialogState('awaiting_pin_setup');
                onPinSuccess('Admin');
            }
        } else {
             setDialogState('request_master_password');
        }
    }
  }, [user, isUserLoading, appSettings, auth, onPinSuccess]);


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
    const newLicenseKey = input.trim();
    const newSettings: AppSettings = {
        licenseKey: newLicenseKey,
        pinSettings: { adminPin: '', staffPin: '' },
        licenseInfo: { line1: 'Lic. No.: 12345, 67890', line2: 'Lic. No.: 54321' },
        doctorNames: [],
    };
    setAppSettings(newSettings);
    toast({
      title: 'License Key Created!',
      description: 'The application is now licensed. Please set up your PINs in Settings.',
    });
    // This will trigger the useEffect to move to 'awaiting_pin_setup' state
  };

  const handlePinEntry = () => {
    if (!appSettings?.pinSettings) {
      toast({ variant: 'destructive', title: 'Setup Error', description: 'PINs have not been set up yet.' });
      setDialogState('request_master_password');
      return;
    }

    if (input === appSettings.pinSettings.adminPin) {
      toast({ title: 'Admin Access Granted', description: 'Welcome, Admin!' });
      onPinSuccess('Admin');
    } else if (input === appSettings.pinSettings.staffPin) {
      toast({ title: 'Staff Access Granted', description: 'Welcome!' });
      onPinSuccess('Staff');
    } else {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'The PIN you entered is incorrect.' });
    }
    setInput('');
  };

  const renderContent = () => {
    switch (dialogState) {
      case 'authenticating':
        return (
             <DialogHeader>
              <DialogTitle>Authenticating...</DialogTitle>
              <DialogDescription>
                Connecting to the service. Please wait.
              </DialogDescription>
            </DialogHeader>
        );
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
      
      case 'awaiting_pin_setup':
         // This is a transient state. The dialog will be closed by the parent, so we render null.
         return null;

      default:
        return null;
    }
  };

  const isDialogOpen = dialogState !== 'awaiting_pin_setup';

  return (
    <Dialog open={isDialogOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
