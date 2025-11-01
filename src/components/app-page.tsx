
'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/lib/hooks';
import { type Medicine, type SaleRecord } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart, History, Loader2, KeyRound, ShieldCheck, Edit, Unlock, ClipboardList } from 'lucide-react';
import { initialMedicines, initialSales } from '@/lib/data';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import PosTab from '@/components/pos-tab';
import InventoryTab from '@/components/inventory-tab';
import HistoryTab from '@/components/history-tab';
import OrderListTab from '@/components/order-list-tab';

// This is the hardcoded MASTER password.
const MASTER_PASSWORD = 'MAYURESH-VINOD-WADILE-2009';

type DialogState = 'request_license' | 'request_master_password' | 'create_license';

function LicenseDialog({
  onLicenseValid,
  onLicenseCreated,
  hasLicenseBeenCreated,
  storedLicenseKey, // Receive the key as a prop
}: {
  onLicenseValid: () => void;
  onLicenseCreated: (newKey: string) => void;
  hasLicenseBeenCreated: boolean;
  storedLicenseKey: string | null;
}) {
  const [dialogState, setDialogState] = useState<DialogState>(
    hasLicenseBeenCreated ? 'request_license' : 'request_master_password'
  );
  const [input, setInput] = useState('');
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const { toast } = useToast();

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
        description: 'The password you entered is incorrect. Please try again.',
      });
    }
  };

  const handleCreateLicenseSubmit = () => {
    if (newLicenseKey.trim().length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid License Key',
        description: 'The new license key must be at least 6 characters long.',
      });
      return;
    }
    onLicenseCreated(newLicenseKey.trim());
    toast({
      title: 'License Key Created!',
      description: 'The application can now be activated with the new key.',
    });
    setDialogState('request_license');
    setInput(''); // Clear the input field for the next step
    setNewLicenseKey('');
  };

  const handleActivate = () => {
    if (input.trim() === storedLicenseKey) {
      toast({
        title: 'License Activated!',
        description: 'Thank you for activating your software.',
      });
      onLicenseValid();
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid License Key',
        description: 'The key you entered is incorrect. Please try again.',
      });
    }
  };

  const renderContent = () => {
    switch (dialogState) {
      case 'request_master_password':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Administrator Access</DialogTitle>
              <DialogDescription>
                To set up this application, please enter the master password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="master-password">Master Password</Label>
              <Input
                id="master-password"
                type="password"
                placeholder="Enter your master password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMasterPasswordSubmit()}
              />
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" onClick={handleMasterPasswordSubmit}>
                <Unlock className="mr-2 h-4 w-4" />
                Authorize
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
                Create a unique license key for this installation. The user will need this key to activate the software.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="new-license-key">New License Key</Label>
              <Input
                id="new-license-key"
                placeholder="Enter the new license key"
                value={newLicenseKey}
                onChange={(e) => setNewLicenseKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLicenseSubmit()}
              />
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" onClick={handleCreateLicenseSubmit}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Create and Save Key
              </Button>
            </DialogFooter>
          </>
        );

      case 'request_license':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Software Activation</DialogTitle>
              <DialogDescription>
                Please enter your license key to activate and use the application.
              </DialogDescription>
            </DialogHeader>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="license-key">License Key</Label>
              <Input
                id="license-key"
                placeholder="Enter your license key"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row sm:justify-between w-full">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => setDialogState('request_master_password')}
              >
                Forgot License Key?
              </Button>
              <Button type="button" onClick={handleActivate}>
                <KeyRound className="mr-2 h-4 w-4" />
                Activate
              </Button>
            </DialogFooter>
          </>
        );
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


export default function AppPage() {
  const [medicines, setMedicines, medicinesLoading] = useLocalStorage<Medicine[]>('medicines', initialMedicines);
  const [sales, setSales, salesLoading] = useLocalStorage<SaleRecord[]>('sales', initialSales);
  const [licenseKey, setLicenseKey, licenseLoading] = useLocalStorage<string | null>('vicky-medical-license', null);
  const [isActivated, setIsActivated, isActivatedLoading] = useLocalStorage<boolean>('vicky-medical-activated', false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const openRestockId = searchParams.get('restock');

  const [activeTab, setActiveTab] = useState(openRestockId ? 'inventory' : 'pos');
  
  useEffect(() => {
    if (openRestockId) {
      setActiveTab('inventory');
    }
  }, [openRestockId]);

  const isLoading = medicinesLoading || salesLoading || licenseLoading || isActivatedLoading;
  const isLicensed = !!licenseKey && isActivated;
  const hasLicenseBeenCreated = !!licenseKey;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
             <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-primary animate-pulse"
              >
                <path d="M14.5 10.5A3.5 3.5 0 0 0 11 7a3.5 3.5 0 0 0-3.5 3.5.95.95 0 0 0 .95.95h5.1a.95.95 0 0 0 .95-.95Z" />
                <path d="M20.5 10.5a8.5 8.5 0 1 0-17 0" />
              </svg>
            <h1 className="text-3xl font-bold font-headline text-foreground">Vicky Medical</h1>
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your pharmacy data...</p>
        </div>
      </div>
    );
  }
  
  const onRestockComplete = () => {
    // Navigating to the same path but without search params clears them
    router.push('/', { scroll: false });
  }

  const handleLicenseValidation = () => {
    setIsActivated(true);
  };
  
  const handleLicenseCreation = (newKey: string) => {
    setLicenseKey(newKey);
    setIsActivated(false); // Make sure they have to re-activate with the new key
  }
  
  return (
    <>
      {!isLicensed && (
        <LicenseDialog
          onLicenseValid={handleLicenseValidation}
          onLicenseCreated={handleLicenseCreation}
          hasLicenseBeenCreated={hasLicenseBeenCreated}
          storedLicenseKey={licenseKey}
        />
      )}
      <main className={`min-h-screen bg-background text-foreground ${!isLicensed ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="border-b">
          <div className="container mx-auto flex h-16 items-center px-4">
            <div className="flex items-center gap-3 flex-1">
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-primary"
                >
                  <path d="M14.5 10.5A3.5 3.5 0 0 0 11 7a3.5 3.5 0 0 0-3.5 3.5.95.95 0 0 0 .95.95h5.1a.95.95 0 0 0 .95-.95Z" />
                  <path d="M20.5 10.5a8.5 8.5 0 1 0-17 0" />
                </svg>
              <h1 className="text-2xl font-bold font-headline text-foreground">Vicky Medical POS</h1>
            </div>
          </div>
        </div>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center md:justify-start">
              <TabsList>
                <TabsTrigger value="pos">
                  <ShoppingCart className="mr-2 h-4 w-4" /> POS
                </TabsTrigger>
                <TabsTrigger value="inventory">
                  <Package className="mr-2 h-4 w-4" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="mr-2 h-4 w-4" /> History
                </TabsTrigger>
                <TabsTrigger value="order_list">
                  <ClipboardList className="mr-2 h-4 w-4" /> Order List
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="mt-6">
              <TabsContent value="pos" className="mt-0">
                <PosTab
                  medicines={medicines}
                  setMedicines={setMedicines}
                  sales={sales}
                  setSales={setSales}
                />
              </TabsContent>
              <TabsContent value="inventory" className="mt-0">
                <InventoryTab 
                  medicines={medicines} 
                  setMedicines={setMedicines}
                  sales={sales}
                  restockId={openRestockId}
                  onRestockComplete={onRestockComplete}
                />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <HistoryTab sales={sales} setSales={setSales} />
              </TabsContent>
               <TabsContent value="order_list" className="mt-0">
                <OrderListTab medicines={medicines} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </>
  );
}

    