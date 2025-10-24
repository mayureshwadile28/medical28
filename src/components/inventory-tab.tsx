
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
import { useTranslation } from '@/lib/i18n/use-translation';
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
    return `${med.stock.tablets} tabs`;
  }
  return `${med.stock.quantity} units`;
};

const isLowStock = (med: Medicine) => {
    if (med.category === 'Tablet' || med.category === 'Capsule') {
        return med.stock.tablets > 0 && med.stock.tablets < 50; // Low stock if less than 50 tabs (5 strips)
    }
    return med.stock.quantity > 0 && med.stock.quantity < 10;
}

const isOutOfStock = (med: Medicine) => {
    if (med.category === 'Tablet' || med.category === 'Capsule') {
        return med.stock.tablets <= 0;
    }
    return med.stock.quantity <= 0;
}

export default function InventoryTab({ medicines, setMedicines, sales, restockId, onRestockComplete }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('expiry_asc');
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingMedicineId, setDeletingMedicineId] = useState<string | null>(null);

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
      remainderText = t(absDiffDays === 1 ? 'expired_day_ago' : 'expired_days_ago', { diffDays: absDiffDays.toString() });
    } else if (diffDays === 0) {
      remainderText = t('expires_today');
    } else {
      remainderText = t(diffDays === 1 ? 'expires_in_day' : 'expires_in_days', { diffDays: diffDays.toString() });
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
            return med.stock.tablets <= 0;
        }
        return med.stock.quantity <= 0;
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

  const handleSaveMedicine = (medicine: Medicine) => {
    if (editingMedicine) {
      setMedicines(medicines.map(m => (m.id === medicine.id ? medicine : m)));
    } else {
      setMedicines([...medicines, medicine]);
    }
    setEditingMedicine(null);
    setIsFormOpen(false);
    if(onRestockComplete) onRestockComplete();
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
    toast({ title: t('export_success_title'), description: t('export_inventory_success_desc') });
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
              toast({ title: t('import_success_title'), description: t('import_inventory_success_desc') });
            } else {
              throw new Error("Invalid file format");
            }
          }
        } catch (error) {
          toast({ variant: 'destructive', title: t('import_error_title'), description: t('import_error_desc') });
        } finally {
            // Reset file input to allow importing the same file again
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t('inventory_title')}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" asChild>
                <Link href="/out-of-stock">
                    <Bell className="mr-2 h-4 w-4" /> 
                    {t('out_of_stock_button')}
                    {outOfStockMedicines.length > 0 && <Badge variant="destructive" className="ml-2">{outOfStockMedicines.length}</Badge>}
                </Link>
            </Button>

            <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button onClick={() => setEditingMedicine(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> {t('add_medicine_button')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingMedicine ? t('edit_medicine_title') : t('add_new_medicine_title')}</DialogTitle>
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
              placeholder={t('search_by_name_placeholder')}
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
                  {t('sort_button')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('sort_by_label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <DropdownMenuRadioItem value="expiry_asc">{t('expiry_soonest_first')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="expiry_desc">{t('expiry_latest_first')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">{t('name_az')}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start md:w-auto">
                  <ListFilter className="mr-2 h-4 w-4" />
                  {t('filter_button')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                 <DropdownMenuLabel>{t('category_label')}</DropdownMenuLabel>
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
                <TableHead>{t('table_header_name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table_header_category')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('table_header_location')}</TableHead>
                <TableHead>{t('table_header_expiry')}</TableHead>
                <TableHead className="text-right">{t('table_header_price')}</TableHead>
                <TableHead className="text-right">{t('table_header_stock')}</TableHead>
                <TableHead className="text-right w-[100px]">{t('table_header_actions')}</TableHead>
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
                                    <AlertDialogTitle>{t('delete_medicine_title', { medicineName: med.name })}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('delete_medicine_description')}
                                        <br />
                                        <span dangerouslySetInnerHTML={{ __html: t('clear_history_confirm_prompt') }} />
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-2">
                                        <Label htmlFor="delete-confirm-medicine" className="sr-only">{t('delete_confirm_placeholder')}</Label>
                                        <Input 
                                            id="delete-confirm-medicine"
                                            value={deleteConfirmation}
                                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                                            placeholder={t('delete_confirm_placeholder')}
                                        />
                                    </div>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>{t('cancel_button')}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteMedicine(med.id)}
                                      disabled={deleteConfirmation.toLowerCase() !== 'delete'}
                                    >
                                        {t('delete_button')}
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
                              <p>{t('no_medicines_found_message')}</p>
                              <p className="text-sm text-muted-foreground">{t('adjust_filters_prompt')}</p>
                          </div>
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
         <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleExportInventory}>
                <Download className="mr-2 h-4 w-4" />
                {t('export_inventory_button')}
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        {t('import_inventory_button')}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('import_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('import_confirm_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="py-2">
                         <Label htmlFor="import-file-confirm" className="sr-only">Import File</Label>
                        <Input
                            id="import-file-confirm"
                            type="file"
                            ref={fileInputRef}
                            accept="application/json"
                            onChange={handleImportInventory}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ""; }}>{t('cancel_button')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (!fileInputRef.current?.files?.length) {
                                toast({ variant: 'destructive', title: t('import_error_title'), description: "Please select a file to import." });
                                return;
                            }
                            // The file is already selected and handled by onChange, just close the dialog.
                        }}>
                            {t('confirm_import_button')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
