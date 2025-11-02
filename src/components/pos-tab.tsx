'use client';

import React, { useState, useMemo } from 'react';
import { type Medicine, type SaleRecord, type PaymentMode, type SaleItem, isTablet, isGeneric, type TabletMedicine, type GenericMedicine } from '@/lib/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, ChevronsUpDown, XCircle, MapPin, ShoppingCart, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { formatToINR } from '@/lib/currency';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/lib/hooks';
import { AppService } from '@/lib/service';

interface PosTabProps {
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  service: AppService;
}

const generateNewBillNumber = (sales: SaleRecord[]): string => {
  if (sales.length === 0) {
    return 'VM-00001';
  }

  const highestBillNum = sales.reduce((max, sale) => {
    const num = parseInt(sale.id.replace('VM-', ''), 10);
    return num > max ? num : max;
  }, 0);
  
  const newBillNum = highestBillNum + 1;
  return `VM-${newBillNum.toString().padStart(5, '0')}`;
};


export default function PosTab({ medicines, setMedicines, sales, setSales, service }: PosTabProps) {
  const [isMedicinePopoverOpen, setIsMedicinePopoverOpen] = useState(false);
  const [isDoctorPopoverOpen, setIsDoctorPopoverOpen] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorNames, setDoctorNames] = useLocalStorage<string[]>('doctorNames', []);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [billItems, setBillItems] = useState<SaleItem[]>([]);
  const { toast } = useToast();

  const [deletingDoctorName, setDeletingDoctorName] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const availableMedicines = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return medicines.filter(med => {
      if (!med.expiry || !med.stock) return false;
      const expiryDate = new Date(med.expiry);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < now) return false;
      
      if (isTablet(med)) {
        return med.stock.tablets > 0;
      }
      return isGeneric(med) && med.stock.quantity > 0;
    });
  }, [medicines]);

  const selectedMedicine = useMemo(() => {
    return medicines.find(m => m.id === selectedMedicineId);
  }, [medicines, selectedMedicineId]);

  const addMedicineToBill = (medicineToAdd: Medicine) => {
    if (!medicineToAdd) return;
    
    if (isTablet(medicineToAdd) && medicineToAdd.stock.tablets === 0) {
      toast({ title: 'Out of Stock', description: `${medicineToAdd.name} is out of stock.`, variant: "destructive" });
      return;
    }
    if (isGeneric(medicineToAdd) && (medicineToAdd.stock as GenericMedicine['stock'])?.quantity === 0) {
      toast({ title: 'Out of Stock', description: `${medicineToAdd.name} is out of stock.`, variant: "destructive" });
      return;
    }

    if (billItems.some(item => item.medicineId === medicineToAdd.id)) {
        toast({ title: 'Item already in bill', description: 'You can change the quantity in the table.', variant: "default" });
        return;
    }
    
    const pricePerUnit = isTablet(medicineToAdd)
      ? medicineToAdd.price / medicineToAdd.tabletsPerStrip 
      : medicineToAdd.price;

    const newItem: SaleItem = {
      medicineId: medicineToAdd.id,
      name: medicineToAdd.name,
      category: medicineToAdd.category,
      quantity: 1,
      pricePerUnit: pricePerUnit,
      total: pricePerUnit,
    };
    setBillItems([...billItems, newItem]);
    setSelectedMedicineId('');
  };

  const handleSelectAndAdd = () => {
      if (selectedMedicine) {
          addMedicineToBill(selectedMedicine);
      }
  }

  const updateItemQuantity = (medicineId: string, quantityStr: string) => {
    const quantity = quantityStr === '' ? '' : parseInt(quantityStr, 10);
  
    setBillItems(
      billItems.map(item => {
        if (item.medicineId === medicineId) {
          const med = medicines.find(m => m.id === medicineId);
          if (!med) return item;

          let validQuantity = isNaN(Number(quantity)) ? 0 : Number(quantity);
          if (quantity === '') {
             validQuantity = 0;
          }

          let stockLimit = Infinity;

          if (isTablet(med)) {
              stockLimit = med.stock.tablets;
          } else if (isGeneric(med)) {
              stockLimit = med.stock.quantity;
          }

          if (validQuantity > stockLimit) {
              toast({ title: 'Stock limit exceeded', description: `Only ${stockLimit} units available for ${med.name}.`, variant: "destructive" });
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

  const completeSale = async () => {
    if (!customerName.trim()) {
        toast({ title: 'Customer Name Required', description: 'Please enter a name for the customer.', variant: "destructive" });
        return;
    }
    if (billItems.length === 0) {
        toast({ title: 'Empty Bill', description: 'Please add items to the bill.', variant: "destructive" });
        return;
    }
    if(billItems.some(item => item.quantity === '' || item.quantity === 0 || isNaN(Number(item.quantity)))) {
        toast({ title: 'Invalid Quantity', description: 'Please ensure all item quantities are valid numbers greater than 0.', variant: "destructive" });
        return;
    }

    const updatedMeds = [...medicines];
    for (const item of billItems) {
      const medIndex = updatedMeds.findIndex(m => m.id === item.medicineId);
      if (medIndex !== -1) {
        const med = updatedMeds[medIndex];
        if (isTablet(med)) {
          med.stock.tablets -= Number(item.quantity);
        } else if (isGeneric(med)) {
          med.stock.quantity -= Number(item.quantity);
        }
        await service.saveMedicine(med);
      }
    }
    setMedicines(updatedMeds);

    const trimmedDoctorName = doctorName.trim();
    if (trimmedDoctorName && !doctorNames.includes(trimmedDoctorName)) {
        setDoctorNames([...doctorNames, trimmedDoctorName]);
    }

    const newSaleRecord: SaleRecord = {
      id: generateNewBillNumber(sales),
      customerName: customerName.trim(),
      doctorName: trimmedDoctorName,
      saleDate: new Date().toISOString(),
      items: billItems.map(item => ({...item, quantity: Number(item.quantity), category: item.category || ''})),
      totalAmount: totalAmount,
      paymentMode: paymentMode,
    };
    
    const savedSale = await service.saveSale(newSaleRecord);
    setSales(currentSales => [...currentSales, savedSale]);
    
    setCustomerName('');
    setDoctorName('');
    setBillItems([]);
    setPaymentMode('Cash');
    toast({ title: 'Sale Completed!', description: `Bill for ${savedSale.customerName} saved successfully.`});
  };
  
  const getStockString = (med: Medicine) => {
    if (isTablet(med)) {
        return `${med.stock.tablets} tabs`;
    }
    if (isGeneric(med)) {
        return `${med.stock.quantity} units`;
    }
    return 'N/A';
  };

  const handleDeleteDoctor = (nameToDelete: string) => {
    setDoctorNames(doctorNames.filter(name => name !== nameToDelete));
    if (doctorName === nameToDelete) {
        setDoctorName('');
    }
    setDeletingDoctorName(null);
    setDeleteConfirmation('');
    toast({ title: 'Doctor Removed', description: `Dr. ${nameToDelete} has been removed from the list.`});
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
                <Popover open={isMedicinePopoverOpen} onOpenChange={setIsMedicinePopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isMedicinePopoverOpen}
                        className="w-full sm:w-[300px] justify-between"
                        >
                        {selectedMedicineId && medicines.find(m => m.id === selectedMedicineId)
                            ? medicines.find(m => m.id === selectedMedicineId)?.name
                            : 'Select medicine...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full sm:w-[300px] p-0">
                        <Command>
                        <CommandInput placeholder={'Search medicine...'} />
                        <CommandList>
                            <CommandEmpty>No medicine found.</CommandEmpty>
                            <CommandGroup>
                            {availableMedicines.map((med) => (
                                <CommandItem
                                key={med.id}
                                value={med.name}
                                onSelect={() => {
                                    setSelectedMedicineId(med.id);
                                    setIsMedicinePopoverOpen(false);
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
                <Button onClick={handleSelectAndAdd} disabled={!selectedMedicineId}>Add to Bill</Button>
            </div>

            {selectedMedicine && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-primary border border-primary/20">
                <MapPin className="h-5 w-5" />
                <p className="text-sm font-medium">
                  <span className="font-semibold">{selectedMedicine.name}</span> &middot;{' '}
                  <span className="text-xs font-bold uppercase">{selectedMedicine.category}</span> &middot;{' '}
                  Location:{' '}
                  <span className="ml-1 inline-block rounded-md bg-primary px-2 py-1 font-bold text-primary-foreground">{selectedMedicine.location}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Bill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
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
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
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
                    <TableCell colSpan={6} className="h-24 text-center">
                       <div className="flex flex-col items-center justify-center gap-2">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                            <p>No items in bill.</p>
                            <p className="text-sm text-muted-foreground">Add medicines to get started.</p>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {billItems.length > 0 && (
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4} className="font-bold text-lg">Total</TableCell>
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
       <AlertDialog open={!!deletingDoctorName} onOpenChange={(open) => { if (!open) {setDeletingDoctorName(null); setDeleteConfirmation('')} }}>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Finalize the sale here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor='customer-name'>Customer Name</Label>
                  <Input
                  id="customer-name"
                  placeholder={'Enter customer name'}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  />
              </div>
              <div className="space-y-2">
                  <Label htmlFor='doctor-name'>Doctor's Name (Optional)</Label>
                  <Popover open={isDoctorPopoverOpen} onOpenChange={setIsDoctorPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isDoctorPopoverOpen}
                              className="w-full justify-between font-normal"
                          >
                              {doctorName || "Select or type doctor's name..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput 
                                  placeholder="Search or add doctor..."
                                  onValueChange={setDoctorName}
                                  value={doctorName}
                              />
                              <CommandList>
                                  <CommandEmpty>No doctor found. Type a name to add.</CommandEmpty>
                                  <CommandGroup>
                                      {doctorNames.map((name) => (
                                          <CommandItem
                                              key={name}
                                              value={name}
                                              onSelect={(currentValue) => {
                                                  setDoctorName(currentValue === doctorName ? "" : currentValue);
                                                  setIsDoctorPopoverOpen(false);
                                              }}
                                              className="group"
                                          >
                                              <Check
                                                  className={cn(
                                                      "mr-2 h-4 w-4",
                                                      doctorName === name ? "opacity-100" : "opacity-0"
                                                  )}
                                              />
                                              <span className='flex-1'>{name}</span>
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDeletingDoctorName(name);
                                                  }}
                                              >
                                                  <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                          </CommandItem>
                                      ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
              </div>
              <div className="space-y-2">
                  <Label>Mode of Payment</Label>
                  <RadioGroup
                      value={paymentMode}
                      onValueChange={(value: PaymentMode) => setPaymentMode(value)}
                      className="flex flex-wrap gap-x-4 gap-y-2"
                  >
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Cash" id="payment-cash" />
                          <Label htmlFor="payment-cash">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Online" id="payment-online" />
                          <Label htmlFor="payment-online">Online</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Card" id="payment-card" />
                          <Label htmlFor="payment-card">Card</Label>                      </div>
                       <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Pending" id="payment-pending" />
                          <Label htmlFor="payment-pending">Pending</Label>
                      </div>
                  </RadioGroup>
              </div>
              <div className="space-y-2 rounded-lg bg-primary/10 p-4">
                  <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className='font-mono'>{formatToINR(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount</span>
                      <span className='font-mono'>{formatToINR(totalAmount)}</span>
                  </div>
              </div>
            </CardContent>
            <CardFooter>
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
                        This will finalize the sale for {customerName} with a total of {formatToINR(totalAmount)} via {paymentMode}. This action cannot be undone.
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
            </CardFooter>
          </Card>
          <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Delete Dr. {deletingDoctorName}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove the doctor's name from your saved list.
                    <br />
                    To confirm, please type <strong>delete</strong> in the box below.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                    <Label htmlFor="delete-confirm-doctor" className="sr-only">Type "delete" to confirm</Label>
                    <Input 
                        id="delete-confirm-doctor"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={'Type "delete" to confirm'}
                        autoComplete="off"
                    />
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => { if(deletingDoctorName) handleDeleteDoctor(deletingDoctorName); }}
                    disabled={deleteConfirmation.toLowerCase() !== 'delete'}
                >
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
      </div>
    </div>
  );
}
