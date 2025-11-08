'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Medicine, isTablet, type Batch, type TabletMedicine, OrderItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown, PlusCircle, Trash2, QrCode, Camera } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { QrScannerDialog } from './qr-scanner-dialog';
import { AiScannerDialog } from './ai-scanner-dialog';


const batchSchema = z.object({
    id: z.string(),
    batchNumber: z.string().min(1, 'Batch number is required.'),
    mfg: z.string().refine(val => /^\d{4}-\d{2}$/.test(val), { message: 'MFG date is required.' }),
    expiry: z.string().refine(val => /^\d{4}-\d{2}$/.test(val), { message: 'Expiry date is required.' }),
    price: z.coerce.number().positive('MRP must be a positive number.'),
    purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative.').optional(),
    stock_strips: z.coerce.number().min(0).optional(),
    stock_quantity: z.coerce.number().int().min(0).optional(),
}).refine(data => {
    if (data.mfg && data.expiry) {
        return new Date(data.expiry) > new Date(data.mfg);
    }
    return true;
}, { message: 'Expiry must be after manufacturing date.', path: ['expiry'] });

const DEFAULT_MEDICINE_VALUES: Omit<FormData, 'id'> = {
    name: '',
    category: '',
    customCategory: '',
    location: '',
    tablets_per_strip: 10,
    batches: [],
    description_patientType: undefined,
    description_illness: '',
    description_minAge: undefined,
    description_maxAge: undefined,
    description_gender: undefined,
};


// This is the factory function for the schema
const createFormSchema = (medicines: Medicine[], currentMedicineId?: string) => z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  customCategory: z.string().optional(),
  location: z.string().min(1, 'Location is required.'),
  tablets_per_strip: z.coerce.number().int().min(1).optional(),
  batches: z.array(batchSchema).min(1, "At least one batch is required."),
  // Description fields
  description_patientType: z.enum(['Human', 'Animal']).optional(),
  description_illness: z.string().optional(),
  description_minAge: z.coerce.number().min(0, "Age cannot be negative.").optional(),
  description_maxAge: z.coerce.number().min(0, "Age cannot be negative.").optional(),
  description_gender: z.enum(['Male', 'Female', 'Both']).optional(),
}).superRefine((data, ctx) => {
    if (data.category === 'Tablet' || data.category === 'Capsule') {
        if (data.tablets_per_strip === undefined || data.tablets_per_strip < 1) {
            ctx.addIssue({ code: 'custom', message: 'Tablets per strip is required and must be at least 1.', path: ['tablets_per_strip'] });
        }
        data.batches.forEach((batch, index) => {
            if (batch.stock_strips === undefined || batch.stock_strips < 0) {
                 ctx.addIssue({ code: 'custom', message: 'Strips required.', path: [`batches.${index}.stock_strips`] });
            }
        });
    } else if (data.category) { // Only check if category is selected
        data.batches.forEach((batch, index) => {
             if (batch.stock_quantity === undefined || batch.stock_quantity < 0) {
                ctx.addIssue({ code: 'custom', message: 'Quantity required.', path: [`batches.${index}.stock_quantity`] });
            }
        });
    }
    if (data.category === 'Other' && (!data.customCategory || data.customCategory.trim().length < 2)) {
        ctx.addIssue({ code: 'custom', message: 'Please specify a category name (at least 2 characters).', path: ['customCategory'] });
    }
    
    // Description fields validation
    const descriptionFields = [data.description_patientType, data.description_illness, data.description_minAge, data.description_maxAge, data.description_gender];
    const filledDescriptionFields = descriptionFields.filter(f => f !== undefined && f !== null && f !== '').length;

    if (filledDescriptionFields > 0) {
        if (!data.description_patientType) {
            ctx.addIssue({ code: 'custom', message: 'Patient type is required if providing a description.', path: ['description_patientType']});
        }
        if (!data.description_illness?.trim()) {
            ctx.addIssue({ code: 'custom', message: 'Illness is required if providing a description.', path: ['description_illness']});
        }
        if (data.description_patientType === 'Human') {
            if (data.description_minAge === undefined || data.description_minAge <= 0) {
                ctx.addIssue({ code: 'custom', message: 'Min age is required and must be > 0.', path: ['description_minAge']});
            }
            if (data.description_maxAge === undefined || data.description_maxAge <= 0) {
                ctx.addIssue({ code: 'custom', message: 'Max age is required and must be > 0.', path: ['description_maxAge']});
            }
            if (!data.description_gender) {
                ctx.addIssue({ code: 'custom', message: 'Gender is required if providing a description for humans.', path: ['description_gender']});
            }
            if (data.description_minAge !== undefined && data.description_maxAge !== undefined && data.description_maxAge < data.description_minAge) {
                ctx.addIssue({ code: 'custom', message: 'Max age cannot be less than min age.', path: ['description_maxAge']});
            }
        }
    }
    
    // Duplicate batch number validation
    const batchNumbersInForm = new Set<string>();
    data.batches.forEach((batch, index) => {
        const batchNum = batch.batchNumber.toLowerCase();
        if (!batchNum) return;

        // 1. Check for duplicates within the form itself
        if (batchNumbersInForm.has(batchNum)) {
            ctx.addIssue({
                code: 'custom',
                message: 'This batch number is duplicated in this form.',
                path: [`batches.${index}.batchNumber`],
            });
        }
        batchNumbersInForm.add(batchNum);
        
        // 2. Check for duplicates in the entire inventory
        for (const med of medicines) {
            if (!med || !med.batches) continue;
            for (const existingBatch of med.batches) {
                if (!existingBatch) continue;
                // If we are editing, we should not compare a batch against itself.
                // We identify a batch as "itself" if both the medicine ID and batch ID match.
                const isSelf = med.id === currentMedicineId && existingBatch.id === batch.id;
                if (isSelf) {
                    continue;
                }

                if (existingBatch.batchNumber.toLowerCase() === batchNum) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `Batch already exists in: ${med.name}`,
                        path: [`batches.${index}.batchNumber`],
                    });
                    return; // Stop after finding the first duplicate for this batch
                }
            }
        }
    });
});


