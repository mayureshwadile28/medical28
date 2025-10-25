
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { type Medicine, type SaleRecord, type PaymentMode, type MedicineDescription, type SuggestMedicinesOutput, type SaleItem, isTablet, isGeneric } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Check, ChevronsUpDown, XCircle, MapPin, ShoppingCart, Trash2, Search, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { formatToINR } from '@/lib/currency';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/lib/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { suggestMedicines } from '@/ai/flows/suggest-medicines';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface PosTabProps {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
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

const DescriptionFormSchema = z.object({
  patientType: z.enum(['Human', 'Animal']),
  age: z.coerce.number().int().min(0, 'Age must be a positive number.').optional(),
  gender: z.enum(['Male', 'Female', 'Both']).optional(),
  illnesses: z.array(z.string()).min(1, 'Please select at least one symptom.'),
});

type DescriptionFormData = z.infer<typeof DescriptionFormSchema>;

function MedicineSuggestionDialog({ inventory, onAddToBill }: { inventory: Medicine[], onAddToBill: (medicine: Medicine) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestMedicinesOutput['suggestions']>([]);
  const { toast } = useToast();

  const form = useForm<DescriptionFormData>({
    resolver: zodResolver(DescriptionFormSchema),
    defaultValues: {
      patientType: 'Human',
      age: undefined,
      gender: 'Both',
      illnesses: [],
    },
  });

  const patientType = form.watch('patientType');
  
  const allIllnesses = useMemo(() => {
    const illnessSet = new Set<string>();
    inventory
      .filter(med => med.description?.patientType === patientType)
      .forEach(med => {
        if (med.description?.illness) {
          med.description.illness.split(',').forEach(symptom => {
            const trimmed = symptom.trim();
            if (trimmed) {
              const capitalizedSymptom = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
              illnessSet.add(capitalizedSymptom);
            }
          });
        }
      });
    return Array.from(illnessSet).sort();
  }, [inventory, patientType]);

  // Effect to reset illnesses when patientType changes
  React.useEffect(() => {
      form.setValue('illnesses', []);
  }, [patientType, form]);


  const onSubmit = async (data: DescriptionFormData) => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestMedicines({
        patient: {
          patientType: data.patientType,
          age: data.age,
          gender: data.gender,
          illnesses: data.illnesses,
        },
        inventory,
      });
      setSuggestions(result.suggestions);
       if (result.suggestions.length === 0) {
        toast({
            title: "No suggestions found",
            description: "We couldn't find a suitable medicine in your inventory for the given description.",
        });
      }
    } catch (error) {
      console.error('Error suggesting medicines:', error);
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: 'Could not get suggestions. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToBill = (medicineId: string) => {
    const medicine = inventory.find(m => m.id === medicineId);
    if (medicine) {
        onAddToBill(medicine);
        setIsOpen(false);
        form.reset();
        setSuggestions([]);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if(!open) {
          form.reset();
          setSuggestions([]);
          setIsLoading(false);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Search className="mr-2 h-4 w-4" />
          Find by Description
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find Medicine by Patient Description</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="patientType"
                    render={({ field }) => (
                        <FormItem>
                        <Label>Patient Type</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select patient type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Human">Human</SelectItem>
                                <SelectItem value="Animal">Animal</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="illnesses"
                    render={({ field }) => (
                        <FormItem>
                        <Label>Illness / Symptom(s)</Label>
                        <MultiSelect
                            options={allIllnesses}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Select symptoms..."
                        />
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {patientType === 'Human' && (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="age"
                            render={({ field }) => (
                            <FormItem>
                                <Label>Patient Age</Label>
                                <FormControl>
                                <Input
                                    type="number"
                                    placeholder="e.g., 25"
                                    value={field.value ?? ''}
                                    onChange={e => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? undefined : parseInt(value, 10));
                                    }}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                <Label>Patient Gender</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Both">Any</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Get Suggestions
                </Button>
            </form>
        </Form>
        {suggestions.length > 0 && (
            <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Suggestions:</h3>
                <ul className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-2">
                    {suggestions.map(suggestion => (
                        <li key={suggestion.medicineId} className="p-2 rounded-md hover:bg-muted">
                           <div className='flex items-start justify-between'>
                             <div>
                                <p className="font-bold">{suggestion.name}</p>
                                <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                             </div>
                             <Button size="sm" onClick={() => handleAddToBill(suggestion.medicineId)}>Add</Button>
                           </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MultiSelect = ({
    options,
    selected,
    onChange,
    className,
    placeholder = "Select...",
    ...props
}: {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
    placeholder?: string;
}) => {
    const [open, setOpen] = useState(false);

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item));
    };

    return (
        <Popover open={open} onOpenChange={setOpen} {...props}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={`w-full justify-between h-auto min-h-10 ${selected.length > 0 ? 'h-full' : 'h-10'}`}
                    onClick={() => setOpen(!open)}
                >
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? (
                            selected.map((item) => (
                                <Badge
                                    variant="secondary"
                                    key={item}
                                    className="mr-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnselect(item);
                                    }}
                                >
                                    {item}
                                    <X className="ml-1 h-3 w-3" />
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command className={className}>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    onSelect={() => {
                                        onChange(
                                            selected.includes(option)
                                                ? selected.filter((item) => item !== option)
                                                : [...selected, option]
                                        );
                                        setOpen(true);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function PosTab({ medicines, setMedicines, sales, setSales }: PosTabProps) {
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
      const expiryDate = new Date(med.expiry);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < now) return false;
      
      if (isTablet(med)) {
        return med.stock.tablets > 0;
      }
      return med.stock.quantity > 0;
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
    if (isGeneric(medicineToAdd) && medicineToAdd.stock.quantity === 0) {
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
          } else {
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

  const completeSale = () => {
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

    const newMedicines = [...medicines];
    billItems.forEach(item => {
      const medIndex = newMedicines.findIndex(m => m.id === item.medicineId);
      if (medIndex !== -1) {
        const med = newMedicines[medIndex];
        if (isTablet(med)) {
          med.stock.tablets -= Number(item.quantity);
        } else {
          med.stock.quantity -= Number(item.quantity);
        }
      }
    });
    setMedicines(newMedicines);

    const trimmedDoctorName = doctorName.trim();
    if (trimmedDoctorName && !doctorNames.includes(trimmedDoctorName)) {
        setDoctorNames([...doctorNames, trimmedDoctorName]);
    }

    const newSale: SaleRecord = {
      id: generateNewBillNumber(sales),
      customerName: customerName.trim(),
      doctorName: trimmedDoctorName,
      saleDate: new Date().toISOString(),
      items: billItems.map(item => ({...item, quantity: Number(item.quantity), category: item.category || ''})),
      totalAmount: totalAmount,
      paymentMode: paymentMode,
    };
    setSales([...sales, newSale]);
    
    setCustomerName('');
    setDoctorName('');
    setBillItems([]);
    setPaymentMode('Cash');
    toast({ title: 'Sale Completed!', description: `Bill for ${newSale.customerName} saved successfully.`});
  };
  
  const getStockString = (med: Medicine) => {
    if (isTablet(med)) {
        return `${med.stock.tablets} tabs`;
    }
    return `${med.stock.quantity} units`;
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
               <Suspense fallback={<p>Loading...</p>}>
                    <MedicineSuggestionDialog inventory={medicines} onAddToBill={addMedicineToBill} />
                </Suspense>
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
                          <Label htmlFor="payment-card">Card</Label>
                      </div>
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
