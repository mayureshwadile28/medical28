
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { type Medicine, type SaleRecord, type TabletMedicine, type GenericMedicine } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, Search, ListFilter, Info, ArrowDownUp, Bell, Upload, Download, CalendarClock } from 'lucide-react';
import { MedicineForm } from './medicine-form';
import { ClientOnly } from './client-only';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatToINR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface InventoryTabProps {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  sales: SaleRecord[];
  restockId?: string | null;
  onRestockComplete?: () => void;
}

type SortOption = 'name_asc' | 'expiry_asc' | 'expiry_desc';
type ImportMode = 'merge' | 'replace';

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
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');

  // State for sequential import with user prompts
  const [importQueue, setImportQueue] = useState<Medicine[]>([]);
  const [currentDuplicate, setCurrentDuplicate] = useState<{ imported: Medicine, existing: Medicine } | null>(null);
  const [newInventoryState, setNewInventoryState] = useState<Medicine[] | null>(null);
  const importStats = useRef({ added: 0, updated: 0, skipped: 0 });

  const getExpiryInfo = (expiry: string) => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const expiryDateUTC = new Date(expiry);
    const expiryDate = new Date(Date.UTC(expiryDateUTC.getUTCFullYear(), expiryDateUTC.getUTCMonth(), expiryDateUTC.getUTCDate()));

    const diffTime = expiryDate.getTime() - today.getTime();
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

    const date = new Date(expiry);
    const displayDate = date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });


    return {
      text: displayDate,
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
                return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
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
  
  // ----- NEW IMPORT LOGIC -----
  useEffect(() => {
    if (newInventoryState && !currentDuplicate) {
        processImportQueue();
    }
  }, [newInventoryState, currentDuplicate, importQueue]);

  const processImportQueue = () => {
    if (!newInventoryState || importQueue.length === 0) {
        if (newInventoryState) {
            // Finished processing
            setMedicines(newInventoryState);
            const { added, updated, skipped } = importStats.current;
            if (added > 0 || updated > 0 || skipped > 0) {
                toast({
                    title: 'Import Complete',
                    description: `${added} new item(s) added, ${updated} item(s) updated, ${skipped} item(s) skipped.`
                });
            }
            // Reset state
            setNewInventoryState(null);
            setImportQueue([]);
            setCurrentDuplicate(null);
            importStats.current = { added: 0, updated: 0, skipped: 0 };
        }
        return;
    }

    const queue = [...importQueue];
    const importedMed = queue.shift()!;
    
    const existingMedIndex = newInventoryState.findIndex(
        m => m.name.toLowerCase() === importedMed.name.toLowerCase() && m.category.toLowerCase() === importedMed.category.toLowerCase()
    );

    if (existingMedIndex > -1) {
        // Found a duplicate, pause and ask user
        setImportQueue(queue);
        setCurrentDuplicate({ imported: importedMed, existing: newInventoryState[existingMedIndex] });
    } else {
        // Not a duplicate, add it directly
        const updatedInventory = [...newInventoryState, { ...importedMed, id: importedMed.id || new Date().toISOString() + Math.random() }];
        importStats.current.added++;
        setImportQueue(queue);
        setNewInventoryState(updatedInventory);
    }
  };
  
  const handleDuplicateDecision = (decision: 'update' | 'add' | 'skip') => {
    if (!currentDuplicate || !newInventoryState) return;

    let inventory = [...newInventoryState];
    const { imported, existing } = currentDuplicate;

    if (decision === 'update') {
        const existingMedIndex = inventory.findIndex(m => m.id === existing.id);
        if (existingMedIndex > -1) {
            const updatedMed: Medicine = {
                ...inventory[existingMedIndex],
                ...imported,
                id: existing.id,
            };
            
            if ('tablets' in (updatedMed as TabletMedicine).stock && 'tablets' in (existing as TabletMedicine).stock) {
               (updatedMed as TabletMedicine).stock.tablets = ((existing as TabletMedicine).stock.tablets || 0) + ((imported as TabletMedicine).stock?.tablets || 0);
            } else if ('quantity' in (updatedMed as GenericMedicine).stock && 'quantity' in (existing as GenericMedicine).stock) {
               (updatedMed as GenericMedicine).stock.quantity = ((existing as GenericMedicine).stock.quantity || 0) + ((imported as GenericMedicine).stock?.quantity || 0);
            }
            
            inventory[existingMedIndex] = updatedMed;
            importStats.current.updated++;
        }
    } else if (decision === 'add') {
        inventory.push({ ...imported, id: new Date().toISOString() + Math.random() });
        importStats.current.added++;
    } else { // skip
        importStats.current.skipped++;
    }

    setCurrentDuplicate(null);
    setNewInventoryState(inventory);
  };

  const handleImportInventory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("Failed to read file.");
            
            const importedMedicines: Medicine[] = JSON.parse(text);
            if (!Array.isArray(importedMedicines)) throw new Error("Invalid file format.");

            if (importMode === 'replace') {
                setMedicines(importedMedicines);
                toast({ 
                    title: 'Import Successful', 
                    description: `Inventory replaced with ${importedMedicines.length} medicine(s).`
                });
            } else { // 'merge'
                importStats.current = { added: 0, updated: 0, skipped: 0 };
                setNewInventoryState([...medicines]);
                setImportQueue(importedMedicines);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Import Error', description: error.message || 'Invalid or corrupted file.' });
        } finally {
            if(fileInputRef.current) fileInputRef.current.value = "";
            setIsImportAlertOpen(false);
        }
    };
    reader.readAsText(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Inventory ({medicines.length} items)</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" asChild>
                <Link href="/expiry-report">
                    <CalendarClock className="mr-2 h-4 w-4" /> 
                    Expiry Report
                </Link>
            </Button>
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
              placeholder={`Search in ${medicines.length} items...`}
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
                                  <span className={cn("font-mono", (expiry.isExpired || expiry.isNearExpiry) && !expiry.isExpired && "font-semibold text-amber-500", expiry.isExpired && "font-semibold")}>{expiry.text}</span>
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
                              <p className="text-sm text-muted-foreground">{searchTerm || categoryFilters.length > 0 ? 'Try adjusting your search or filters.' : 'Add your first medicine to get started.'}</p>
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
            <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Inventory
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Import Inventory</AlertDialogTitle>
                        <AlertDialogDescription>
                            Choose how you want to import the inventory file.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <RadioGroup defaultValue="merge" value={importMode} onValueChange={(value: ImportMode) => setImportMode(value)} className="my-4 space-y-3">
                      <div>
                        <RadioGroupItem value="merge" id="merge" className="peer sr-only" />
                        <Label htmlFor="merge" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                          <span className="font-semibold">Merge with Existing</span>
                          <span className="text-sm text-muted-foreground">Adds new items and prompts for duplicates.</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="replace" id="replace" className="peer sr-only" />
                         <Label htmlFor="replace" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                          <span className="font-semibold">Replace Everything</span>
                          <span className="text-sm text-muted-foreground">Deletes current inventory and replaces it with the file.</span>
                        </Label>
                      </div>
                    </RadioGroup>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={triggerFileSelect}>
                            Choose File and Import
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
    
    <AlertDialog open={!!currentDuplicate} onOpenChange={open => !open && setCurrentDuplicate(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Item Found</AlertDialogTitle>
                <AlertDialogDescription>
                    Your inventory already has '{currentDuplicate?.existing.name}' (Category: {currentDuplicate?.existing.category}). What would you like to do?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button variant="destructive" onClick={() => handleDuplicateDecision('skip')}>Skip</Button>
                <Button variant="secondary" onClick={() => handleDuplicateDecision('add')}>Add as New</Button>
                <Button onClick={() => handleDuplicateDecision('update')}>Update Existing</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    