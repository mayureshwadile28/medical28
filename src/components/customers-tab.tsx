
'use client';
import { useMemo, useState } from 'react';
import { type SaleRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Users, Info, ArrowDownUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatToINR } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type CustomerSummary = {
    name: string;
    totalSpent: number;
    pendingAmount: number;
    lastPurchase: string;
    purchaseHistory: SaleRecord[];
};

type SortOption = 'name_asc' | 'spent_desc' | 'pending_desc' | 'last_purchase_desc';

export default function CustomersTab({ sales }: { sales: SaleRecord[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('last_purchase_desc');

    const customerData = useMemo(() => {
        const customerMap: { [name: string]: CustomerSummary } = {};

        sales.forEach(sale => {
            const name = sale.customerName;
            if (!customerMap[name]) {
                customerMap[name] = {
                    name,
                    totalSpent: 0,
                    pendingAmount: 0,
                    lastPurchase: '1970-01-01T00:00:00.000Z',
                    purchaseHistory: [],
                };
            }

            customerMap[name].purchaseHistory.push(sale);
            
            if (sale.paymentMode !== 'Pending') {
                customerMap[name].totalSpent += sale.totalAmount;
            } else {
                customerMap[name].pendingAmount += sale.totalAmount;
            }

            if (new Date(sale.saleDate) > new Date(customerMap[name].lastPurchase)) {
                customerMap[name].lastPurchase = sale.saleDate;
            }
        });
        
        return Object.values(customerMap);

    }, [sales]);
    
    const filteredCustomers = useMemo(() => {
        let sorted = [...customerData];
        
        sorted.sort((a, b) => {
            switch(sortOption) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'spent_desc': return b.totalSpent - a.totalSpent;
                case 'pending_desc': return b.pendingAmount - a.pendingAmount;
                case 'last_purchase_desc': return new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime();
            }
        });
        
        if (!searchTerm) return sorted;
        
        return sorted.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    }, [customerData, searchTerm, sortOption]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Users />
                        Customer Directory ({customerData.length})
                    </CardTitle>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customer..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><ArrowDownUp className="mr-2" /> Sort</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuRadioGroup value={sortOption} onValueChange={v => setSortOption(v as SortOption)}>
                                    <DropdownMenuRadioItem value="last_purchase_desc">Recent</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="spent_desc">Highest Spending</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="pending_desc">Highest Pending</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name_asc">Name (A-Z)</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredCustomers.length > 0 ? (
                    <Accordion type="single" collapsible>
                        {filteredCustomers.map(customer => (
                            <AccordionItem value={customer.name} key={customer.name}>
                                <AccordionTrigger>
                                    <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between pr-4 gap-2">
                                        <span className="font-semibold text-lg">{customer.name}</span>
                                        <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between">
                                            {customer.pendingAmount > 0 && (
                                                <Badge variant="destructive">Pending: {formatToINR(customer.pendingAmount)}</Badge>
                                            )}
                                            <span className="text-muted-foreground hidden md:inline">
                                                Last seen: {new Date(customer.lastPurchase).toLocaleDateString()}
                                            </span>
                                            <span className="font-mono text-base">{formatToINR(customer.totalSpent)}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <h4 className="font-semibold mb-2">Purchase History</h4>
                                    <div className="rounded-lg border max-h-80 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Bill ID</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                    <TableHead className="text-right">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {customer.purchaseHistory.sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).map(sale => (
                                                    <TableRow key={sale.id}>
                                                        <TableCell className="font-mono">{sale.id}</TableCell>
                                                        <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatToINR(sale.totalAmount)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={sale.paymentMode === 'Pending' ? 'destructive' : 'secondary'}>
                                                                {sale.paymentMode}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                        <Info className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Customers Found</h3>
                        <p className="text-muted-foreground">
                            {searchTerm ? 'Try a different search term.' : 'Customer data will appear here after your first sale.'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
