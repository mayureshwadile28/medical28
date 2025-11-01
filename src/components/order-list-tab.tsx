'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Download, ClipboardList } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { PrintableOrderList } from './printable-order-list';

interface OrderItem {
    id: string;
    name: string;
    quantity: string;
}

// Helper function to capitalize the first letter of each word
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};


export default function OrderListTab() {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState('');
    const orderListRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (itemName.trim() && quantity.trim()) {
            const formattedName = capitalizeWords(itemName.trim());
            const formattedQuantity = capitalizeWords(quantity.trim());
            setItems([...items, { id: new Date().toISOString(), name: formattedName, quantity: formattedQuantity }]);
            setItemName('');
            setQuantity('');
        } else {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please enter both an item name and a quantity.',
            });
        }
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleDownloadImage = async () => {
        if (!orderListRef.current) {
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not find the order list content to download.',
            });
            return;
        }
        if (items.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Empty List',
                description: 'Please add items to the order list before downloading.',
            });
            return;
        }


        try {
            const dataUrl = await htmlToImage.toPng(orderListRef.current, {
                quality: 1,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                skipFonts: true,
            });

            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            link.download = `Vicky-Medical-Order-${date}.png`;
            link.href = dataUrl;
            link.click();
            toast({
                title: 'Download Started',
                description: 'Your order list is being downloaded as a PNG image.',
            });
        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not generate the order list image. Please try again.',
            });
        }
    };

    return (
        <>
            <div className="fixed -left-[9999px] top-0">
                <div ref={orderListRef} className="bg-white p-4">
                    <PrintableOrderList items={items} />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList />
                        Create Supplier Order
                    </CardTitle>
                    <CardDescription>
                        Add items and quantities you want to order. Then, download the list as an image to send to your supplier.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddItem} className="mb-6 flex flex-col sm:flex-row items-end gap-2">
                        <div className="flex-1 w-full">
                            <Label htmlFor="item-name">Item Name</Label>
                            <Input
                                id="item-name"
                                placeholder="e.g., Paracetamol, Hair Oil, etc."
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                placeholder="e.g., 10 strips, 2 boxes, 5 bottles"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <Button type="submit">
                            <PlusCircle className="mr-2" /> Add
                        </Button>
                    </form>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Order Items ({items.length})</h3>
                        {items.length > 0 ? (
                            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
                                <ul className="divide-y">
                                    {items.map((item, index) => (
                                        <li key={item.id} className="flex items-center justify-between p-3 gap-4">
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                                                <div>
                                                    <p className="font-semibold">{item.name}</p>
                                                    <p className="text-sm text-muted-foreground">Quantity: <span className="font-medium text-foreground">{item.quantity}</span></p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center">
                                <p className="text-muted-foreground">Your order list is empty.</p>
                                <p className="text-sm text-muted-foreground">Use the form above to add items.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleDownloadImage} disabled={items.length === 0} className="w-full sm:w-auto">
                        <Download className="mr-2" /> Download Order as Image
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
}
