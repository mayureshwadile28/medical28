
'use client';

import React, { useState, useMemo } from 'react';
import { type Medicine, type SaleRecord, type SaleItem, TabletMedicine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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

import { Check, ChevronsUpDown, XCircle, MapPin, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { formatToINR } from '@/lib/currency';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n/use-translation';

interface PosTabProps {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
}

export default function PosTab({ medicines, setMedicines, sales, setSales }: PosTabProps) {
  const [open, setOpen] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [billItems, setBillItems] = useState<SaleItem[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();

  const availableMedicines = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return medicines.filter(med => {
      const expiryDate = new Date(med.expiry);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < now) return false;
      
      if (med.category === 'Tablet') {
        return med.stock.tablets > 0;
      }
      return med.stock.quantity > 0;
    });
  }, [medicines]);

  const selectedMedicine = useMemo(() => {
    return medicines.find(m => m.id === selectedMedicineId);
  }, [medicines, selectedMedicineId]);

  const addMedicineToBill = () => {
    if (!selectedMedicine) return;
    
    if (selectedMedicine.category === 'Tablet' && selectedMedicine.stock.tablets === 0) {
      toast({ title: t('out_of_stock_title'), description: `${selectedMedicine.name} is out of stock.`, variant: "destructive" });
      return;
    }
    if (selectedMedicine.category !== 'Tablet' && selectedMedicine.stock.quantity === 0) {
      toast({ title: t('out_of_stock_title'), description: `${selectedMedicine.name} is out of stock.`, variant: "destructive" });
      return;
    }

    if (billItems.some(item => item.medicineId === selectedMedicine.id)) {
        toast({ title: t('item_already_in_bill_title'), description: t('item_already_in_bill_description'), variant: "default" });
        return;
    }
    
    const pricePerUnit = selectedMedicine.category === 'Tablet' 
      ? selectedMedicine.price / selectedMedicine.tabletsPerStrip 
      : selectedMedicine.price;

    const newItem: SaleItem = {
      medicineId: selectedMedicine.id,
      name: selectedMedicine.name,
      quantity: 1,
      pricePerUnit: pricePerUnit,
      total: pricePerUnit,
    };
    setBillItems([...billItems, newItem]);
    setSelectedMedicineId('');
  };

  const updateItemQuantity = (medicineId: string, quantityStr: string) => {
    const quantity = quantityStr === '' ? '' : parseInt(quantityStr, 10);
  
    setBillItems(
      billItems.map(item => {
        if (item.medicineId === medicineId) {
          const med = medicines.find(m => m.id === medicineId) as Medicine | undefined;
          if (!med) return item;

          let validQuantity = isNaN(Number(quantity)) ? 0 : Number(quantity);
          if (quantity === '') {
             validQuantity = 0;
          }

          let stockLimit = Infinity;

          if (med.category === 'Tablet') {
              stockLimit = med.stock.tablets;
          } else {
              stockLimit = med.stock.quantity;
          }

          if (validQuantity > stockLimit) {
              toast({ title: t('stock_limit_exceeded_title'), description: t('stock_limit_exceeded_description', { stockLimit: stockLimit.toString(), medicineName: med.name }), variant: "destructive" });
              validQuantity = stockLimit;
          }
          
          return { ...item, quantity: quantityStr === '' ? '' : validQuantity, total: (quantityStr === '' ? 0 : validQuantity) * item.pricePerUnit };
        }
        return item;
      })
    );
  };
  
  const removeItemFromBill = (medicineId: string) => {
    setBillItems(billItems.filter(item => item.medicineId !== medicineId));
  };

  const totalAmount = useMemo(() => {
    return billItems.reduce((sum, item) => sum + (isNaN(item.total) ? 0 : item.total), 0);
  }, [billItems]);

  const completeSale = () => {
    if (!customerName.trim()) {
        toast({ title: t('customer_name_required_title'), description: t('customer_name_required_description'), variant: "destructive" });
        return;
    }
    if (billItems.length === 0) {
        toast({ title: t('empty_bill_title'), description: t('empty_bill_description'), variant: "destructive" });
        return;
    }
    if(billItems.some(item => item.quantity === '' || item.quantity === 0 || isNaN(Number(item.quantity)))) {
        toast({ title: t('invalid_quantity_title'), description: t('invalid_quantity_description'), variant: "destructive" });
        return;
    }

    const newMedicines = [...medicines];
    billItems.forEach(item => {
      const medIndex = newMedicines.findIndex(m => m.id === item.medicineId);
      if (medIndex !== -1) {
        const med = newMedicines[medIndex];
        if (med.category === 'Tablet') {
          (med.stock as any).tablets -= Number(item.quantity);
        } else {
          (med.stock as any).quantity -= Number(item.quantity);
        }
      }
    });
    setMedicines(newMedicines);

    const newSale: SaleRecord = {
      id: new Date().toISOString() + Math.random(),
      customerName: customerName.trim(),
      doctorName: doctorName.trim(),
      saleDate: new Date().toISOString(),
      items: billItems.map(item => ({...item, quantity: Number(item.quantity)})),
      totalAmount: totalAmount,
    };
    setSales([...sales, newSale]);
    
    setCustomerName('');
    setDoctorName('');
    setBillItems([]);
    toast({ title: t('sale_completed_title'), description: t('sale_completed_description', {customerName: newSale.customerName})});
  };
  
  const getStockString = (med: Medicine) => {
    if (med.category === 'Tablet') {
        return `${med.stock.tablets} tabs`;
    }
    return `${med.stock.quantity} units`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('create_bill_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-[300px] justify-between"
                    >
                    {selectedMedicineId && medicines.find(m => m.id === selectedMedicineId)
                        ? medicines.find(m => m.id === selectedMedicineId)?.name
                        : t('select_medicine_placeholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[300px] p-0">
                    <Command>
                    <CommandInput placeholder={t('search_medicine_placeholder')} />
                    <CommandList>
                        <CommandEmpty>{t('no_medicine_found')}</CommandEmpty>
                        <CommandGroup>
                        {availableMedicines.map((med) => (
                            <CommandItem
                            key={med.id}
                            value={med.name}
                            onSelect={() => {
                                setSelectedMedicineId(med.id);
                                setOpen(false);
                            }}
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                selectedMedicineId === med.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <div className="flex justify-between w-full">
                              <span>{med.name}</span>
                              <span className="text-muted-foreground text-xs">{getStockString(med)}</span>
                            </div>
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                </PopoverContent>
              </Popover>
              <Button onClick={addMedicineToBill} disabled={!selectedMedicineId}>{t('add_to_bill_button')}</Button>
            </div>

            {selectedMedicine && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-primary border border-primary/20">
                <MapPin className="h-5 w-5" />
                <p className="text-sm font-medium">
                  {t('location_for_medicine')}{' '}
                  <span className="font-semibold">{selectedMedicine.name}</span>: 
                  <span className="ml-2 inline-block rounded-md bg-primary px-2 py-1 font-bold text-primary-foreground">{selectedMedicine.location}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('current_bill_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bill_item_header')}</TableHead>
                  <TableHead className="w-[100px] text-center">{t('bill_units_header')}</TableHead>
                  <TableHead className="text-right">{t('bill_price_unit_header')}</TableHead>
                  <TableHead className="text-right">{t('bill_total_header')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billItems.length > 0 ? (
                  billItems.map(item => (
                    <TableRow key={item.medicineId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.medicineId, e.target.value)}
                          className="text-center h-8"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatToINR(item.pricePerUnit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatToINR(item.total)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItemFromBill(item.medicineId)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                       <div className="flex flex-col items-center justify-center gap-2">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                            <p>{t('no_items_in_bill_message')}</p>
                            <p className="text-sm text-muted-foreground">{t('add_medicines_prompt')}</p>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {billItems.length > 0 && (
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="font-bold text-lg">{t('bill_total_label')}</TableCell>
                        <TableCell className="text-right font-bold text-lg font-mono">{formatToINR(totalAmount)}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>{t('checkout_title')}</CardTitle>
            <CardDescription>{t('checkout_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor='customer-name'>{t('customer_name_label')}</Label>
                <Input
                id="customer-name"
                placeholder={t('customer_name_placeholder')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor='doctor-name'>{t('doctor_name_label')}</Label>
                <Input
                id="doctor-name"
                placeholder={t('doctor_name_placeholder')}
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                />
            </div>
            <div className="space-y-2 rounded-lg bg-primary/10 p-4">
                <div className="flex justify-between text-muted-foreground">
                    <span>{t('subtotal_label')}</span>
                    <span className='font-mono'>{formatToINR(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                    <span>{t('total_amount_label')}</span>
                    <span className='font-mono'>{formatToINR(totalAmount)}</span>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="w-full" size="lg" disabled={billItems.length === 0 || customerName.trim() === ''}>
                        {t('complete_sale_button')}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirm_sale_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('confirm_sale_description', { customerName: customerName, totalAmount: formatToINR(totalAmount) })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel_button')}</AlertDialogCancel>
                    <AlertDialogAction onClick={completeSale}>
                      {t('confirm_button')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
