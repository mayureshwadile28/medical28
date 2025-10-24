
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Medicine } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useState, useEffect } from 'react';

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
}).superRefine((data, ctx) => {
    if (data.category === 'Tablet') {
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
});

type FormData = z.infer<typeof formSchema>;

export function MedicineForm({ medicineToEdit, onSave, onCancel, categories }: MedicineFormProps) {
  const { t } = useTranslation();

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
      stock_strips: medicineToEdit?.category === 'Tablet' ? (medicineToEdit as any).stock.tablets / ((medicineToEdit as any).tabletsPerStrip || 10) : 0,
      stock_quantity: medicineToEdit?.category !== 'Tablet' ? (medicineToEdit?.stock as any)?.quantity || 0 : 0,
      tablets_per_strip: medicineToEdit?.category === 'Tablet' ? (medicineToEdit as any).tabletsPerStrip : 10,
    },
  });

  const selectedCategory = form.watch('category');

  function onSubmit(values: FormData) {
    const finalCategory = values.category === 'Other' ? values.customCategory! : values.category;
    
    const formattedName = values.name.trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('-')
        .replace(/--+/g, '-');

    const medicineData: Medicine = {
        id: medicineToEdit?.id || new Date().toISOString() + Math.random(),
        name: formattedName,
        category: finalCategory as any,
        location: values.location,
        expiry: new Date(values.expiry).toISOString(),
        price: values.price,
        ...(finalCategory === 'Tablet'
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
              <FormLabel>{t('medicine_name_label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('medicine_name_placeholder')} {...field} />
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
                <FormLabel>{t('category_label')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={t('category_label')} />
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
                    <FormLabel>{t('location_label')}</FormLabel>
                    <FormControl>
                        <Input placeholder={t('location_placeholder')} {...field} />
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
                <FormLabel>{t('expiry_date_label')}</FormLabel>
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
                <FormLabel>{t('price_label', { unit: selectedCategory === 'Tablet' ? t('price_unit_strip') : t('price_unit_unit') })}</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder={t('price_placeholder')} {...field} />
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
                  <FormLabel>{t('number_of_strips_label')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t('strips_placeholder')} {...field} value={field.value || ''} />
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
                  <FormLabel>{t('tablets_per_strip_label')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t('tablets_per_strip_placeholder')} {...field} value={field.value || ''}/>
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
                  <FormLabel>{t('quantity_units_label')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t('quantity_placeholder')} {...field} value={field.value || ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel_button')}
          </Button>
          <Button type="submit">{t('save_medicine_button')}</Button>
        </div>
      </form>
    </Form>
  );
}
