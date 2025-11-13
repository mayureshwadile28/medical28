'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, Unlock } from 'lucide-react';
import type { PinSettings, UserRole, AppSettings } from '@/lib/types';
import { useLocalStorage } from '@/lib/hooks';

type DialogState =
  | 'request_license'
  | 'request_master_password'
  | 'create_master_password'
  | 'create_license'
  | 'pin_entry'
  | 'awaiting_pin_setup';

export function PinDialog({
  onPinSuccess,
  appSettings,
  setAppSettings,
}: {
  onPinSuccess: (role: UserRole) => void;
  appSettings: AppSettings | null;
  setAppSettings: (settings: AppSettings | null | ((val: AppSettings) => AppSettings | null)) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>('pin_entry');
  const [input, setInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      if (!appSettings?.masterPassword) {
        setDialogState('create_master_password');
      } else if (!appSettings?.licenseKey) {
        setDialogState('request_master_password');
      } else if (!appSettings.pinSettings?.adminPin || !appSettings.pinSettings?.staffPin) {
        setDialogState('awaiting_pin_setup');
        onPinSuccess('Admin');
      } else {
        setDialogState('pin_entry');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  const handleCreateMasterPassword = () => {
    if (input.trim().length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid Master Password',
        description: 'The master password must be at least 6 characters long.',
      });
      return;
    }
    const newMasterPassword = input.trim();
    setAppSettings(prev => ({
      ...(prev || { pinSettings: { adminPin: '', staffPin: '' }, doctorNames: [] }),
      masterPassword: newMasterPassword,
      licenseKey: '', // Ensure license key is empty for the next step
      licenseInfo: { line1: '', line2: '' }
    }));
    toast({
      title: 'Master Password Created!',
      description: 'You can now create a license key.',
    });
    setDialogState('create_license');
    setInput('');
  };

  const handleMasterPasswordSubmit = () => {
    if (input === appSettings?.masterPassword) {
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
    setAppSettings(prev => ({
        ...(prev || { pinSettings: { adminPin: '', staffPin: '' }, doctorNames: [] }),
        licenseKey: newLicenseKey,
        licenseInfo: { line1: 'Lic. No.: 12345, 67890', line2: 'Lic. No.: 54321' }
    }));
    toast({
      title: 'License Key Created!',
      description: 'The application is now licensed. Please set up your PINs in Settings.',
    });
    setDialogState('awaiting_pin_setup');
    onPinSuccess('Admin');
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
      case 'create_master_password':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Welcome! Create a Master Password</DialogTitle>
              <DialogDescription>
                This password will be used to access critical settings. Store it safely.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="new-master-password">New Master Password</Label>
              <Input
                id="new-master-password"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateMasterPassword()}
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleCreateMasterPassword}>
                <ShieldCheck className="mr-2" /> Create and Save
              </Button>
            </DialogFooter>
          </>
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

  const isDialogOpen = isMounted && dialogState !== 'awaiting_pin_setup';

  return (
    <Dialog open={isDialogOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
