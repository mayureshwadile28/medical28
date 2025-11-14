
'use client';
import { useState, useMemo } from 'react';
import { type SaleRecord, type Medicine, isTablet } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatToINR } from '@/lib/currency';
import { subDays, startOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react';

type ReportPeriod = '7' | '30' | '90' | 'all';

export default function ReportsTab({ sales, medicines }: { sales: SaleRecord[], medicines: Medicine[] }) {
    const [period, setPeriod] = useState<ReportPeriod>('30');

    const filteredSales = useMemo(() => {
        if (period === 'all') return sales.filter(s => s.paymentMode !== 'Pending');
        const periodDays = parseInt(period, 10);
        const startDate = subDays(startOfDay(new Date()), periodDays - 1);
        return sales.filter(s => s.saleDate.toDate() >= startDate && s.paymentMode !== 'Pending');
    }, [sales, period]);

    const profitData = useMemo(() => {
        const dailyData: { [key: string]: { revenue: number, cost: number, profit: number } } = {};

        filteredSales.forEach(sale => {
            const date = sale.saleDate.toDate().toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { revenue: 0, cost: 0, profit: 0 };
            }
            
            let saleCost = 0;
            let saleSubtotal = 0;

            sale.items.forEach(item => {
                const costPerUnit = item.purchasePricePerUnit || 0; // Use 0 if purchase price is missing
                saleCost += costPerUnit * item.quantity;
                saleSubtotal += item.pricePerUnit * item.quantity;
            });
            
            dailyData[date].revenue += saleSubtotal; // Revenue is based on pre-discount subtotal
            dailyData[date].cost += saleCost;
        });

        Object.keys(dailyData).forEach(date => {
            dailyData[date].profit = dailyData[date].revenue - dailyData[date].cost;
        });
        
        return Object.entries(dailyData)
            .map(([date, data]) => ({ 
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), 
                ...data 
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [filteredSales]);

    const summaryStats = useMemo(() => {
        const totalRevenue = profitData.reduce((acc, day) => acc + day.revenue, 0);
        const totalCost = profitData.reduce((acc, day) => acc + day.cost, 0);
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        
        return { totalRevenue, totalCost, totalProfit, profitMargin };
    }, [profitData]);

    const hasMissingPurchasePrice = useMemo(() => {
        if (filteredSales.length === 0) return false;
        // The warning should appear if any item within the filtered sales lacks a purchase price.
        return filteredSales.some(sale => 
            sale.items.some(item => item.purchasePricePerUnit === undefined || item.purchasePricePerUnit === 0)
        );
    }, [filteredSales]);


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
                <div className="w-full sm:w-[180px]">
                    <Select value={period} onValueChange={(value: ReportPeriod) => setPeriod(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {hasMissingPurchasePrice && (
                 <Card className="border-amber-500/50 bg-amber-500/5">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <div>
                            <CardTitle className="text-amber-700 dark:text-amber-400">Limited Profit Data</CardTitle>
                            <CardDescription className="text-amber-600 dark:text-amber-500">
                                Profit calculations may be inaccurate because purchase prices have not been recorded for all sold items in this period. Please update your inventory batches with purchase prices for accurate reporting.
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatToINR(summaryStats.totalRevenue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost of Goods</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatToINR(summaryStats.totalCost)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatToINR(summaryStats.totalProfit)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.profitMargin.toFixed(2)}%</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Profit & Loss Overview</CardTitle>
                    <CardDescription>Daily revenue, cost of goods, and gross profit.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profitData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatToINR(value as number)}`} />
                            <Tooltip
                                 contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))'
                                 }}
                                 formatter={(value, name) => [formatToINR(value as number), (name as string).charAt(0).toUpperCase() + (name as string).slice(1)]}
                             />
                            <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Revenue" />
                            <Bar dataKey="cost" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Cost" />
                            <Bar dataKey="profit" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Profit" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    );
}
