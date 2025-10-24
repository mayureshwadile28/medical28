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

import { Check, ChevronsUpDown, XCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

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
  const [billItems, setBillItems] = useState<SaleItem[]>([]);
  const { toast } = useToast();

  const availableMedicines = useMemo(() => {
    const now = new Date();
    return medicines.filter(med => {
      const expiryDate = new Date(med.expiry);
      if (expiryDate <= now) return false;
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

    // Check if already in bill
    if (billItems.some(item => item.medicineId === selectedMedicine.id)) {
        toast({ title: "Item already in bill", description: "You can change the quantity in the table.", variant: "default" });
        return;
    }

    const pricePerUnit = selectedMedicine.category === 'Tablet' ? selectedMedicine.price / 10 : selectedMedicine.price;

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
          let stockLimit = Infinity;

          if (med.category === 'Tablet') {
              stockLimit = med.stock.tablets;
          } else {
              stockLimit = med.stock.quantity;
          }

          if (validQuantity > stockLimit) {
              toast({ title: "Stock limit exceeded", description: `Only ${stockLimit} units available for ${med.name}.`, variant: "destructive" });
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
        toast({ title: "Customer Name Required", description: "Please enter a name for the customer.", variant: "destructive" });
        return;
    }
    if (billItems.length === 0) {
        toast({ title: "Empty Bill", description: "Please add items to the bill.", variant: "destructive" });
        return;
    }
    if(billItems.some(item => item.quantity === '' || item.quantity === 0 || isNaN(Number(item.quantity)))) {
        toast({ title: "Invalid Quantity", description: "Please ensure all item quantities are valid numbers greater than 0.", variant: "destructive" });
        return;
    }

    // Update stock
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

    // Create sale record
    const newSale: SaleRecord = {
      id: new Date().toISOString() + Math.random(),
      customerName: customerName.trim(),
      saleDate: new Date().toISOString(),
      items: billItems.map(item => ({...item, quantity: Number(item.quantity)})),
      totalAmount: totalAmount,
    };
    setSales([...sales, newSale]);
    
    // Reset
    setCustomerName('');
    setBillItems([]);
    toast({ title: "Sale Completed!", description: `Bill for ${newSale.customerName} saved successfully.`});
  };
  
  const getStockString = (med: Medicine) => {
    if (med.category === 'Tablet') {
        return `${med.stock.tablets} tabs`;
    }
    return `${med.stock.quantity} units`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold font-headline">Point of Sale</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
           <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full sm:w-[300px] justify-between"
                >
                {selectedMedicine
                    ? selectedMedicine.name
                    : "Select medicine..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[300px] p-0">
                <Command>
                <CommandInput placeholder="Search medicine..." />
                <CommandList>
                    <CommandEmpty>No medicine found.</CommandEmpty>
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
          <Button onClick={addMedicineToBill} disabled={!selectedMedicineId}>Add to Bill</Button>
        </div>

        {selectedMedicine && (
          <div className="flex items-center gap-2 rounded-md bg-accent/10 p-3 text-accent-foreground border border-accent/20">
            <MapPin className="h-5 w-5 text-accent" />
            <p className="text-sm">
              Location for <span className="font-semibold">{selectedMedicine.name}</span>: 
              <span className="ml-2 inline-block rounded-md bg-accent px-2 py-1 font-bold text-accent-foreground">{selectedMedicine.location}</span>
            </p>
          </div>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-[100px] text-center">Units</TableHead>
                <TableHead className="text-right">Price/Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billItems.length > 0 ? (
                billItems.map(item => (
                  <TableRow key={item.medicineId}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.medicineId, e.target.value)}
                        className="text-center h-8"
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="text-right">₹{item.pricePerUnit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
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
                    No items in bill.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-bold text-lg">Total</TableCell>
                    <TableCell className="text-right font-bold text-lg">₹{totalAmount.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
      <div className="space-y-4 lg:col-span-1 p-4 rounded-lg border bg-card-foreground/5">
        <h3 className="text-xl font-bold font-headline">Checkout</h3>
        <div className="space-y-2">
            <label htmlFor='customer-name' className='text-sm font-medium'>Customer Name</label>
            <Input
            id="customer-name"
            placeholder="Enter customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            />
        </div>
        <div className="space-y-2 rounded-lg bg-primary/10 p-4">
            <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>₹{totalAmount.toFixed(2)}</span>
            </div>
        </div>

        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full" size="lg" disabled={billItems.length === 0 || customerName.trim() === ''}>
                    Complete Sale
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Sale</AlertDialogTitle>
                <AlertDialogDescription>
                  This will finalize the sale for {customerName} with a total of ₹{totalAmount.toFixed(2)} and update the inventory. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={completeSale}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
