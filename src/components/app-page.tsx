'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/lib/hooks';
import { type Medicine, type SaleRecord, type WholesalerOrder, type OrderItem, type UserRole, type PinSettings, type Wholesaler, type LicenseInfo } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart, History, ClipboardList, LayoutDashboard, Settings, KeyRound, Users, LineChart } from 'lucide-react';
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
import { AppService } from '@/lib/service';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';

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


export default function AppPage() {
  const [service] = useState(() => new AppService());
  const [medicines, setMedicines, medicinesLoading] = useLocalStorage<Medicine[]>('medicines', []);
  const [sales, setSales, salesLoading] = useLocalStorage<SaleRecord[]>('sales', []);
  const [wholesalerOrders, setWholesalerOrders, ordersLoading] = useLocalStorage<WholesalerOrder[]>('wholesalerOrders', []);
  const [wholesalers, setWholesalers, wholesalersLoading] = useLocalStorage<Wholesaler[]>('wholesalers', []);

  const [pinSettings, setPinSettings, pinsLoading] = useLocalStorage<PinSettings | null>('vicky-medical-pins', null);
  const [licenseKey, setLicenseKey, licenseLoading] = useLocalStorage<string | null>('vicky-medical-license', null);
  const [licenseInfo, setLicenseInfo, licenseInfoLoading] = useLocalStorage<LicenseInfo>('vicky-medical-license-info', {
    line1: 'Lic. No.: 20-DHL-212349, 21-DHL-212351',
    line2: 'Lic. No.: 20-DHL-212350'
  });
  
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const openRestockId = searchParams.get('restock');
  const openOrderTab = searchParams.get('open_order_tab');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAwaitingAdminPin, setIsAwaitingAdminPin] = useState(false);
  const [pendingTab, setPendingTab] = useState('');
  
  useEffect(() => {
    service.initialize({
      medicines,
      sales,
      wholesalerOrders,
      wholesalers,
      licenseInfo,
    });
  }, [service, medicines, sales, wholesalerOrders, wholesalers, licenseInfo]);

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
  
  const [orderItemToProcess, setOrderItemToProcess] = useState<{orderId: string, item: OrderItem, existingMedicine?: Medicine } | null>(null);

  useEffect(() => {
    if (orderItemToProcess) {
      setActiveTab('inventory');
    }
  }, [orderItemToProcess]);

  const isLoading = medicinesLoading || salesLoading || ordersLoading || licenseLoading || pinsLoading || wholesalersLoading || licenseInfoLoading;
  
  if (isLoading) {
    return null; // Return nothing while loading to prevent flash of content
  }
  
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

  const handleSaveMedicine = async (medicine: Medicine) => {
    const savedMedicine = await service.saveMedicine(medicine);
    setMedicines(prevMeds => {
        const isEditing = prevMeds.some(m => m.id === savedMedicine.id);
        if (isEditing) {
            return prevMeds.map(m => m.id === savedMedicine.id ? savedMedicine : m);
        }
        return [...prevMeds, savedMedicine];
    });
  };

  const handleDeleteMedicine = async (id: string) => {
    await service.deleteMedicine(id);
    setMedicines(prevMeds => prevMeds.filter(m => m.id !== id));
  };
  
  const handleSaveAllMedicines = async (allMedicines: Medicine[]) => {
      await service.saveAllMedicines(allMedicines);
      setMedicines(allMedicines);
  }
  
  const handleSaveWholesalers = async (allWholesalers: Wholesaler[]) => {
      await service.saveAllWholesalers(allWholesalers);
      setWholesalers(allWholesalers);
  }
  
  const handleSaveSales = async (allSales: SaleRecord[]) => {
      await service.saveAllSales(allSales);
      setSales(allSales);
  }

  const handleItemProcessed = async (medicine: Medicine | null) => {
    if (orderItemToProcess) {
      const { orderId, item } = orderItemToProcess;
      let orderToUpdate: WholesalerOrder | null = null;
      
      if (medicine && medicine.id) {
          orderToUpdate = await service.updateWholesalerOrderItemStatus(orderId, item.id, 'Received');
      }

      if (orderToUpdate) {
        setWholesalerOrders(currentOrders => currentOrders.map(o => o.id === orderToUpdate!.id ? orderToUpdate! : o));
        
        const hasMorePending = orderToUpdate.items.some(i => i.status === 'Pending');
        if (hasMorePending) {
            // Re-trigger the merge process for the next item in the same order
            // Using a timeout to allow React state to settle before dispatching a new event
            setTimeout(() => {
                const event = new CustomEvent('continue-merge', { detail: orderToUpdate });
                window.dispatchEvent(event);
            }, 100);
        }
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
  
  return (
    <>
      {!activeRole && (
        <PinDialog
            onPinSuccess={handlePinSuccess}
            pinSettings={pinSettings}
            setPinSettings={setPinSettings}
            licenseKey={licenseKey}
            setLicenseKey={setLicenseKey}
        />
      )}

      <AdminAuthDialog 
        open={isAwaitingAdminPin}
        onOpenChange={setIsAwaitingAdminPin}
        pinSettings={pinSettings}
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
                    licenseKey={licenseKey}
                    pinSettings={pinSettings}
                    setPinSettings={setPinSettings}
                    licenseInfo={licenseInfo}
                    setLicenseInfo={setLicenseInfo}
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
                  sales={sales}
                  setSales={setSales}
                  service={service}
                />
              </TabsContent>
              <TabsContent value="inventory" className="mt-0">
                <InventoryTab 
                  medicines={medicines} 
                  service={service}
                  restockId={openRestockId}
                  onRestockComplete={onRestockComplete}
                  orderItemToProcess={orderItemToProcess?.item}
                  existingMedicineToProcess={orderItemToProcess?.existingMedicine}
                  onItemProcessed={handleItemProcessed}
                  onSaveMedicine={handleSaveMedicine}
                  onDeleteMedicine={handleDeleteMedicine}
                  onSaveAllMedicines={handleSaveAllMedicines}
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
                  service={service}
                  onProcessOrderItem={setOrderItemToProcess}
                />
              </TabsContent>
               <TabsContent value="history" className="mt-0">
                <HistoryTab sales={sales} setSales={handleSaveSales} service={service} />
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
