'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Medicine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MedicineFormProps {
  medicineToEdit?: Medicine | null;
  onSave: (medicine: Medicine) => void;
  onCancel: () => void;
}

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  location: z.string().min(1, 'Location is required.'),
  expiry: z.string().refine((val) => new Date(val) > new Date(), {
    message: 'Expiry date must be in the future.',
  }),
  price: z.coerce.number().positive('Price must be a positive number.'),
  stock_strips: z.coerce.number().int().min(0).optional(),
  stock_tabletsPerStrip: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).optional(),
}).superRefine((data, ctx) => {
    if (data.category === 'Tablet') {
        if (data.stock_strips === undefined || data.stock_strips < 0) {
            ctx.addIssue({ code: 'custom', message: 'Number of strips is required.', path: ['stock_strips'] });
        }
        if (data.stock_tabletsPerStrip === undefined || data.stock_tabletsPerStrip <= 0) {
            ctx.addIssue({ code: 'custom', message: 'Tablets per strip is required.', path: ['stock_tabletsPerStrip'] });
        }
    } else {
         if (data.stock_quantity === undefined || data.stock_quantity < 0) {
            ctx.addIssue({ code: 'custom', message: 'Quantity is required.', path: ['stock_quantity'] });
        }
    }
});

type FormData = z.infer<typeof formSchema>;

const categories = ['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Injection', 'Other'];

export function MedicineForm({ medicineToEdit, onSave, onCancel }: MedicineFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: medicineToEdit?.id,
      name: medicineToEdit?.name || '',
      category: medicineToEdit?.category || '',
      location: medicineToEdit?.location || '',
      expiry: medicineToEdit ? new Date(medicineToEdit.expiry).toISOString().split('T')[0] : '',
      price: medicineToEdit?.price || 0,
      stock_strips: medicineToEdit?.category === 'Tablet' ? medicineToEdit.stock.strips : 0,
      stock_tabletsPerStrip: medicineToEdit?.category === 'Tablet' ? medicineToEdit.stock.tabletsPerStrip : 0,
      stock_quantity: medicineToEdit?.category !== 'Tablet' ? medicineToEdit?.stock.quantity : 0,
    },
  });

  const selectedCategory = form.watch('category');

  function onSubmit(values: FormData) {
    const medicineData: Medicine = {
        id: medicineToEdit?.id || new Date().toISOString() + Math.random(),
        name: values.name,
        category: values.category as any,
        location: values.location,
        expiry: new Date(values.expiry).toISOString(),
        price: values.price,
        stock: selectedCategory === 'Tablet'
            ? { strips: values.stock_strips!, tabletsPerStrip: values.stock_tabletsPerStrip! }
            : { quantity: values.stock_quantity! }
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
                <Input placeholder="e.g., Paracetamol 500mg" {...field} />
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
                        <SelectValue placeholder="Select a category" />
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
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Rack A1" {...field} />
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
                <FormLabel>Price (per {selectedCategory === 'Tablet' ? 'strip' : 'unit'})</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 30.50" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        {selectedCategory === 'Tablet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
            <FormField
              control={form.control}
              name="stock_strips"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Strips</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock_tabletsPerStrip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tablets per Strip</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {selectedCategory && selectedCategory !== 'Tablet' && (
          <div className="p-4 border rounded-md bg-muted/50">
            <FormField
              control={form.control}
              name="stock_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity (units)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 25" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

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
