'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Medicine, isTablet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, Edit, Info, Loader2 } from 'lucide-react';
import { AppService } from '@/lib/service';

export default function OutOfStockPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const service = new AppService();
    service.initialize().then(() => {
      setMedicines(service.getMedicines());
      setLoading(false);
    });
  }, []);

  const outOfStockMedicines = useMemo(() => {
    if (loading) return [];
    return medicines.filter(med => {
      if (isTablet(med)) {
        return med.stock.tablets <= 0;
      }
      return med.stock.quantity <= 0;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading stock information...</p>
      </div>
    );
  }

  const handleRestock = (medicineId: string) => {
    router.push(`/?restock=${medicineId}`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
       <div className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft />
                </Link>
            </Button>
            <h1 className="text-xl font-bold font-headline text-foreground ml-4">Out of Stock Items</h1>
          </div>
       </div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-destructive" />
              <CardTitle>Items to Restock ({outOfStockMedicines.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {outOfStockMedicines.length > 0 ? (
              <div className="max-h-[75vh] overflow-y-auto">
                <ul className="space-y-3">
                  {outOfStockMedicines.map(med => (
                    <li key={med.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{med.name}</p>
                        <p className="text-sm text-muted-foreground">{med.category} &middot; Location: <span className="font-medium text-foreground">{med.location}</span></p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => handleRestock(med.id)}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Restock
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                  <Info className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">Everything is in Stock!</h3>
                  <p className="text-muted-foreground">No items need to be restocked at the moment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
