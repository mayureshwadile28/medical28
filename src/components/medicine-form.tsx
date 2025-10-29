
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Medicine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  customCategory: z.string().optional(),
  location: z.string().min(1, 'Location is required.'),
  expiry: z.string().refine((val) => {
    if (!val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const selectedDate = new Date(val);
    return selectedDate.getTime() >= today.getTime();
  }, {
    message: 'Expiry date cannot be in the past.',
  }),
  price: z.coerce.number().positive('Price must be a positive number.'),
  stock_strips: z.coerce.number().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).optional(),
  tablets_per_strip: z.coerce.number().int().min(1).optional(),
  // Description fields
  description_patientType: z.enum(['Human', 'Animal']).optional(),
  description_illness: z.string().optional(),
  description_minAge: z.coerce.number().min(0, "Age cannot be negative.").optional(),
  description_maxAge: z.coerce.number().min(0, "Age cannot be negative.").optional(),
  description_gender: z.enum(['Male', 'Female', 'Both']).optional(),
}).superRefine((data, ctx) => {
    if (data.category === 'Tablet' || data.category === 'Capsule') {
        if (data.stock_strips === undefined || data.stock_strips < 0) {
            ctx.addIssue({ code: 'custom', message: 'Number of strips is required.', path: ['stock_strips'] });
        }
        if (data.tablets_per_strip === undefined || data.tablets_per_strip < 1) {
            ctx.addIssue({ code: 'custom', message: 'Tablets per strip is required and must be at least 1.', path: ['tablets_per_strip'] });
        }
    } else {
         if (data.stock_quantity === undefined || data.stock_quantity < 0) {
            ctx.addIssue({ code: 'custom', message: 'Quantity is required.', path: ['stock_quantity'] });
        }
    }
    if (data.category === 'Other' && (!data.customCategory || data.customCategory.trim().length < 2)) {
        ctx.addIssue({ code: 'custom', message: 'Please specify a category name (at least 2 characters).', path: ['customCategory'] });
    }
    
    // Description fields validation
    const descriptionFields = [data.description_patientType, data.description_illness, data.description_minAge, data.description_maxAge, data.description_gender];
    const filledDescriptionFields = descriptionFields.filter(f => f !== undefined && f !== null && f !== '' && f !== 0).length;

    if (filledDescriptionFields > 0) {
        if (!data.description_patientType) {
            ctx.addIssue({ code: 'custom', message: 'Patient type is required if providing a description.', path: ['description_patientType']});
        }
        if (!data.description_illness?.trim()) {
            ctx.addIssue({ code: 'custom', message: 'Illness is required if providing a description.', path: ['description_illness']});
        }
        if (data.description_patientType === 'Human') {
            if (data.description_minAge === undefined || data.description_minAge <= 0) {
                ctx.addIssue({ code: 'custom', message: 'Min age is required and must be greater than 0.', path: ['description_minAge']});
            }
            if (data.description_maxAge === undefined || data.description_maxAge <= 0) {
                ctx.addIssue({ code: 'custom', message: 'Max age is required and must be greater than 0.', path: ['description_maxAge']});
            }
            if (!data.description_gender) {
                ctx.addIssue({ code: 'custom', message: 'Gender is required if providing a description for humans.', path: ['description_gender']});
            }
            if (data.description_minAge !== undefined && data.description_maxAge !== undefined && data.description_maxAge < data.description_minAge) {
                ctx.addIssue({ code: 'custom', message: 'Max age cannot be less than min age.', path: ['description_maxAge']});
            }
        }
    }
});

interface MedicineFormProps {
  medicineToEdit: Medicine | null;
  onSave: (medicine: Medicine) => void;
  onCancel: () => void;
  categories: string[];
}

type FormData = z.infer<typeof formSchema>;

