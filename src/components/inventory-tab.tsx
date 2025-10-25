
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { PlusCircle, Edit, Trash2, Search, ListFilter, Info, ArrowDownUp, Bell, Upload, Download } from 'lucide-react';
import { MedicineForm } from './medicine-form';
import { ClientOnly } from './client-only';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatToINR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface InventoryTabProps {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  sales: SaleRecord[];
  restockId?: string | null;
  onRestockComplete?: () => void;
}

type SortOption = 'name_asc' | 'expiry_asc' | 'expiry_desc';

const getStockString = (med: Medicine) => {
  if (med.category === 'Tablet' || med.category === 'Capsule') {
    return `${(med as any).stock.tablets} tabs`;
  }
  return `${(med as any).stock.quantity} units`;
};

const isLowStock = (med: Medicine) => {
    if (med.category === 'Tablet' || med.category === 'Capsule') {
        return (med as any).stock.tablets > 0 && (med as any).stock.tablets < 50; // Low stock if less than 50 tabs (5 strips)
    }
    return (med as any).stock.quantity > 0 && (med as any).stock.quantity < 10;
}

const isOutOfStock = (med: Medicine) => {
    if (med.category === 'Tablet' || med.category === 'Capsule') {
        return (med as any).stock.tablets <= 0;
    }
    return (med as any).stock.quantity <= 0;
}

