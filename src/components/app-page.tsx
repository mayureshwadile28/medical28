
'use client';

import { useState, useEffect, useMemo } from 'react';
import { type Medicine, type SaleRecord, type WholesalerOrder, type OrderItem, type UserRole, type PinSettings, type Wholesaler, type LicenseInfo, type AppSettings } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart, History, ClipboardList, LayoutDashboard, Settings, KeyRound, Users, LineChart, Loader2, FolderOpen, AlertTriangle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

import PosTab from '@/components/pos-tab';
import InventoryTab from '@/components/inventory-tab';
import HistoryTab from '@/components/history-tab';
import OrderListTab from '@/components/order-list-tab';
import DashboardTab from '@/components/dashboard-tab';
import CustomersTab from '@/components/customers-tab';
import ReportsTab from '@/components/reports-tab';
import { PinDialog } from '@/components/pin-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { useFileSystemAccess } from '@/lib/hooks';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardDescription } from './ui/card';

type AppData = {
    medicines: Medicine[];
    sales: SaleRecord[];
    wholesalerOrders: WholesalerOrder[];
    wholesalers: Wholesaler[];
    appSettings: AppSettings;
};

function AdminAuthDialog({ open, onOpenChange, pinSettings, onVerified }: { open: boolean, onOpenChange: (open: boolean) => void, pinSettings: PinSettings | null, onVerified: () => void }) {
    const [pin, setPin] = useState('');
    const { toast } = useToast();

    const handleVerify = () => {
        if (!pinSettings) {
            toast({ variant: 'destructive', title: 'Error', description: 'PINs are not set up.' });
            return;
        }
        if (pin === pinSettings.adminPin) {
            onVerified();
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The Admin PIN is incorrect.' });
        }
        setPin('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Admin Access Required</DialogTitle>
                    <DialogDescription>
                        Please enter the Admin PIN to access this section.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="admin-pin-auth">Admin PIN</Label>
                    <Input
                        id="admin-pin-auth"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                        placeholder="****"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleVerify}><KeyRound className="mr-2 h-4 w-4" /> Verify</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const DEFAULT_SETTINGS: AppSettings = {
    licenseKey: '',
    pinSettings: { adminPin: '', staffPin: '' },
    licenseInfo: { line1: 'Lic. No.: 12345, 67890', line2: 'Lic. No.: 54321' },
    doctorNames: [],
};

const INITIAL_APP_DATA: AppData = {
    medicines: [],
    sales: [],
    wholesalerOrders: [],
    wholesalers: [],
    appSettings: DEFAULT_SETTINGS,
};

export default function AppPage() {
  const [appData, setAppData, isDataLoading, loadDataFile, dataFileName] = useFileSystemAccess<AppData>('vicky-medical-data', INITIAL_APP_DATA);

  const { medicines, sales, wholesalerOrders, wholesalers, appSettings } = appData;

  const setMedicines = (updater: (prev: Medicine[]) => Medicine[]) => {
    setAppData(d => ({ ...d, medicines: updater(d.medicines) }));
  };
  const setSales = (updater: (prev: SaleRecord[]) => SaleRecord[]) => {
    setAppData(d => ({ ...d, sales: updater(d.sales) }));
  };
  const setWholesalerOrders = (updater: (prev: WholesalerOrder[]) => WholesalerOrder[]) => {
    setAppData(d => ({ ...d, wholesalerOrders: updater(d.wholesalerOrders) }));
  };
  const setWholesalers = (updater: (prev: Wholesaler[]) => Wholesaler[]) => {
    setAppData(d => ({ ...d, wholesalers: updater(d.wholesalers) }));
  };
  const setAppSettings = (updater: (prev: AppSettings) => AppSettings) => {
    setAppData(d => ({ ...d, appSettings: updater(d.appSettings) }));
  };

  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const openRestockId = searchParams.get('restock');
  const openOrderTab = searchParams.get('open_order_tab');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAwaitingAdminPin, setIsAwaitingAdminPin] = useState(false);
  const [pendingTab, setPendingTab] = useState('');
  
  const [orderItemToProcess, setOrderItemToProcess] = useState<{orderId: string, item: OrderItem, existingMedicine?: Medicine } | null>(null);

  useEffect(() => {
    if (openRestockId) {
      setActiveTab('inventory');
    }
  }, [openRestockId]);

  useEffect(() => {
      if (openOrderTab) {
          setActiveTab('order_list');
          router.replace('/', { scroll: false });
      }
  }, [openOrderTab, router]);
  
  useEffect(() => {
    if (orderItemToProcess) {
      setActiveTab('inventory');
    }
  }, [orderItemToProcess]);
  
  const onRestockComplete = () => {
    router.push('/', { scroll: false });
  }
  
  const handlePinSuccess = (role: UserRole) => {
    setActiveRole(role);
    if (role === 'Staff') {
        setActiveTab('pos'); // Default staff to POS
    } else {
        setActiveTab('dashboard'); // Default admin to dashboard
    }
  };

  const handleLogout = () => {
    setActiveRole(null);
    setActiveTab('dashboard'); // Reset to a safe default
  }

  const handleSaveMedicine = (medicine: Medicine) => {
    setMedicines(prevMeds => {
      const existingIndex = prevMeds.findIndex(m => m.id === medicine.id);
      if (existingIndex > -1) {
        const newMeds = [...prevMeds];
        newMeds[existingIndex] = medicine;
        return newMeds;
      }
      return [...prevMeds, medicine];
    });
  };

  const handleDeleteMedicine = (id: string) => {
    setMedicines(prevMeds => prevMeds.filter(m => m.id !== id));
  };
  
  const handleItemProcessed = (medicine: Medicine | null) => {
    if (orderItemToProcess) {
      const { orderId, item } = orderItemToProcess;
      
      if (medicine && medicine.id) {
        setWholesalerOrders(currentOrders => {
            return currentOrders.map(order => {
                if (order.id === orderId) {
                    const updatedItems = order.items.map(i => 
                        i.id === item.id ? { ...i, status: 'Received' as 'Received' } : i
                    );
                    const allReceived = updatedItems.every(i => i.status === 'Received');
                    return { 
                        ...order, 
                        items: updatedItems,
                        status: allReceived ? 'Completed' : 'Partially Received',
                        receivedDate: allReceived ? new Date().toISOString() : order.receivedDate,
                    };
                }
                return order;
            });
        });
      }
      
      setOrderItemToProcess(null);
      // Do not force active tab change here on cancellation (medicine is null)
      if (medicine) {
        setActiveTab('order_list');
      }
    }
  };

  const handleTabChange = (tabValue: string) => {
    const adminOnlyTabs = ['dashboard', 'reports'];
    const isAdminTab = adminOnlyTabs.includes(tabValue);
    if (activeRole !== 'Admin' && isAdminTab) {
        setPendingTab(tabValue);
        setIsAwaitingAdminPin(true);
    } else {
        setActiveTab(tabValue);
    }
  };

  const handleAdminPinVerified = () => {
    setActiveRole('Admin');
    if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab('');
    }
  };
  
  if (isDataLoading) {
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!dataFileName) {
      return (
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
              <Card className="w-[450px]">
                  <DialogHeader className="p-6">
                      <DialogTitle className="flex items-center gap-3 text-2xl">
                          <FolderOpen className="h-8 w-8 text-primary" />
                          Welcome to Vicky Medical POS
                      </DialogTitle>
                      <DialogDescription>
                          To get started, please select your data file. If you're new, this will create one for you. Your data is saved locally on your computer.
                      </DialogDescription>
                  </DialogHeader>
                  <DialogContent className="p-6 pt-0">
                       <div className="rounded-md border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="font-semibold">Important!</h4>
                                <p className="text-sm">Please choose a safe location for your data file. You will need to re-select this file every time you open the app in a new browser tab.</p>
                            </div>
                          </div>
                       </div>
                  </DialogContent>
                  <DialogFooter className="p-6">
                      <Button onClick={loadDataFile} className="w-full" size="lg">
                          <FolderOpen className="mr-2 h-5 w-5" />
                          Select or Create Data File
                      </Button>
                  </DialogFooter>
              </Card>
          </div>
      );
  }
  
  return (
    <>
      {!activeRole && (
        <PinDialog
            onPinSuccess={handlePinSuccess}
            appSettings={appSettings}
            setAppSettings={setAppSettings}
        />
      )}

      <AdminAuthDialog 
        open={isAwaitingAdminPin}
        onOpenChange={setIsAwaitingAdminPin}
        pinSettings={appSettings?.pinSettings ?? null}
        onVerified={handleAdminPinVerified}
      />

      <main className={`min-h-screen bg-background text-foreground ${!activeRole ? 'blur-sm pointer-events-none' : ''}`}>
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
             <div className="flex items-center gap-2">
                <div className="text-right">
                    <p className="font-semibold text-sm">{activeRole}</p>
                    <Button variant="link" className="h-auto p-0 text-xs" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
                <SettingsDialog 
                    appSettings={appSettings}
                    setAppSettings={setAppSettings}
                    disabled={activeRole !== 'Admin'}
                />
            </div>
          </div>
        </div>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex justify-center md:justify-start">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto">
                 <TabsTrigger value="dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="pos">
                  <ShoppingCart className="mr-2 h-4 w-4" /> POS
                </TabsTrigger>
                <TabsTrigger value="inventory">
                  <Package className="mr-2 h-4 w-4" /> Inventory
                </TabsTrigger>
                 <TabsTrigger value="customers">
                  <Users className="mr-2 h-4 w-4" /> Customers
                </TabsTrigger>
                <TabsTrigger value="order_list">
                  <ClipboardList className="mr-2 h-4 w-4" /> Order List
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="mr-2 h-4 w-4" /> History
                </TabsTrigger>
                <TabsTrigger value="reports">
                  <LineChart className="mr-2 h-4 w-4" /> Reports
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="mt-6">
               <TabsContent value="dashboard" className="mt-0">
                <DashboardTab sales={sales} medicines={medicines} />
              </TabsContent>
              <TabsContent value="pos" className="mt-0">
                <PosTab
                  medicines={medicines}
                  setMedicines={setMedicines}
                  sales={sales}
                  setSales={setSales}
                  appSettings={appSettings}
                  onSaveAppSettings={setAppSettings}
                />
              </TabsContent>
              <TabsContent value="inventory" className="mt-0">
                <InventoryTab 
                  medicines={medicines} 
                  setMedicines={setMedicines}
                  restockId={openRestockId}
                  onRestockComplete={onRestockComplete}
                  orderItemToProcess={orderItemToProcess?.item}
                  existingMedicineToProcess={orderItemToProcess?.existingMedicine}
                  onItemProcessed={handleItemProcessed}
                  onSaveMedicine={handleSaveMedicine}
                  onDeleteMedicine={handleDeleteMedicine}
                />
              </TabsContent>
              <TabsContent value="customers" className="mt-0">
                  <CustomersTab sales={sales} />
              </TabsContent>
               <TabsContent value="order_list" className="mt-0">
                <OrderListTab 
                  medicines={medicines}
                  orders={wholesalerOrders}
                  setOrders={setWholesalerOrders}
                  wholesalers={wholesalers}
                  setWholesalers={setWholesalers}
                  onProcessOrderItem={setOrderItemToProcess}
                />
              </TabsContent>
               <TabsContent value="history" className="mt-0">
                <HistoryTab sales={sales} setSales={setSales} licenseInfo={appSettings.licenseInfo} />
              </TabsContent>
              <TabsContent value="reports" className="mt-0">
                  <ReportsTab sales={sales} medicines={medicines} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </>
  );
}
