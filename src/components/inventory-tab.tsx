'use client';

import React, { useState, useMemo } from 'react';
import { type Medicine, type SaleRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, Edit, Trash2, Search, ListFilter, Sparkles, Loader2, Info } from 'lucide-react';
import { MedicineForm } from './medicine-form';
import { ClientOnly } from './client-only';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { checkExpiryAction } from '@/app/actions';

interface InventoryTabProps {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  sales: SaleRecord[];
}

const getStockString = (med: Medicine) => {
  if (med.category === 'Tablet') {
    return `${med.stock.strips} strips, ${10 * med.stock.strips} tabs`;
  }
  return `${med.stock.quantity} units`;
};

const isLowStock = (med: Medicine) => {
    if (med.category === 'Tablet') {
        return med.stock.strips < 5;
    }
    return med.stock.quantity < 10;
}

const getExpiryInfo = (expiry: string) => {
  const now = new Date();
  const expiryDate = new Date(expiry);
  now.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: `Expired ${Math.abs(diffDays)}d ago`, isExpired: true, isNearExpiry: false };
  if (diffDays === 0) return { text: 'Expires today', isExpired: false, isNearExpiry: true };
  if (diffDays <= 30) return { text: `Expires in ${diffDays}d`, isExpired: false, isNearExpiry: true };
  return { text: new Date(expiry).toLocaleDateString(), isExpired: false, isNearExpiry: false };
};


export default function InventoryTab({ medicines, setMedicines, sales }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAlert, setAiAlert] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAiCheck = async () => {
    setAiLoading(true);
    setAiAlert(null);
    const result = await checkExpiryAction(medicines, sales);
    if ('alertMessage' in result) {
        setAiAlert(result.alertMessage);
    } else {
        toast({
            variant: "destructive",
            title: "AI Analysis Failed",
            description: result.error,
        });
    }
    setAiLoading(false);
  };


  const categories = useMemo(() => {
    const cats = new Set(medicines.map(m => m.category));
    return Array.from(cats);
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return medicines
      .filter(med => med.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(med => categoryFilters.length === 0 || categoryFilters.includes(med.category));
  }, [medicines, searchTerm, categoryFilters]);

  const handleSaveMedicine = (medicine: Medicine) => {
    if (editingMedicine) {
      setMedicines(medicines.map(m => (m.id === medicine.id ? medicine : m)));
    } else {
      setMedicines([...medicines, medicine]);
    }
    setEditingMedicine(null);
    setIsFormOpen(false);
  };

  const handleDeleteMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold font-headline">Inventory</h2>
        <div className="flex gap-2">
            <Button onClick={handleAiCheck} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Check Priority
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setEditingMedicine(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Medicine
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
                    </DialogHeader>
                    <MedicineForm
                        medicineToEdit={editingMedicine}
                        onSave={handleSaveMedicine}
                        onCancel={() => {
                            setEditingMedicine(null);
                            setIsFormOpen(false);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
      </div>

       {aiAlert && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>AI Priority Alert!</AlertTitle>
          <AlertDescription>{aiAlert}</AlertDescription>
        </Alert>
      )}


      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              <ListFilter className="mr-2 h-4 w-4" />
              Filter by Category
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {categories.map(cat => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={categoryFilters.includes(cat)}
                onCheckedChange={checked => {
                  setCategoryFilters(
                    checked
                      ? [...categoryFilters, cat]
                      : categoryFilters.filter(c => c !== cat)
                  );
                }}
              >
                {cat}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMedicines.length > 0 ? (
                filteredMedicines.sort((a,b) => a.name.localeCompare(b.name)).map(med => {
                const expiry = getExpiryInfo(med.expiry);
                return (
                    <TableRow key={med.id} className={cn(expiry.isExpired && "bg-destructive/20 hover:bg-destructive/30")}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{med.category}</TableCell>
                        <TableCell className="hidden lg:table-cell">{med.location}</TableCell>
                        <TableCell className={cn(
                            (expiry.isExpired || expiry.isNearExpiry) && "font-semibold text-destructive",
                        )}>
                            <ClientOnly fallback={<span className="w-24 h-4 bg-muted animate-pulse rounded-md" />}>
                                {expiry.text}
                            </ClientOnly>
                        </TableCell>
                        <TableCell className="text-right">₹{med.price.toFixed(2)}</TableCell>
                        <TableCell className={cn("text-right", isLowStock(med) && 'text-amber-500 font-semibold')}>{getStockString(med)}</TableCell>
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setEditingMedicine(med);
                                    setIsFormOpen(true);
                                }}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete {med.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the medicine from your inventory.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMedicine(med.id)}>
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                )
            })
            ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Info className="h-8 w-8 text-muted-foreground" />
                            <p>No medicines found.</p>
                            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