export function MedicineForm({ medicineToEdit, onSave, onCancel, categories }: MedicineFormProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(!!medicineToEdit?.description);

  const isCustomCategory = medicineToEdit && !['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Injection', 'Other'].includes(medicineToEdit.category);
  
  const getFormattedExpiry = (expiry?: string) => {
    if (!expiry) return '';
    try {
        const date = new Date(expiry);
        // Returns date in 'YYYY-MM-DD' format, which is what the input[type="date"] expects
        return date.toISOString().split('T')[0];
    } catch(e) {
        return '';
    }
  };


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: medicineToEdit?.id,
      name: medicineToEdit?.name || '',
      category: isCustomCategory ? 'Other' : (medicineToEdit?.category || ''),
      customCategory: isCustomCategory ? medicineToEdit.category : '',
      location: medicineToEdit?.location || '',
      expiry: getFormattedExpiry(medicineToEdit?.expiry),
      price: medicineToEdit?.price || 0,
      stock_strips: (medicineToEdit?.category === 'Tablet' || medicineToEdit?.category === 'Capsule') ? (medicineToEdit as any).stock.tablets / ((medicineToEdit as any).tabletsPerStrip || 10) : undefined,
      stock_quantity: (medicineToEdit?.category !== 'Tablet' && medicineToEdit?.category !== 'Capsule') ? (medicineToEdit?.stock as any)?.quantity || undefined : undefined,
      tablets_per_strip: (medicineToEdit?.category === 'Tablet' || medicineToEdit?.category === 'Capsule') ? (medicineToEdit as any).tabletsPerStrip : 10,
      description_patientType: medicineToEdit?.description?.patientType,
      description_illness: medicineToEdit?.description?.illness || '',
      description_minAge: medicineToEdit?.description?.minAge === 0 ? undefined : medicineToEdit?.description?.minAge,
      description_maxAge: medicineToEdit?.description?.maxAge === 0 ? undefined : medicineToEdit?.description?.maxAge,
      description_gender: medicineToEdit?.description?.gender,
    },
  });

  const selectedCategory = form.watch('category');
  const patientType = form.watch('description_patientType');

  const handleSubmit = async () => {
    // Manually trigger validation for description fields if the collapsible is open
    if (isDescriptionOpen) {
      const allValues = form.getValues();
      const descriptionFields = [allValues.description_patientType, allValues.description_illness, allValues.description_minAge, allValues.description_maxAge, allValues.description_gender];
      const anyFieldFilled = descriptionFields.some(f => f !== undefined && f !== null && f !== '' && (typeof f !== 'number' || !isNaN(f) && f !== 0));

      if (anyFieldFilled) {
          let hasErrors = false;
          if (!allValues.description_patientType) {
              form.setError('description_patientType', { type: 'manual', message: 'Patient type is required.' });
              hasErrors = true;
          }
          if (!allValues.description_illness?.trim()) {
              form.setError('description_illness', { type: 'manual', message: 'Illness is required.' });
              hasErrors = true;
          }
          if (allValues.description_patientType === 'Human') {
              if (!allValues.description_minAge || allValues.description_minAge <= 0) {
                  form.setError('description_minAge', { type: 'manual', message: 'Min age must be > 0.' });
                  hasErrors = true;
              }
              if (!allValues.description_maxAge || allValues.description_maxAge <= 0) {
                  form.setError('description_maxAge', { type: 'manual', message: 'Max age must be > 0.' });
                  hasErrors = true;
              }
              if (allValues.description_minAge && allValues.description_maxAge && allValues.description_maxAge < allValues.description_minAge) {
                  form.setError('description_maxAge', { type: 'manual', message: 'Max age cannot be less than min age.' });
                  hasErrors = true;
              }
              if (!allValues.description_gender) {
                  form.setError('description_gender', { type: 'manual', message: 'Gender is required.' });
                  hasErrors = true;
              }
          }
          if (hasErrors) return;
      }
    }
     // Trigger validation for all other fields
    const isValid = await form.trigger();
    if(isValid) {
        onSubmit(form.getValues());
    }
  };

  const handleClearDescription = () => {
    form.setValue('description_patientType', undefined);
    form.setValue('description_illness', '');
    form.setValue('description_minAge', 0);
    form.setValue('description_maxAge', 0);
    form.setValue('description_gender', undefined);
    // Clear errors after resetting the fields
    form.clearErrors(['description_patientType', 'description_illness', 'description_minAge', 'description_maxAge', 'description_gender']);
  };

  function onSubmit(values: FormData) {
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
    if(values.description_patientType === 'Human' && formattedIllness && values.description_minAge && values.description_maxAge && values.description_gender && values.description_minAge > 0 && values.description_maxAge > 0) {
        hasFullDescription = true;
    } else if (values.description_patientType === 'Animal' && formattedIllness) {
        hasFullDescription = true;
    }

    const expiryDate = new Date(values.expiry);


    let medicineData: Medicine;
    
    const baseData: Omit<any, 'description'> & { description?: any } = {
        id: medicineToEdit?.id || new Date().toISOString() + Math.random(),
        name: formattedName,
        category: finalCategory,
        location: values.location,
        expiry: expiryDate.toISOString(),
        price: values.price,
    };
    
    if (hasFullDescription) {
        baseData.description = {
            patientType: values.description_patientType!,
            illness: formattedIllness!,
            minAge: values.description_patientType === 'Human' ? (values.description_minAge || 0) : 0,
            maxAge: values.description_patientType === 'Human' ? (values.description_maxAge || 0) : 0,
            gender: values.description_patientType === 'Human' ? values.description_gender : undefined,
        };
    } else {
        baseData.description = undefined;
    }


    if (finalCategory === 'Tablet' || finalCategory === 'Capsule') {
        const totalTablets = Math.round((values.stock_strips || 0) * (values.tablets_per_strip || 10));
        medicineData = {
            ...baseData,
            category: finalCategory,
            tabletsPerStrip: values.tablets_per_strip || 10,
            stock: { tablets: totalTablets }
        } as any;
    } else {
        medicineData = {
            ...baseData,
            category: finalCategory,
            stock: { quantity: values.stock_quantity || 0 }
        } as any;
    }
    
    onSave(medicineData);
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medicine Name</FormLabel>
              <FormControl>
                <Input placeholder={'e.g., Paracetamol 500mg'} {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="expiry"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{selectedCategory === 'Tablet' || selectedCategory === 'Capsule' ? 'Price (per strip)' : 'Price (per unit)'}</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder={'e.g., 30.50'} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        {(selectedCategory === 'Tablet' || selectedCategory === 'Capsule') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
            <FormField
              control={form.control}
              name="stock_strips"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Strips</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder={'e.g., 10.5'} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>
        )}

        {selectedCategory && selectedCategory !== 'Tablet' && selectedCategory !== 'Capsule' && (
          <div className="p-4 border rounded-md bg-muted/50">
            <FormField
              control={form.control}
              name="stock_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity (units)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={'e.g., 25'} {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
            <CollapsibleTrigger asChild>
                <Button type="button" variant="link" className="p-0 h-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Usage Description (for smart search)
                    <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/30">
                 <div className="flex justify-between items-center mb-4">
                    <FormLabel>Provide usage details for smart suggestions.</FormLabel>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearDescription}>
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
                                <Textarea placeholder="e.g., Fever, headache, skin problem" {...field} />
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
                                        <Input type="number" placeholder="e.g., 5" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} />
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
                                        <Input type="number" placeholder="e.g., 60" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}/>
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
  );
}