interface MedicineFormProps {
  medicines: Medicine[]; // All medicines for validation
  medicineToEdit: Partial<Medicine> | null;
  onSave: (medicine: Medicine) => void;
  onCancel: () => void;
  categories: string[];
  isFromOrder?: boolean;
  startWithNewBatch?: boolean;
  orderItem?: OrderItem | null;
}

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().substring(0, 7);
    } catch(e) {
        return '';
    }
};

export function MedicineForm({ medicines, medicineToEdit, onSave, onCancel, categories, isFromOrder = false, startWithNewBatch = false, orderItem = null }: MedicineFormProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(!!medicineToEdit?.description);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [scanningBatchIndex, setScanningBatchIndex] = useState<number | null>(null);


  const isCustomCategory = medicineToEdit && medicineToEdit.category && !['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Injection', 'Other'].includes(medicineToEdit.category);

  const getInitialFormValues = (): FormData => {
    const baseValues = { ...DEFAULT_MEDICINE_VALUES, id: undefined };
    const defaultBatch: any = { id: new Date().toISOString() + Math.random(), batchNumber: '', mfg: '', expiry: '', price: 0, purchasePrice: 0, stock_quantity: 0, stock_strips: 0 };


    if (!medicineToEdit) {
        return {
            ...baseValues,
            batches: [defaultBatch],
        };
    }
    
    let batches: any[] = medicineToEdit.batches?.map(b => {
          const isTabletCategory = medicineToEdit.category === 'Tablet' || medicineToEdit.category === 'Capsule';
          const tabletsPerStrip = (isTabletCategory && (medicineToEdit as TabletMedicine).tabletsPerStrip) || 10;
          return {
              id: b.id || new Date().toISOString() + Math.random(),
              batchNumber: b.batchNumber,
              mfg: getFormattedDate(b.mfg),
              expiry: getFormattedDate(b.expiry),
              price: b.price,
              purchasePrice: b.purchasePrice,
              stock_strips: isTabletCategory ? (b.stock.tablets || 0) / tabletsPerStrip : 0,
              stock_quantity: !isTabletCategory ? b.stock.quantity : 0,
          };
    }) || [];
    
    // This logic handles adding a new empty batch when restocking/merging
    if (startWithNewBatch) {
        let newBatch = { ...defaultBatch };
        
        if (orderItem && medicineToEdit.category) {
            const isTabletCategory = medicineToEdit.category === 'Tablet' || medicineToEdit.category === 'Capsule';
            const qtyValue = orderItem.quantity ? parseInt(orderItem.quantity.replace(/\D/g, '')) || 0 : 0;
            
            if (isTabletCategory) {
                 const strips = (orderItem.unitName && orderItem.unitsPerPack) ? qtyValue * orderItem.unitsPerPack : qtyValue;
                 newBatch.stock_strips = strips;
            } else {
                 const units = (orderItem.unitName && orderItem.unitsPerPack) ? qtyValue * orderItem.unitsPerPack : qtyValue;
                 newBatch.stock_quantity = units;
            }
        }

        batches = [...batches, newBatch];
    } else if (isFromOrder && orderItem) {
        // This is for a completely new medicine from an order, pre-fill first batch
        const isTabletCategory = medicineToEdit.category === 'Tablet' || medicineToEdit.category === 'Capsule';
        const qtyValue = orderItem.quantity ? parseInt(orderItem.quantity.replace(/\D/g, '')) || 0 : 0;
         if (isTabletCategory) {
            const strips = (orderItem.unitName && orderItem.unitsPerPack) ? qtyValue * orderItem.unitsPerPack : qtyValue;
            if (batches.length > 0) batches[0].stock_strips = strips;
         } else {
            const units = (orderItem.unitName && orderItem.unitsPerPack) ? qtyValue * orderItem.unitsPerPack : qtyValue;
            if (batches.length > 0) batches[0].stock_quantity = units;
         }
    }
    
    const tabletsPerStrip = (isTablet(medicineToEdit) && (medicineToEdit as TabletMedicine).tabletsPerStrip) || 10;

    return {
      ...baseValues,
      id: medicineToEdit.id,
      name: medicineToEdit.name || '',
      category: isCustomCategory ? 'Other' : (medicineToEdit.category || ''),
      customCategory: isCustomCategory ? medicineToEdit.category : '',
      location: medicineToEdit.location || '',
      tablets_per_strip: tabletsPerStrip,
      batches: batches.length > 0 ? batches : [defaultBatch],
      description_patientType: medicineToEdit.description?.patientType,
      description_illness: medicineToEdit.description?.illness || '',
      description_minAge: medicineToEdit.description?.minAge,
      description_maxAge: medicineToEdit.description?.maxAge,
      description_gender: medicineToEdit.description?.gender,
    };
  };

  const formSchema = createFormSchema(medicines, medicineToEdit?.id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialFormValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "batches",
  });
  
  useEffect(() => {
    form.reset(getInitialFormValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicineToEdit, startWithNewBatch, orderItem, medicines]);


  const selectedCategory = form.watch('category');
  const patientType = form.watch('description_patientType');

  const handleSubmit = (values: FormData) => {
    const finalCategory = values.category === 'Other' ? values.customCategory! : values.category;
    const formattedName = values.name.trim();

    const formattedIllness = values.description_illness
      ? values.description_illness
          .split(',')
          .map(s => s.trim())
          .filter(s => s)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
          .join(', ')
      : undefined;

    let hasFullDescription = false;
    if (values.description_patientType === 'Human' && formattedIllness && values.description_minAge && values.description_maxAge && values.description_gender && values.description_minAge > 0 && values.description_maxAge > 0) {
        hasFullDescription = true;
    } else if (values.description_patientType === 'Animal' && formattedIllness) {
        hasFullDescription = true;
    }

    const newBatches: Batch[] = values.batches.map(b => {
        const mfgDate = new Date(`${b.mfg}-01T00:00:00Z`);
        const expiryDate = new Date(`${b.expiry}-01T00:00:00Z`);
        
        let stock: Batch['stock'] = {};
        if (finalCategory === 'Tablet' || finalCategory === 'Capsule') {
            stock.tablets = Math.round((b.stock_strips || 0) * (values.tablets_per_strip || 1));
        } else {
            stock.quantity = b.stock_quantity || 0;
        }

        return {
            id: b.id || new Date().toISOString() + Math.random(),
            batchNumber: b.batchNumber,
            mfg: mfgDate.toISOString(),
            expiry: expiryDate.toISOString(),
            price: b.price,
            purchasePrice: b.purchasePrice,
            stock: stock,
        };
    });

    let medicineData: Partial<Medicine> = {
        id: medicineToEdit?.id || new Date().toISOString() + Math.random(),
        name: formattedName,
        category: finalCategory,
        location: values.location,
        batches: newBatches,
    };
    
    if (hasFullDescription) {
        medicineData.description = {
            patientType: values.description_patientType!,
            illness: formattedIllness!,
            minAge: values.description_patientType === 'Human' ? (values.description_minAge || 0) : 0,
            maxAge: values.description_patientType === 'Human' ? (values.description_maxAge || 0) : 0,
            gender: values.description_patientType === 'Human' ? values.description_gender : undefined,
        };
    } else {
        medicineData.description = undefined;
    }

    if (finalCategory === 'Tablet' || finalCategory === 'Capsule') {
        (medicineData as TabletMedicine).tabletsPerStrip = values.tablets_per_strip || 10;
    }
    
    onSave(medicineData as Medicine);
  }

  const handleScanSuccess = (data: { batchNumber?: string, mfg?: string, expiry?: string }) => {
        if (scanningBatchIndex !== null) {
            if(data.batchNumber) {
                form.setValue(`batches.${scanningBatchIndex}.batchNumber`, data.batchNumber);
            }
             if(data.mfg) {
                form.setValue(`batches.${scanningBatchIndex}.mfg`, data.mfg);
            }
            if(data.expiry) {
                form.setValue(`batches.${scanningBatchIndex}.expiry`, data.expiry);
            }
        }
        setIsQrScannerOpen(false);
        setIsAiScannerOpen(false);
        setScanningBatchIndex(null);
    };

    const openQrScannerForBatch = (index: number) => {
        setScanningBatchIndex(index);
        setIsQrScannerOpen(true);
    };
    
    const openAiScannerForBatch = (index: number) => {
        setScanningBatchIndex(index);
        setIsAiScannerOpen(true);
    };

  return (
    <>
    <QrScannerDialog
        open={isQrScannerOpen}
        onOpenChange={(open) => {
            if (!open) {
                setIsQrScannerOpen(false);
                setScanningBatchIndex(null);
            }
        }}
        onScanSuccess={handleScanSuccess}
        scanMode="batchOnly"
    />
    <AiScannerDialog
        open={isAiScannerOpen}
        onOpenChange={(open) => {
            if (!open) {
                setIsAiScannerOpen(false);
                setScanningBatchIndex(null);
            }
        }}
        onScanSuccess={handleScanSuccess}
    />
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medicine Name</FormLabel>
              <FormControl>
                <Input placeholder={'e.g., Paracetamol 500mg'} {...field} disabled={isFromOrder} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isFromOrder}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={'Category'} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             {selectedCategory === 'Other' && (
                <FormField
                    control={form.control}
                    name="customCategory"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Custom Category Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Drops, Powder" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                        <Input placeholder={'e.g., Rack A1'} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>

        {(selectedCategory === 'Tablet' || selectedCategory === 'Capsule') && (
             <FormField
              control={form.control}
              name="tablets_per_strip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tablets per Strip</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={'e.g., 10'} {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Batches</Label>
            {fields.map((field, index) => (
                 <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 p-3 border rounded-lg relative bg-muted/50">
                     <FormField
                        control={form.control}
                        name={`batches.${index}.batchNumber`}
                        render={({ field: batchField }) => (
                            <FormItem className="lg:col-span-2">
                                <FormLabel>Batch #</FormLabel>
                                 <div className="flex items-center gap-1">
                                    <FormControl>
                                      <Input placeholder="Batch Number" {...batchField} />
                                    </FormControl>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => openQrScannerForBatch(index)}>
                                        <QrCode className="h-5 w-5"/>
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => openAiScannerForBatch(index)}>
                                        <Camera className="h-5 w-5"/>
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`batches.${index}.mfg`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>MFG</FormLabel>
                                <FormControl><Input type="month" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`batches.${index}.expiry`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Expiry</FormLabel>
                                <FormControl><Input type="month" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {(selectedCategory === 'Tablet' || selectedCategory === 'Capsule') ? (
                         <FormField
                            control={form.control}
                            name={`batches.${index}.stock_strips`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Strips</FormLabel>
                                    <FormControl><Input type="number" step="0.1" placeholder="Strips" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : (
                         <FormField
                            control={form.control}
                            name={`batches.${index}.stock_quantity`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl><Input type="number" placeholder="Units" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                     <FormField
                        control={form.control}
                        name={`batches.${index}.price`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>MRP</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="MRP" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name={`batches.${index}.purchasePrice`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Purchase Price</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="Cost" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex items-end self-center justify-self-center lg:absolute lg:right-1 lg:top-1/2 lg:-translate-y-1/2">
                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: new Date().toISOString() + Math.random(), batchNumber: '', mfg: '', expiry: '', price: 0, purchasePrice: 0, stock_quantity: 0, stock_strips: 0 })}
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Batch
            </Button>
            <FormMessage>{form.formState.errors.batches?.message}</FormMessage>
        </div>

        <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
            <CollapsibleTrigger asChild>
                <Button type="button" variant="link" className="p-0 h-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Usage Description
                    <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/30">
                 <div className="flex justify-between items-center mb-4">
                    <FormLabel>Provide usage details for smart suggestions.</FormLabel>
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                        form.setValue('description_patientType', undefined);
                        form.setValue('description_illness', '');
                        form.setValue('description_minAge', undefined);
                        form.setValue('description_maxAge', undefined);
                        form.setValue('description_gender', undefined);
                    }}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Clear
                    </Button>
                 </div>
                  <FormField
                      control={form.control}
                      name="description_patientType"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Patient Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                    name="description_illness"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Illness / Symptom</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Fever, Cold, Body Pain, Vomiting, Skin Infection" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {patientType === 'Human' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="description_minAge"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Min Age</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g., 5"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description_maxAge"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Age</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g., 60"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="description_gender"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Recommended For</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Both" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Both
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Male" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Male
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Female" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Female
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                  </>
                )}
            </CollapsibleContent>
        </Collapsible>


        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Medicine</Button>
        </div>
      </form>
    </Form>
    </>
  );
}
