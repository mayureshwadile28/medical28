'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { type Medicine, isTablet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CalendarClock, Info, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AppService } from '@/lib/service';

type FilterOption = 'expired' | '30' | '60' | '90';

const getStockString = (med: Medicine) => {
  if (isTablet(med)) {
    return `${med.stock.tablets} tabs`;
  }
  return `${med.stock.quantity} units`;
};

export default function ExpiryReportPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('30');

  useEffect(() => {
    const service = new AppService();
    service.initialize().then(() => {
      setMedicines(service.getMedicines());
      setLoading(false);
    });
  }, []);

  const filteredMedicines = useMemo(() => {
    if (loading) return [];
    
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    return medicines
      .map(med => {
        const expiryDateUTC = new Date(med.expiry);
        const expiryDate = new Date(Date.UTC(expiryDateUTC.getUTCFullYear(), expiryDateUTC.getUTCMonth(), expiryDateUTC.getUTCDate()));
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...med, diffDays };
      })
      .filter(med => {
        if (filter === 'expired') {
          return med.diffDays < 0;
        }
        const days = parseInt(filter, 10);
        return med.diffDays >= 0 && med.diffDays <= days;
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [medicines, loading, filter]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading medicine data...</p>
      </div>
    );
  }

  const getExpiryDisplay = (diffDays: number) => {
      if (diffDays < 0) {
          return <span className="font-semibold text-destructive">Expired {Math.abs(diffDays)} days ago</span>;
      }
      if (diffDays === 0) {
          return <span className="font-semibold text-amber-500">Expires Today</span>;
      }
      return <span className="text-amber-600">Expires in {diffDays} days</span>
  }
  
  const getFilterTitle = () => {
    switch (filter) {
        case 'expired': return 'Expired Medicines';
        case '30': return 'Medicines Expiring in Next 30 Days';
        case '60': return 'Medicines Expiring in Next 60 Days';
        case '90': return 'Medicines Expiring in Next 90 Days';
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
       <div className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft />
                </Link>
            </Button>
            <h1 className="text-xl font-bold font-headline text-foreground ml-4">Expiry Report</h1>
          </div>
       </div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <CalendarClock className="h-6 w-6 text-amber-500" />
                    <CardTitle>{getFilterTitle()} ({filteredMedicines.length})</CardTitle>
                </div>
                 <RadioGroup
                    value={filter}
                    onValueChange={(value: FilterOption) => setFilter(value)}
                    className="flex flex-wrap gap-2 sm:gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="expired" id="expired" />
                        <Label htmlFor="expired">Expired</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="30" id="d30" />
                        <Label htmlFor="d30">30 Days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="60" id="d60" />
                        <Label htmlFor="d60">60 Days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="90" id="d90" />
                        <Label htmlFor="d90">90 Days</Label>
                    </div>
                </RadioGroup>
            </div>
          </CardHeader>
          <CardContent>
             <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMedicines.length > 0 ? (
                            filteredMedicines.map(med => (
                                <TableRow key={med.id} className={cn(med.diffDays < 0 && 'bg-destructive/10')}>
                                    <TableCell className="font-semibold">{med.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{med.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(med.expiry).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                    </TableCell>
                                    <TableCell>{getExpiryDisplay(med.diffDays)}</TableCell>
                                    <TableCell className="text-right font-mono">{getStockString(med)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={5} className="h-48">
                                     <div className="flex flex-col items-center justify-center text-center">
                                        <Info className="h-10 w-10 text-muted-foreground mb-4" />
                                        <h3 className="text-xl font-semibold">All Clear!</h3>
                                        <p className="text-muted-foreground">No medicines match the selected filter.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
