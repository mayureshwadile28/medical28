'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Download, ClipboardList, Info, History, PackagePlus, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { PrintableOrderList } from './printable-order-list';
import { type Medicine, type OrderItem, type WholesalerOrder, isTablet, isGeneric } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppService } from '@/lib/service';

interface OrderListTabProps {
    medicines: Medicine[];
    setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
    orders: WholesalerOrder[];
    setOrders: React.Dispatch<React.SetStateAction<WholesalerOrder[]>>;
    service: AppService;
    onProcessOrderItem: (data: { orderId: string, item: any }) => void;
    onStartOrderMerge: (order: WholesalerOrder) => void;
}

const getDisplayQuantity = (item: OrderItem) => {
    if (item.unitsPerPack && item.unitName) {
        return `${item.quantity} (${item.unitsPerPack} ${item.unitName}/pack)`;
    }
    return item.quantity;
};

function OrderHistoryDialog({ orders, onMerge, onClearHistory }: { orders: WholesalerOrder[], onMerge: (order: WholesalerOrder) => void, onClearHistory: () => void }) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
    
    const handleClear = () => {
        onClearHistory();
        setIsClearHistoryOpen(false);
        setDeleteConfirmation('');
        // Let main component handle closing the main dialog if needed.
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={orders.length === 0}>
                    <History className="mr-2 h-4 w-4" />
                    Order History
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle>Saved Wholesaler Orders</DialogTitle>
                            <DialogDescription>Review your past orders here.</DialogDescription>
                        </div>
                        <AlertDialog open={isClearHistoryOpen} onOpenChange={(open) => { setIsClearHistoryOpen(open); if (!open) setDeleteConfirmation(''); }}>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm" disabled={orders.length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear History
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all wholesaler order history. This action cannot be undone.
                                    <br />
                                    To confirm, please type <strong>delete</strong> in the box below.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                    <Label htmlFor="delete-confirm-order" className="sr-only">Type "delete" to confirm</Label>
                                    <Input 
                                        id="delete-confirm-order"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder={'Type "delete" to confirm'}
                                    />
                                </div>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClear} disabled={deleteConfirmation.toLowerCase() !== 'delete'}>
                                    Yes, delete all
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </DialogHeader>
                {orders.length > 0 ? (
                    <div className="max-h-[70vh] overflow-y-auto pr-4">
                        <Accordion type="single" collapsible className="w-full">
                            {orders.map(order => (
                                <AccordionItem value={order.id} key={order.id}>
                                    <AccordionTrigger>
                                        <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between pr-4 gap-2">
                                            <div className="flex flex-col text-left flex-1">
                                                <span className="font-semibold">{order.wholesalerName}</span>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                     <span className="text-xs text-muted-foreground">{new Date(order.orderDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between">
                                                {order.status === 'Completed' && order.receivedDate ? (
                                                     <Badge variant="default" className="text-xs">
                                                        Received: {new Date(order.receivedDate).toLocaleDateString()}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant={order.status === 'Pending' ? 'secondary' : 'destructive'}>{order.status}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="divide-y divide-border rounded-md border mb-4">
                                            {order.items.map((item, index) => (
                                                <li key={item.id} className="flex items-center justify-between p-3 gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                                                        <div>
                                                            <p className="font-semibold">{item.name} <span className="text-xs text-muted-foreground">({item.category})</span></p>
                                                            <p className="text-sm text-muted-foreground">Quantity: <span className="font-medium text-foreground">{getDisplayQuantity(item)}</span></p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {order.status === 'Pending' && (
                                            <div className="flex justify-end">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button>
                                                            <PackagePlus className="mr-2 h-4 w-4" /> Merge & Receive Order
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Receive Order?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will update your inventory based on this order. Stock for existing items will be increased, and you'll be prompted to add details for new items. This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => { onMerge(order); setIsDialogOpen(false); }}>
                                                                Yes, Receive & Merge
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                        <Info className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Saved Orders</h3>
                        <p className="text-muted-foreground">Your saved wholesaler orders will appear here.</p>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function OrderListTab({ medicines, setMedicines, orders, setOrders, service, onProcessOrderItem, onStartOrderMerge }: OrderListTabProps) {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [itemName, setItemName] = useState('');
    const [itemCategory, setItemCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [quantity, setQuantity] = useState('');
    const [wholesalerName, setWholesalerName] = useState('');
    
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const orderListRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const itemNameInputRef = useRef<HTMLInputElement>(null);
    
    const [pendingItem, setPendingItem] = useState<Omit<OrderItem, 'id'> | null>(null);
    const [clarificationPrompt, setClarificationPrompt] = useState<{ title: string; label: string } | null>(null);
    const [unitsPerPackInput, setUnitsPerPackInput] = useState('');
    const [orderForPrint, setOrderForPrint] = useState<WholesalerOrder | null>(null);
    const [processingOrder, setProcessingOrder] = useState<WholesalerOrder | null>(null);

    const categories = useMemo(() => {
        const baseCategories = ['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Injection', 'Other'];
        const medicineCategories = medicines
            .map(m => m.category)
            .filter((c): c is string => typeof c === 'string' && c.trim() !== '');
        return Array.from(new Set([...baseCategories, ...medicineCategories]))
            .filter(c => c)
            .sort((a, b) => a.localeCompare(b));
    }, [medicines]);

    const suggestedMedicines = useMemo(() => {
      if (!itemName) return [];
      const lowerCaseItemName = itemName.toLowerCase();
      return medicines
        .filter(med => med && med.name && med.name.toLowerCase().includes(lowerCaseItemName))
        .map(med => ({ name: med.name, category: med.category }));
    }, [medicines, itemName]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (itemNameInputRef.current && !itemNameInputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    const handleMergeOrder = async (order: WholesalerOrder) => {
        let currentItems = [...order.items];
        
        const lastProcessedName = sessionStorage.getItem(`lastProcessed_${order.id}`);
        if (lastProcessedName) {
            const lastIndex = currentItems.findIndex(i => i.name === lastProcessedName);
            if (lastIndex > -1) {
                currentItems.splice(0, lastIndex + 1);
            }
        }
        
        setProcessingOrder(order);

        for (const item of currentItems) {
            const existingMed = medicines.find(m => 
                m.name?.toLowerCase() === item.name.toLowerCase() && 
                m.category?.toLowerCase() === item.category.toLowerCase()
            );
            
            if (existingMed) {
                const qtyValue = parseInt(item.quantity.match(/\d+/)?.[0] || '0', 10);
                
                if (isTablet(existingMed)) {
                    // For tablets, quantity is in strips. Convert strips to tablets.
                    const stripsToAdd = item.unitsPerPack ? qtyValue * item.unitsPerPack : qtyValue;
                    const tabletsToAdd = stripsToAdd * existingMed.tabletsPerStrip;
                    existingMed.stock.tablets += tabletsToAdd;
                } else if(isGeneric(existingMed)) {
                    // For other items, quantity is in units.
                    const unitsToAdd = item.unitsPerPack ? qtyValue * item.unitsPerPack : qtyValue;
                    existingMed.stock.quantity += unitsToAdd;
                }

                await service.saveMedicine(existingMed);
                setMedicines(currentMeds => currentMeds.map(m => m.id === existingMed.id ? existingMed : m));
            } else {
                sessionStorage.setItem(`lastProcessed_${order.id}`, item.name);
                onProcessOrderItem({ orderId: order.id, item: item });
                return;
            }
        }
        
        const completedOrder = { ...order, status: 'Completed' as const, receivedDate: new Date().toISOString() };
        await service.saveWholesalerOrder(completedOrder);
        setOrders(currentOrders => currentOrders.map(o => o.id === order.id ? completedOrder : o));

        toast({ title: "Order Merged", description: `Order from ${order.wholesalerName} has been merged into inventory.` });
        setProcessingOrder(null);
        sessionStorage.removeItem(`lastProcessed_${order.id}`);
    };
    
    useEffect(() => {
        const startMergeHandler = (event: Event) => {
            handleMergeOrder((event as CustomEvent<WholesalerOrder>).detail);
        };
        const continueMergeHandler = (event: Event) => {
            handleMergeOrder((event as CustomEvent<WholesalerOrder>).detail);
        };

        window.addEventListener('start-merge', startMergeHandler);
        window.addEventListener('continue-merge', continueMergeHandler);

        return () => {
            window.removeEventListener('start-merge', startMergeHandler);
            window.removeEventListener('continue-merge', continueMergeHandler);
        };
    }, [medicines, orders, service]);

    const finalizeAddItem = (item: Omit<OrderItem, 'id'>) => {
        setItems(prevItems => [...prevItems, { ...item, id: 'temp-' + new Date().toISOString() + Math.random() }]);
        setItemName('');
        setItemCategory('');
        setCustomCategory('');
        setQuantity('');
        setShowSuggestions(false);
        setPendingItem(null);
        setUnitsPerPackInput('');
        setClarificationPrompt(null);
        itemNameInputRef.current?.focus();
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (highlightedIndex > -1 && showSuggestions) {
            handleSuggestionClick(suggestedMedicines[highlightedIndex]);
            return;
        }

        const finalCategory = itemCategory === 'Other' ? customCategory : itemCategory;

        if (!itemName.trim() || !finalCategory.trim() || !quantity.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill out item name, category, and quantity.',
            });
            return;
        }

        const formattedName = capitalizeWords(itemName.trim());
        const formattedQuantity = quantity.trim().toLowerCase();

        const newItem: Omit<OrderItem, 'id'> = {
            name: formattedName,
            category: finalCategory,
            quantity: quantity.trim(),
        };

        const isTabletOrCapsule = finalCategory === 'Tablet' || finalCategory === 'Capsule';

        if (isTabletOrCapsule && (formattedQuantity.includes('box') || formattedQuantity.includes('jar'))) {
            setPendingItem(newItem);
            setClarificationPrompt({ title: 'Specify Strips per Box', label: 'How many strips are in 1 box/jar?' });
        } else if (formattedQuantity.includes('pack') || formattedQuantity.includes('box')) {
            const packType = formattedQuantity.includes('pack') ? 'pack' : 'box';
            setPendingItem(newItem);
            setClarificationPrompt({ title: `Specify Units per ${capitalizeWords(packType)}`, label: `How many units are in 1 ${packType}?` });
        } else {
            finalizeAddItem(newItem);
        }
    };
    
    const handleClarificationSubmit = () => {
        if (!pendingItem) return;
        const units = parseInt(unitsPerPackInput, 10);
        if (isNaN(units) || units <= 0) {
             toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid positive number.' });
             return;
        }
        
        const isTabletOrCapsule = pendingItem.category === 'Tablet' || pendingItem.category === 'Capsule';
        const unitName = isTabletOrCapsule ? 'strips' : 'units';

        const itemWithDetails: Omit<OrderItem, 'id'> = {
            ...pendingItem,
            unitsPerPack: units,
            unitName: unitName,
        };

        finalizeAddItem(itemWithDetails);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSuggestionClick = (suggestion: {name: string, category: string}) => {
        setItemName(suggestion.name);
        setItemCategory(suggestion.category);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions && suggestedMedicines.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % suggestedMedicines.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + suggestedMedicines.length) % suggestedMedicines.length);
            } else if (e.key === 'Enter') {
                if (highlightedIndex > -1) {
                    e.preventDefault();
                    handleSuggestionClick(suggestedMedicines[highlightedIndex]);
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setHighlightedIndex(-1);
            }
        }
    };

    useEffect(() => {
        if (orderForPrint && orderListRef.current) {
            const downloadImage = async () => {
                try {
                    const dataUrl = await htmlToImage.toPng(orderListRef.current!, {
                        quality: 1,
                        backgroundColor: '#ffffff',
                        pixelRatio: 2,
                        skipFonts: true,
                    });
                    const link = document.createElement('a');
                    link.download = `${orderForPrint.wholesalerName.replace(/\s+/g, '-')}-Order-${new Date(orderForPrint.orderDate).toISOString().split('T')[0]}.png`;
                    link.href = dataUrl;
                    link.click();
                    toast({ title: 'Order Saved & Downloaded', description: `Order for ${orderForPrint.wholesalerName} has been saved.` });
                } catch (error) {
                    console.error("Failed to download image", error);
                    toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate the order image.' });
                } finally {
                    setOrderForPrint(null); // Reset after attempting download
                }
            };
            // A short delay to ensure the component has rendered fully before capturing
            setTimeout(downloadImage, 100);
        }
    }, [orderForPrint, toast]);

    const handleSaveOrder = async () => {
        if (items.length === 0) {
            toast({ variant: 'destructive', title: 'Empty Order', description: 'Please add items to the list before saving.' });
            return;
        }
        if (!wholesalerName.trim()) {
            toast({ variant: 'destructive', title: 'Missing Wholesaler Name', description: 'Please enter a wholesaler name.' });
            return;
        }

        const newOrder = await service.addWholesalerOrder({
            wholesalerName: wholesalerName.trim(),
            items: items,
        });

        setOrders(currentOrders => [newOrder, ...currentOrders]);
        
        setOrderForPrint(newOrder);

        setItems([]);
        setWholesalerName('');
    };

    const handleClearOrderHistory = async () => {
        await service.deleteAllWholesalerOrders();
        setOrders([]);
        toast({ title: 'Wholesaler Order History Cleared' });
    }

    return (
        <>
            <div className="fixed -left-[9999px] top-0">
                 {orderForPrint && (
                    <div ref={orderListRef} className="bg-white p-4">
                        <PrintableOrderList order={orderForPrint} />
                    </div>
                )}
            </div>
            {processingOrder && !sessionStorage.getItem(`lastProcessed_${processingOrder.id}`) && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
                    <div className="bg-background p-6 rounded-lg flex items-center gap-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <p>Processing order... Please wait.</p>
                    </div>
                </div>
            )}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList />
                        Create Wholesaler Order
                    </CardTitle>
                    <CardDescription>
                        Add items you need to order. The system will ask for more details if you order in packs or boxes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddItem} className="mb-6 grid grid-cols-1 md:grid-cols-4 items-end gap-2">
                        <div className="relative md:col-span-2 w-full space-y-2">
                            <Label htmlFor="item-name">Item Name</Label>
                            <div ref={itemNameInputRef}>
                                <Input
                                    id="item-name"
                                    placeholder="Type an item name..."
                                    value={itemName}
                                    onChange={(e) => {
                                        setItemName(e.target.value);
                                        if (e.target.value) setShowSuggestions(true); else setShowSuggestions(false);
                                        setHighlightedIndex(-1);
                                    }}
                                    onFocus={() => itemName && setShowSuggestions(true)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="off"
                                />
                            </div>
                            {showSuggestions && suggestedMedicines.length > 0 && (
                                <ul className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {suggestedMedicines.slice(0, 7).map((suggestion, index) => (
                                        <li
                                            key={`${suggestion.name}-${suggestion.category}`}
                                            className={cn("px-3 py-2 cursor-pointer hover:bg-accent", highlightedIndex === index && 'bg-accent')}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                        >
                                            {suggestion.name} <span className="text-xs text-muted-foreground">({suggestion.category})</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        
                         <div className="w-full space-y-2">
                            <Label htmlFor="item-category">Category</Label>
                            <Select value={itemCategory} onValueChange={setItemCategory}>
                                <SelectTrigger id="item-category">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat, index) => (
                                        <SelectItem key={`${cat}-${index}`} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         {itemCategory === 'Other' && (
                            <div className="w-full space-y-2">
                                <Label htmlFor="custom-category">Custom Category</Label>
                                <Input
                                    id="custom-category"
                                    placeholder="e.g., Food Supplement"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="w-full space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                placeholder="e.g., 10 strips, 2 boxes"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full md:w-auto">
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
                                                    <p className="font-semibold">{item.name} <span className="text-xs text-muted-foreground">({item.category})</span></p>
                                                    <p className="text-sm text-muted-foreground">Quantity: <span className="font-medium text-foreground">{getDisplayQuantity(item)}</span></p>
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
                                <Info className="h-10 w-10 text-muted-foreground" />
                                <p className="text-muted-foreground mt-4">Your order list is empty.</p>
                                <p className="text-sm text-muted-foreground">Use the form above to add items.</p>
                            </div>
                        )}
                        {items.length > 0 && (
                            <div className="w-full space-y-2 pt-4">
                                <Label htmlFor="wholesaler-name">Wholesaler Name</Label>
                                <Input
                                    id="wholesaler-name"
                                    placeholder="Enter the wholesaler's name"
                                    value={wholesalerName}
                                    onChange={(e) => setWholesalerName(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex-wrap gap-2">
                    <Button onClick={handleSaveOrder} disabled={items.length === 0 || !wholesalerName.trim()} className="w-full sm:w-auto">
                        <Download className="mr-2" /> Save & Download Order
                    </Button>
                    <OrderHistoryDialog orders={orders} onMerge={onStartOrderMerge} onClearHistory={handleClearOrderHistory} />
                </CardFooter>
            </Card>

            <AlertDialog open={!!pendingItem} onOpenChange={(isOpen) => !isOpen && setPendingItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{clarificationPrompt?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please specify the number of items for the ordered pack/box.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="units-per-pack">{clarificationPrompt?.label}</Label>
                        <Input 
                            id="units-per-pack"
                            type="number"
                            value={unitsPerPackInput}
                            onChange={(e) => setUnitsPerPackInput(e.target.value)}
                            placeholder='e.g., 10'
                            autoFocus
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setPendingItem(null); setUnitsPerPackInput(''); }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClarificationSubmit}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
