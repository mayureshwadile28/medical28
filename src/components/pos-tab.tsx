
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type Medicine, type SaleRecord, type PaymentMode, type SaleItem, isTablet, isGeneric, type TabletMedicine, type GenericMedicine, getTotalStock, Batch, MedicineDescription } from '@/lib/types';
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
import { Check, ChevronsUpDown, XCircle, MapPin, ShoppingCart, Trash2, Search, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { formatToINR } from '@/lib/currency';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/lib/hooks';
import { AppService } from '@/lib/service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function DescriptionSearchDialog({ medicines, onSelectMedicine }: { medicines: Medicine[], onSelectMedicine: (medicineId: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIllnesses, setSelectedIllnesses] = useState<string[]>([]);
    const [searchCriteria, setSearchCriteria] = useState({
        patientType: '' as 'Human' | 'Animal' | '',
        age: '',
        gender: '' as 'Male' | 'Female' | 'Both' | '',
    });
    const [submittedCriteria, setSubmittedCriteria] = useState<typeof searchCriteria & { illnesses: string[] } | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const [isIllnessPopoverOpen, setIsIllnessPopoverOpen] = useState(false);
    const [illnessSearch, setIllnessSearch] = useState('');

    const allIllnesses = useMemo(() => {
        const illnessSet = new Set<string>();
        medicines.forEach(med => {
            if (med.description?.illness) {
                med.description.illness.split(',').forEach(i => {
                    const trimmed = i.trim();
                    if (trimmed) {
                        illnessSet.add(trimmed);
                    }
                });
            }
        });
        return Array.from(illnessSet).sort();
    }, [medicines]);

    const handleInputChange = (field: keyof typeof searchCriteria, value: string) => {
        setSearchCriteria(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSearch = () => {
        setSubmittedCriteria({ ...searchCriteria, illnesses: selectedIllnesses });
    };

    const handleClear = () => {
        setSelectedIllnesses([]);
        setSearchCriteria({ patientType: '', age: '', gender: '' });
        setSubmittedCriteria(null);
    };

    const searchResults = useMemo(() => {
        if (!submittedCriteria) {
            return [];
        }

        const { illnesses, patientType, age, gender } = submittedCriteria;
        if (illnesses.length === 0) return [];
        
        const ageNum = parseInt(age, 10);

        return medicines.filter(med => {
            if (!med.description) return false;
            
            const desc = med.description;
            const medIllnesses = desc.illness?.toLowerCase().split(',').map(i => i.trim());

            // Check if all selected illnesses are present in the medicine's description
            const illnessMatch = illnesses.every(ill => medIllnesses?.includes(ill.toLowerCase()));
            if (!illnessMatch) return false;

            const patientTypeMatch = patientType ? desc.patientType === patientType : true;
            if (!patientTypeMatch) return false;
            
            if (patientType === 'Human') {
                 const genderMatch = gender ? (desc.gender === 'Both' || desc.gender === gender) : true;
                 if (!genderMatch) return false;

                 if (!isNaN(ageNum) && ageNum > 0) {
                    const minAge = desc.minAge ?? 0;
                    const maxAge = desc.maxAge ?? Infinity;
                    if (ageNum < minAge || ageNum > maxAge) {
                        return false;
                    }
                 }
            }
            
            return true;
        });
    }, [submittedCriteria, medicines]);

    const handleSelect = (medicineId: string) => {
        onSelectMedicine(medicineId);
        setIsOpen(false);
        handleClear();
    };

    const handleIllnessSelect = (illness: string) => {
        setSelectedIllnesses(prev => {
            if (prev.includes(illness)) {
                return prev.filter(i => i !== illness);
            }
            return [...prev, illness];
        });
        setIllnessSearch('');
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Search className="mr-2 h-4 w-4" />
                    Find by Description
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Find Medicine by Description</DialogTitle>
                    <DialogDescription>Select symptoms, then specify patient details and click Search to find matching medicines.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Illness / Symptom(s)</Label>
                        <Popover open={isIllnessPopoverOpen} onOpenChange={setIsIllnessPopoverOpen}>
                            <PopoverTrigger asChild>
                                <div className="flex flex-wrap gap-1 rounded-md border border-input bg-background p-2 text-sm min-h-10 items-center">
                                    {selectedIllnesses.map(illness => (
                                        <Badge key={illness} variant="secondary" className="gap-1">
                                            {illness}
                                            <button onClick={() => handleIllnessSelect(illness)} className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    <input 
                                        ref={inputRef}
                                        value={illnessSearch}
                                        onChange={e => setIllnessSearch(e.target.value)}
                                        onFocus={() => setIsIllnessPopoverOpen(true)}
                                        className="bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                                        placeholder={selectedIllnesses.length === 0 ? "Select symptoms..." : ""}
                                    />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput 
                                        placeholder="Search illness..." 
                                        value={illnessSearch}
                                        onValueChange={setIllnessSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No illness found.</CommandEmpty>
                                        <CommandGroup>
                                            {allIllnesses
                                                .filter(illness => !selectedIllnesses.includes(illness))
                                                .filter(illness => illness.toLowerCase().includes(illnessSearch.toLowerCase()))
                                                .map((illness) => (
                                                <CommandItem
                                                    key={illness}
                                                    value={illness}
                                                    onSelect={() => handleIllnessSelect(illness)}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedIllnesses.includes(illness) ? "opacity-100" : "opacity-0")} />
                                                    {illness}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search-patient-type">Patient Type</Label>
                            <Select value={searchCriteria.patientType} onValueChange={(val) => handleInputChange('patientType', val as any)}>
                                <SelectTrigger id="search-patient-type">
                                    <SelectValue placeholder="Any Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Human">Human</SelectItem>
                                    <SelectItem value="Animal">Animal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="search-age">Age</Label>
                             <Input 
                                id="search-age"
                                type="number"
                                placeholder="e.g., 25"
                                value={searchCriteria.age}
                                onChange={(e) => handleInputChange('age', e.target.value)}
                                disabled={searchCriteria.patientType !== 'Human'}
                            />
                        </div>
                    </div>
                     {searchCriteria.patientType === 'Human' && (
                        <div className="space-y-2">
                           <Label>Gender</Label>
                           <RadioGroup value={searchCriteria.gender} onValueChange={(val) => handleInputChange('gender', val as any)} className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="" id="g-any" />
                                    <Label htmlFor="g-any">Any</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Male" id="g-male" />
                                    <Label htmlFor="g-male">Male</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Female" id="g-female" />
                                    <Label htmlFor="g-female">Female</Label>
                                </div>
                           </RadioGroup>
                        </div>
                     )}
                     
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleClear}>
                            <RotateCcw className="mr-2" /> Clear
                        </Button>
                        <Button onClick={handleSearch}>
                            <Search className="mr-2" /> Search
                        </Button>
                    </div>

                    <div className="max-h-[30vh] overflow-y-auto border-t pt-4">
                        {submittedCriteria && (
                             searchResults.length > 0 ? (
                                <ul className="space-y-2">
                                    {searchResults.map(med => (
                                        <li key={med.id}>
                                            <button
                                                type="button"
                                                className="w-full text-left p-3 rounded-md border bg-card hover:bg-accent transition-colors flex justify-between items-center"
                                                onClick={() => handleSelect(med.id)}
                                            >
                                                <span className="font-semibold">{med.name}</span>
                                                <Badge variant="secondary" className="flex items-center">
                                                    <MapPin className="mr-1.5" />
                                                    {med.location}
                                                </Badge>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                               <p className="text-center text-muted-foreground py-4">No results found for the specified criteria.</p>
                            )
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


function BatchSelectorDialog({ medicine, onSelect, onCancel }: { medicine: Medicine, onSelect: (batch: Batch) => void, onCancel: () => void }) {
    const sortedBatches = useMemo(() => {
        return [...medicine.batches]
            .filter(b => (b.stock.tablets || b.stock.quantity || 0) > 0)
            .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
    }, [medicine]);

    if (sortedBatches.length === 0) {
        // This case should ideally not be hit if checks are done before calling
        return null;
    }

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Batch for {medicine.name}</DialogTitle>
                    <DialogDescription>
                        Choose which batch to sell from. Batches expiring soonest are listed first.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <RadioGroup
                        onValueChange={(batchId) => {
                            const selectedBatch = medicine.batches.find(b => b.id === batchId);
                            if (selectedBatch) {
                                onSelect(selectedBatch);
                            }
                        }}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead></TableHead>
                                    <TableHead>Batch #</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">MRP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedBatches.map(batch => (
                                    <TableRow key={batch.id}>
                                        <TableCell>
                                            <RadioGroupItem value={batch.id} id={batch.id} />
                                        </TableCell>
                                        <TableCell>
                                            <Label htmlFor={batch.id} className="font-semibold cursor-pointer">{batch.batchNumber}</Label>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(batch.expiry).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {isTablet(medicine) ? `${batch.stock.tablets} tabs` : `${batch.stock.quantity} units`}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatToINR(batch.price)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </RadioGroup>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PosTab({ medicines, setMedicines, sales, setSales, service }: PosTabProps) {
  const [isMedicinePopoverOpen, setIsMedicinePopoverOpen] = useState(false);
  const [isDoctorPopoverOpen, setIsDoctorPopoverOpen] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorNames, setDoctorNames] = useLocalStorage<string[]>('doctorNames', []);
  const [discount, setDiscount] = useState(0);
  
  const [pendingBatchSelection, setPendingBatchSelection] = useState<Medicine | null>(null);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [billItems, setBillItems] = useState<SaleItem[]>([]);
  const { toast } = useToast();

  const [deletingDoctorName, setDeletingDoctorName] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');


  const availableMedicines = useMemo(() => {
    return medicines.filter(med => {
      if (!med || !med.batches) return false;
      const totalStock = getTotalStock(med);
      if (totalStock <= 0) return false;
      // Also check if there's at least one batch with a valid expiry
      const now = new Date();
      now.setHours(0,0,0,0);
      const hasAvailableBatch = med.batches.some(b => new Date(b.expiry) >= now && (b.stock.tablets || b.stock.quantity || 0) > 0);
      return hasAvailableBatch;
    });
  }, [medicines]);

  const selectedMedicine = useMemo(() => {
    return medicines.find(m => m.id === selectedMedicineId);
  }, [medicines, selectedMedicineId]);

  const addMedicineToBill = (medicineToAdd: Medicine, batch: Batch) => {
    if (!medicineToAdd || !batch) return;

    const stockInBatch = batch.stock.tablets || batch.stock.quantity || 0;
    if (stockInBatch <= 0) {
        toast({ title: 'Out of Stock', description: `Batch ${batch.batchNumber} of ${medicineToAdd.name} is out of stock.`, variant: "destructive" });
        return;
    }

    if (billItems.some(item => item.medicineId === medicineToAdd.id && item.batchNumber === batch.batchNumber)) {
        toast({ title: 'Item already in bill', description: 'You can change the quantity in the table.', variant: "default" });
        return;
    }
    
    let pricePerUnit = batch.price;
    if (isTablet(medicineToAdd)) {
        pricePerUnit = batch.price / medicineToAdd.tabletsPerStrip;
    }

    const newItem: SaleItem = {
      medicineId: medicineToAdd.id,
      name: medicineToAdd.name,
      category: medicineToAdd.category,
      batchNumber: batch.batchNumber,
      quantity: 1,
      pricePerUnit: pricePerUnit,
      total: pricePerUnit,
    };
    setBillItems([...billItems, newItem]);
    setSelectedMedicineId('');
    setPendingBatchSelection(null);
  };
  
  const handleSelectMedicine = (medicineId: string) => {
      const med = medicines.find(m => m.id === medicineId);
      if (!med) return;
      
      setSelectedMedicineId(medicineId);
      setIsMedicinePopoverOpen(false);

      const availableBatches = med.batches.filter(b => (b.stock.tablets || b.stock.quantity || 0) > 0);
      
      if (availableBatches.length === 0) {
           toast({ title: 'Out of Stock', description: `${med.name} is currently out of stock.`});
           return;
      }
      
      if (availableBatches.length > 1) {
          setPendingBatchSelection(med);
      } else if (availableBatches.length === 1) {
          addMedicineToBill(med, availableBatches[0]);
      }
  }

  const updateItemQuantity = (medicineId: string, batchNumber: string, quantityStr: string) => {
    const quantity = quantityStr === '' ? '' : parseInt(quantityStr, 10);
  
    setBillItems(
      billItems.map(item => {
        if (item.medicineId === medicineId && item.batchNumber === batchNumber) {
          const med = medicines.find(m => m.id === medicineId);
          if (!med) return item;
          const batch = med.batches.find(b => b.batchNumber === batchNumber);
          if (!batch) return item;

          let validQuantity = isNaN(Number(quantity)) ? 0 : Number(quantity);
          if (quantity === '') {
             validQuantity = 0;
          }

          const stockLimit = isTablet(med) ? (batch.stock.tablets || 0) : (batch.stock.quantity || 0);

          if (validQuantity > stockLimit) {
              toast({ title: 'Stock limit exceeded', description: `Only ${stockLimit} units available for ${med.name} (Batch: ${batchNumber}).`, variant: "destructive" });
              validQuantity = stockLimit;
          }
          
          return { ...item, quantity: quantityStr === '' ? '' : validQuantity, total: (quantityStr === '' ? 0 : validQuantity) * item.pricePerUnit };
        }
        return item;
      })
    );
  };
  
  const removeItemFromBill = (medicineId: string, batchNumber: string) => {
    setBillItems(billItems.filter(item => !(item.medicineId === medicineId && item.batchNumber === batchNumber)));
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
        const batchIndex = med.batches.findIndex(b => b.batchNumber === item.batchNumber);

        if (batchIndex !== -1) {
            const batch = med.batches[batchIndex];
            const quantitySold = Number(item.quantity);

            if (isTablet(med)) {
                batch.stock.tablets = (batch.stock.tablets || 0) - quantitySold;
            } else {
                batch.stock.quantity = (batch.stock.quantity || 0) - quantitySold;
            }
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
      items: billItems.map(item => ({
          ...item, 
          quantity: Number(item.quantity), 
          category: item.category || '',
          batchNumber: item.batchNumber,
      })),
      totalAmount: totalAmount,
      discountPercentage: discount,
      paymentMode: paymentMode,
    };
    
    const savedSale = await service.saveSale(newSaleRecord);
    
    const latestSales = await service.getSales();
    setSales(latestSales);
    
    setCustomerName('');
    setDoctorName('');
    setBillItems([]);
    setDiscount(0);
    setPaymentMode('Cash');
    toast({ title: 'Sale Completed!', description: `Bill for ${savedSale.customerName} saved successfully.`});
  };
  
  const getStockStringForMedicine = (med: Medicine) => {
    const totalStock = getTotalStock(med);
    if (isTablet(med)) {
        return `${totalStock} tabs`;
    }
    return `${totalStock} units`;
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
    <>
    {pendingBatchSelection && (
        <BatchSelectorDialog 
            medicine={pendingBatchSelection}
            onSelect={(batch) => addMedicineToBill(pendingBatchSelection, batch)}
            onCancel={() => setPendingBatchSelection(null)}
        />
    )}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Bill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-center">
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
                                onSelect={() => handleSelectMedicine(med.id)}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedMedicineId === med.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="flex justify-between w-full">
                                  <span>{med.name}</span>
                                  <span className="text-muted-foreground text-xs">{getStockStringForMedicine(med)}</span>
                                </div>
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                <DescriptionSearchDialog medicines={medicines} onSelectMedicine={handleSelectMedicine} />

            </div>

            {selectedMedicine && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-primary border border-primary/20 mt-4">
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
                  <TableHead className="hidden sm:table-cell">Batch #</TableHead>
                  <TableHead className="w-[100px] text-center">Units</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Price/Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billItems.length > 0 ? (
                  billItems.map(item => (
                    <TableRow key={`${item.medicineId}-${item.batchNumber}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">{item.batchNumber}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.medicineId, item.batchNumber, e.target.value)}
                          className="text-center h-8"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">{formatToINR(item.pricePerUnit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatToINR(item.total)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItemFromBill(item.medicineId, item.batchNumber)}>
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
    </>
  );
}

    