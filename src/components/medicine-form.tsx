
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
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MedicineFormProps {
  medicineToEdit?: Medicine | null;
  onSave: (medicine: Medicine) => void;
  onCancel: () => void;
  categories: string[];
}

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  customCategory: z.string().optional(),
  location: z.string().min(1, 'Location is required.'),
  expiry: z.string().refine((val) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(val) >= today;
  }, {
    message: 'Expiry date must be today or in the future.',
  }),
  price: z.coerce.number().positive('Price must be a positive number.'),
  stock_strips: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).optional(),
  tablets_per_strip: z.coerce.number().int().min(1).optional(),
  // Description fields
  description_illness: z.string().optional(),
  description_minAge: z.coerce.number().min(0).optional(),
  description_maxAge: z.coerce.number().min(0).optional(),
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
    if (data.description_minAge !== undefined && data.description_maxAge !== undefined && data.description_maxAge < data.description_minAge) {
        ctx.addIssue({ code: 'custom', message: 'Max age cannot be less than min age.', path: ['description_maxAge']});
    }
});

type FormData = z.infer<typeof formSchema>;

export function MedicineForm({ medicineToEdit, onSave, onCancel, categories }: MedicineFormProps) {

  const isCustomCategory = medicineToEdit && !['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Injection', 'Other'].includes(medicineToEdit.category);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: medicineToEdit?.id,
      name: medicineToEdit?.name || '',
      category: isCustomCategory ? 'Other' : (medicineToEdit?.category || ''),
      customCategory: isCustomCategory ? medicineToEdit.category : '',
      location: medicineToEdit?.location || '',
      expiry: medicineToEdit ? new Date(medicineToEdit.expiry).toISOString().split('T')[0] : '',
      price: medicineToEdit?.price || 0,
      stock_strips: (medicineToEdit?.category === 'Tablet' || medicineToEdit?.category === 'Capsule') ? (medicineToEdit as any).stock.tablets / ((medicineToEdit as any).tabletsPerStrip || 10) : 0,
      stock_quantity: (medicineToEdit?.category !== 'Tablet' && medicineToEdit?.category !== 'Capsule') ? (medicineToEdit?.stock as any)?.quantity || 0 : 0,
      tablets_per_strip: (medicineToEdit?.category === 'Tablet' || medicineToEdit?.category === 'Capsule') ? (medicineToEdit as any).tabletsPerStrip : 10,
      description_illness: medicineToEdit?.description?.illness || '',
      description_minAge: medicineToEdit?.description?.minAge || 0,
      description_maxAge: medicineToEdit?.description?.maxAge || 0,
      description_gender: medicineToEdit?.description?.gender || 'Both',
    },
  });

  const selectedCategory = form.watch('category');

  function onSubmit(values: FormData) {
    const finalCategory = values.category === 'Other' ? values.customCategory! : values.category;
    
    const formattedName = values.name.trim().toUpperCase().replace(/\s+/g, '-');


    const medicineData: Medicine = {
        id: medicineToEdit?.id || new Date().toISOString() + Math.random(),
        name: formattedName,
        category: finalCategory as any,
        location: values.location,
        expiry: new Date(values.expiry).toISOString(),
        price: values.price,
        ...((values.description_illness && values.description_minAge !== undefined && values.description_maxAge !== undefined && values.description_gender) && {
            description: {
                illness: values.description_illness,
                minAge: values.description_minAge,
                maxAge: values.description_maxAge,
                gender: values.description_gender,
            }
        }),
        ...(finalCategory === 'Tablet' || finalCategory === 'Capsule'
            ? { tabletsPerStrip: values.tablets_per_strip || 10, stock: { tablets: (values.stock_strips || 0) * (values.tablets_per_strip || 10) } }
            : { stock: { quantity: values.stock_quantity || 0 } })
    } as Medicine;
    
    onSave(medicineData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input type="number" step="0.01" placeholder={'e.g., 30.50'} {...field} />
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
                    <Input type="number" placeholder={'e.g., 10'} {...field} value={field.value || ''} />
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
                    <Input type="number" placeholder={'e.g., 10'} {...field} value={field.value || ''}/>
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
                    <Input type="number" placeholder={'e.g., 25'} {...field} value={field.value || ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button variant="link" className="p-0 h-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Usage Description (for smart search)
                    <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/30">
                 <FormField
                    control={form.control}
                    name="description_illness"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Illness / Symptom</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Fever, headache, body pain" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="description_minAge"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Min Age</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 5" {...field} value={field.value || ''} />
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
                                    <Input type="number" placeholder="e.g., 60" {...field} value={field.value || ''}/>
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
                            defaultValue={field.value}
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
