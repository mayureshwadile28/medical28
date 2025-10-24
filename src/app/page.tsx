'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/lib/hooks';
import { type Medicine, type SaleRecord } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart, History, Loader2 } from 'lucide-react';
import { initialMedicines, initialSales } from '@/lib/data';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/use-translation';
import { LanguageSwitcher } from '@/components/language-switcher';


import InventoryTab from '@/components/inventory-tab';
import PosTab from '@/components/pos-tab';
import HistoryTab from '@/components/history-tab';

export default function Home() {
  const [medicines, setMedicines, medicinesLoading] = useLocalStorage<Medicine[]>('medicines', initialMedicines);
  const [sales, setSales, salesLoading] = useLocalStorage<SaleRecord[]>('sales', initialSales);
  const { t } = useTranslation();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const openRestockId = searchParams.get('restock');

  const [activeTab, setActiveTab] = useState(openRestockId ? 'inventory' : 'pos');

  useEffect(() => {
    if (openRestockId) {
      setActiveTab('inventory');
    }
  }, [openRestockId]);

  const isLoading = medicinesLoading || salesLoading;

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
          <p className="text-muted-foreground">{t('loading_pharmacy_data')}</p>
        </div>
      </div>
    );
  }
  
  const onRestockComplete = () => {
    // Navigating to the same path but without search params clears them
    router.push('/', { scroll: false });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
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
          <LanguageSwitcher />
        </div>
      </div>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center md:justify-start">
            <TabsList>
              <TabsTrigger value="pos">
                <ShoppingCart className="mr-2 h-4 w-4" /> {t('pos_tab')}
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <Package className="mr-2 h-4 w-4" /> {t('inventory_tab')}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" /> {t('history_tab')}
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
          </div>
        </Tabs>
      </div>
    </main>
  );
}
