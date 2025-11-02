
'use client';

import React, { useState, useMemo } from 'react';
import { type Medicine, type SaleRecord, type PaymentMode, type SaleItem, isTablet, isGeneric, type TabletMedicine, type GenericMedicine, SuggestMedicinesOutput } from '@/lib/types';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, ChevronsUpDown, XCircle, MapPin, ShoppingCart, Trash2, Wand2, PlusCircle, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { formatToINR } from '@/lib/currency';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/lib/hooks';
import { AppService } from '@/lib/service';
import { suggestMedicines } from '@/ai/flows/suggest-medicines';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

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

function SuggestionDialog({ inventory, onAddMedicine }: { inventory: Medicine[], onAddMedicine: (medicine: Medicine) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [patientType, setPatientType] = useState<'Human' | 'Animal'>('Human');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Both' | ''>('');
    const [illnesses, setIllnesses] = useState('');
    const [suggestions, setSuggestions] = useState<SuggestMedicinesOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const uniqueSymptoms = useMemo(() => {
        const allSymptoms = new Set<string>();
        inventory.forEach(med => {
            if (med.description?.illness) {
                med.description.illness
                    .split(',')
                    .map(s => s.trim().toLowerCase())
                    .filter(Boolean)
                    .forEach(symptom => allSymptoms.add(symptom));
            }
        });
        
        return Array.from(allSymptoms)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .sort();
    }, [inventory]);

    const handleSymptomClick = (symptom: string) => {
        setIllnesses(prev => {
            const parts = prev.split(',').map(p => p.trim()).filter(Boolean);
            const lowerSymptom = symptom.toLowerCase();
            if (parts.map(p => p.toLowerCase()).includes(lowerSymptom)) {
                return parts.filter(p => p.toLowerCase() !== lowerSymptom).join(', ');
            } else {
                return [...parts, symptom].join(', ');
            }
        });
    };

    const handleFindMedicines = async () => {
        if (!illnesses.trim()) {
            toast({ variant: 'destructive', title: 'Symptom required', description: 'Please enter at least one symptom or illness.'});
            return;
        }

        setIsLoading(true);
        setSuggestions(null);
        try {
            const results = await suggestMedicines({
                patient: {
                    patientType,
                    age: age ? parseInt(age) : undefined,
                    gender: gender || undefined,
                    illnesses: illnesses.split(',').map(s => s.trim()).filter(Boolean),
                },
                inventory,
            });
            setSuggestions(results);
            if(results.suggestions.length === 0) {
                toast({ title: 'No matches found', description: 'Could not find any suitable medicines in your inventory.'})
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch suggestions.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = (medicineId: string) => {
        const medicineToAdd = inventory.find(m => m.id === medicineId);
        if(medicineToAdd) {
            onAddMedicine(medicineToAdd);
            toast({ title: `${medicineToAdd.name} added to bill.`});
            setIsOpen(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Wand2 className="mr-2 h-4 w-4" /> Find by Description</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Find Medicine by Description</DialogTitle>
                    <DialogDescription>
                        Describe the patient and their symptoms to get medicine suggestions from your inventory.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Patient Type</Label>
                            <Select value={patientType} onValueChange={(v: 'Human' | 'Animal') => setPatientType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Human">Human</SelectItem>
                                    <SelectItem value="Animal">Animal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {patientType === 'Human' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="age">Patient Age</Label>
                                    <Input id="age" type="number" placeholder="e.g., 35" value={age} onChange={e => setAge(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Patient Gender</Label>
                                    <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                                        <SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Both">Both/Any</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="illnesses">Symptoms / Illnesses</Label>
                            <Textarea
                                id="illnesses"
                                placeholder="Type symptoms or select from suggestions..."
                                value={illnesses}
                                onChange={e => setIllnesses(e.target.value)}
                            />
                            {uniqueSymptoms.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs text-muted-foreground">Click to add/remove symptoms</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {uniqueSymptoms.map(symptom => (
                                            <Badge 
                                                key={symptom}
                                                variant={illnesses.toLowerCase().split(', ').includes(symptom.toLowerCase()) ? 'default' : 'secondary'}
                                                onClick={() => handleSymptomClick(symptom)}
                                                className="cursor-pointer text-center justify-center truncate"
                                            >
                                                {symptom}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                         <Button onClick={handleFindMedicines} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Searching...</> : 'Find Medicines'}
                        </Button>
                    </div>
                    <div className="space-y-4">
                         <h3 className="font-semibold">Suggestions</h3>
                        {isLoading && (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                         {suggestions && (
                             suggestions.suggestions.length > 0 ? (
                                <Card className="max-h-[400px] overflow-y-auto">
                                    <CardContent className="p-0">
                                        <ul className="divide-y">
                                            {suggestions.suggestions.map(s => {
                                                const med = inventory.find(m => m.id === s.medicineId);
                                                return (
                                                <li key={s.medicineId} className="p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold">{s.name}</p>
                                                            <p className="text-sm text-muted-foreground">{s.reason}</p>
                                                            {med?.location && (
                                                                <div className="mt-1 flex items-center gap-1.5 text-xs text-primary">
                                                                    <MapPin className="h-3 w-3" />
                                                                    <span>Location: <span className="font-bold">{med.location}</span></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => handleAddClick(s.medicineId)}>
                                                            <PlusCircle className="h-5 w-5 text-primary" />
                                                        </Button>
                                                    </div>
                                                </li>
                                            )})}
                                        </ul>
                                    </CardContent>
                                </Card>
                             ) : (
                                !isLoading && (
                                <div className="flex flex-col items-center justify-center text-center p-6 border rounded-lg">
                                    <Lightbulb className="h-8 w-8 text-muted-foreground mb-2"/>
                                    <p className="font-semibold">No Matches Found</p>
                                    <p className="text-sm text-muted-foreground">Try broadening your search criteria.</p>
                                </div>
                                )
                             )
                         )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function PosTab({ medicines, setMedicines, sales, setSales, service }: PosTabProps) {
  const [isMedicinePopoverOpen, setIsMedicinePopoverOpen] = useState(false);
  const [isDoctorPopoverOpen, setIsDoctorPopoverOpen] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorNames, setDoctorNames] = useLocalStorage<string[]>('doctorNames', []);
  const [discount, setDiscount] = useState(0);

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

  const { subtotal, discountAmount, totalAmount } = useMemo(() => {
    const sub = billItems.reduce((sum, item) => sum + (isNaN(item.total) ? 0 : item.total), 0);
    const discountValue = (sub * (discount || 0)) / 100;
    const total = sub - discountValue;
    return { subtotal: sub, discountAmount: discountValue, totalAmount: total };
  }, [billItems, discount]);

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
      discountPercentage: discount,
      paymentMode: paymentMode,
    };
    
    const savedSale = await service.saveSale(newSaleRecord);
    setSales(currentSales => [...currentSales, savedSale]);
    
    setCustomerName('');
    setDoctorName('');
    setBillItems([]);
    setDiscount(0);
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

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseFloat(value);
    if (value === '') {
        setDiscount(0);
    } else if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        setDiscount(numValue);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
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
                <SuggestionDialog inventory={medicines} onAddMedicine={addMedicineToBill} />
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
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="w-[100px] text-center">Units</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Price/Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billItems.length > 0 ? (
                  billItems.map(item => (
                    <TableRow key={item.medicineId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.category}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.medicineId, e.target.value)}
                          className="text-center h-8"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">{formatToINR(item.pricePerUnit)}</TableCell>
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
                        <TableCell colSpan={4} className="font-bold text-lg hidden sm:table-cell">Subtotal</TableCell>
                        <TableCell className="font-bold text-lg sm:hidden">Subtotal</TableCell>
                        <TableCell className="text-right font-bold text-lg font-mono">{formatToINR(subtotal)}</TableCell>
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
              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className='font-mono'>{formatToINR(subtotal)}</span>
                  </div>
                   <div className="flex justify-between items-center text-sm">
                        <Label htmlFor="discount" className="text-muted-foreground">Discount (%)</Label>
                        <Input 
                            id="discount"
                            type="number"
                            value={discount === 0 ? '' : discount}
                            onChange={handleDiscountChange}
                            className="h-8 w-20 text-right"
                            placeholder="0"
                        />
                   </div>
                   {discount > 0 && (
                     <div className="flex justify-between text-sm text-destructive">
                        <span>Discount Amount</span>
                        <span className='font-mono'>- {formatToINR(discountAmount)}</span>
                    </div>
                   )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                      <span>Total</span>
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

    