export default function InventoryTab({ medicines, setMedicines, sales, restockId, onRestockComplete }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('expiry_asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingMedicineId, setDeletingMedicineId] = useState<string | null>(null);
  const [pendingMedicine, setPendingMedicine] = useState<Medicine | null>(null);

  const getExpiryInfo = (expiry: string) => {
    const now = new Date();
    const expiryDate = new Date(expiry);
    now.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let remainderText = '';
    const absDiffDays = Math.abs(diffDays);

    if (diffDays < 0) {
      remainderText = `Expired ${absDiffDays} ${absDiffDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffDays === 0) {
      remainderText = 'Expires today';
    } else {
      remainderText = `Expires in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }

    return {
      text: expiryDate.toLocaleDateString(),
      remainder: remainderText,
      isExpired: diffDays < 0,
      isNearExpiry: diffDays >= 0 && diffDays <= 30,
      diffDays: diffDays,
    };
  };

  useEffect(() => {
    if (restockId) {
      const medicineToRestock = medicines.find(m => m.id === restockId);
      if (medicineToRestock) {
        setEditingMedicine(medicineToRestock);
        setIsFormOpen(true);
      }
    }
  }, [restockId, medicines]);


  const categories = useMemo(() => {
    const baseCategories = ['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Injection', 'Other'];
    const customCategories = medicines.map(m => m.category);
    return Array.from(new Set([...baseCategories, ...customCategories])).sort();
  }, [medicines]);

  const outOfStockMedicines = useMemo(() => {
    return medicines.filter(med => {
        if (med.category === 'Tablet' || med.category === 'Capsule') {
            return (med as any).stock.tablets <= 0;
        }
        return (med as any).stock.quantity <= 0;
    });
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    let sortedMeds = [...medicines];

    sortedMeds.sort((a, b) => {
        switch (sortOption) {
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'expiry_asc':
                return new Date(a.expiry).getTime() - new Date(a.expiry).getTime();
            case 'expiry_desc':
                return new Date(b.expiry).getTime() - new Date(a.expiry).getTime();
            default:
                return 0;
        }
    });

    return sortedMeds
      .filter(med => med.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(med => categoryFilters.length === 0 || categoryFilters.includes(med.category));
  }, [medicines, searchTerm, categoryFilters, sortOption]);

  const proceedWithSave = (medicine: Medicine) => {
    if (editingMedicine) {
      setMedicines(medicines.map(m => (m.id === medicine.id ? medicine : m)));
    } else {
      setMedicines([...medicines, medicine]);
    }
    setEditingMedicine(null);
    setIsFormOpen(false);
    if(onRestockComplete) onRestockComplete();
    setPendingMedicine(null);
  };

  const handleSaveMedicine = (medicine: Medicine) => {
    if (!editingMedicine) {
      const existingMedicine = medicines.find(m => m.name.toLowerCase() === medicine.name.toLowerCase());
      if (existingMedicine) {
        setPendingMedicine(medicine);
        return; // Stop execution and wait for user confirmation
      }
    }
    proceedWithSave(medicine);
  };

  const handleDeleteMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
    setDeletingMedicineId(null);
    setDeleteConfirmation('');
  };
  
  const handleCancelForm = () => {
    setEditingMedicine(null);
    setIsFormOpen(false);
    if(onRestockComplete) onRestockComplete();
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      handleCancelForm();
    }
  }

  const handleExportInventory = () => {
    const dataStr = JSON.stringify(medicines, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'medicines-backup.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Your inventory data has been successfully exported.' });
  };

  const handleImportInventory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const importedMedicines = JSON.parse(text);
            // Basic validation
            if (Array.isArray(importedMedicines) && (importedMedicines.length === 0 || importedMedicines[0].id)) {
              setMedicines(importedMedicines);
              toast({ title: 'Import Successful', description: 'Your inventory has been updated from the file.' });
            } else {
              throw new Error("Invalid file format");
            }
          }
        } catch (error) {
          toast({ variant: 'destructive', title: 'Import Error', description: 'The selected file is invalid or corrupted. Please check the file and try again.' });
        } finally {
            // Reset file input to allow importing the same file again
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Inventory</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" asChild>
                <Link href="/out-of-stock">
                    <Bell className="mr-2 h-4 w-4" /> 
                    Out of Stock
                    {outOfStockMedicines.length > 0 && <Badge variant="destructive" className="ml-2">{outOfStockMedicines.length}</Badge>}
                </Link>
            </Button>

            <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
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
                        onCancel={handleCancelForm}
                        categories={categories}
                    />
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={'Search by name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start md:w-auto">
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <DropdownMenuRadioItem value="expiry_asc">Expiry (Soonest First)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="expiry_desc">Expiry (Latest First)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">Name (A-Z)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start md:w-auto">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                 <DropdownMenuLabel>Category</DropdownMenuLabel>
                 <DropdownMenuSeparator />
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
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.length > 0 ? (
                  filteredMedicines.map(med => {
                  const expiry = getExpiryInfo(med.expiry);
                  return (
                      <TableRow key={med.id} className={cn(expiry.isExpired && "bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground", isOutOfStock(med) && "bg-muted/50")}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell className="hidden md:table-cell">{med.category}</TableCell>
                          <TableCell className="hidden lg:table-cell">{med.location}</TableCell>
                          <TableCell>
                            <ClientOnly fallback={<span className="w-24 h-4 bg-muted animate-pulse rounded-md" />}>
                              <div className='flex flex-col'>
                                  <span className={cn((expiry.isExpired || expiry.isNearExpiry) && !expiry.isExpired && "font-semibold text-amber-500", expiry.isExpired && "font-semibold")}>{expiry.text}</span>
                                  <span className={cn("text-xs", expiry.isExpired ? 'text-destructive-foreground/80' : 'text-muted-foreground')}>
                                    {expiry.remainder}
                                  </span>
                              </div>
                            </ClientOnly>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatToINR(med.price)}</TableCell>
                          <TableCell className={cn("text-right font-mono", isLowStock(med) && 'text-amber-500 font-semibold', isOutOfStock(med) && "text-destructive font-semibold")}>{getStockString(med)}</TableCell>
                          <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
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
                              <AlertDialog open={deletingMedicineId === med.id} onOpenChange={(open) => { if (!open) { setDeletingMedicineId(null); setDeleteConfirmation(''); }}}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingMedicineId(med.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {med.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the medicine from your inventory.
                                        <br />
                                        To confirm, please type <strong>delete</strong> in the box below.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-2">
                                        <Label htmlFor="delete-confirm-medicine" className="sr-only">Type "delete" to confirm</Label>
                                        <Input 
                                            id="delete-confirm-medicine"
                                            value={deleteConfirmation}
                                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                                            placeholder={'Type "delete" to confirm'}
                                        />
                                    </div>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteMedicine(med.id)}
                                      disabled={deleteConfirmation.toLowerCase() !== 'delete'}
                                    >
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
         <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
             <input
              type="file"
              ref={fileInputRef}
              accept="application/json"
              onChange={handleImportInventory}
              className="hidden"
            />
            <Button variant="outline" onClick={handleExportInventory}>
                <Download className="mr-2 h-4 w-4" />
                Export Inventory
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Inventory
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Inventory Import</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will replace your current inventory with the data from the selected file. This action cannot be undone. Are you sure you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={triggerFileSelect}>
                            Confirm Import
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={!!pendingMedicine} onOpenChange={(open) => !open && setPendingMedicine(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Medicine Found</AlertDialogTitle>
          <AlertDialogDescription>
            A medicine named "{pendingMedicine?.name}" already exists in your inventory. Do you want to add it anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingMedicine(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => pendingMedicine && proceedWithSave(pendingMedicine)}>
            Add Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
