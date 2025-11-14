
'use client';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { type Medicine, type SaleRecord, isTablet } from '@/lib/types';
import { formatToINR } from '@/lib/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndianRupee, Pill, Package, Activity, ShoppingBag, CalendarCheck2 } from 'lucide-react';
import { subDays, format, startOfDay } from 'date-fns';

type Period = '7' | '30' | '90';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function DashboardTab({ sales, medicines }: { sales: SaleRecord[], medicines: Medicine[] }) {
    const [period, setPeriod] = useState<Period>('30');
    const periodDays = parseInt(period, 10);
    const now = new Date();
    const todayStart = startOfDay(now);
    const startDate = subDays(todayStart, periodDays -1);

    const periodSales = useMemo(() => {
        return sales.filter(s => s.saleDate.toDate() >= startDate && s.paymentMode !== 'Pending');
    }, [sales, startDate]);

    const todaySales = useMemo(() => {
        return sales.filter(s => s.saleDate.toDate() >= todayStart && s.paymentMode !== 'Pending');
    }, [sales, todayStart]);

    const stats = useMemo(() => {
        const totalRevenue = periodSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalSalesInPeriod = periodSales.length;
        const avgSaleValue = totalSalesInPeriod > 0 ? totalRevenue / totalSalesInPeriod : 0;
        const totalSalesToday = todaySales.length;
        return { totalRevenue, totalSalesInPeriod, avgSaleValue, totalSalesToday };
    }, [periodSales, todaySales]);

    const dailySalesChartData = useMemo(() => {
        const dailyData: { [key: string]: number } = {};
        for (let i = 0; i < periodDays; i++) {
            const date = subDays(now, i);
            const formattedDate = format(date, 'MMM d');
            dailyData[formattedDate] = 0;
        }

        periodSales.forEach(sale => {
            const formattedDate = format(sale.saleDate.toDate(), 'MMM d');
            if (dailyData.hasOwnProperty(formattedDate)) {
                dailyData[formattedDate] += sale.totalAmount;
            }
        });

        return Object.entries(dailyData).map(([name, sales]) => ({ name, sales })).reverse();
    }, [periodSales, periodDays, now]);

    const paymentModeData = useMemo(() => {
        const modes: { [key: string]: number } = { 'Cash': 0, 'Online': 0, 'Card': 0 };
        periodSales.forEach(sale => {
            if (sale.paymentMode !== 'Pending' && modes.hasOwnProperty(sale.paymentMode)) {
                modes[sale.paymentMode]++;
            }
        });
        return Object.entries(modes).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
    }, [periodSales]);
    
    const topSellingData = useMemo(() => {
        const itemCounts: { [id: string]: { name: string; quantity: number; category: string, id: string } } = {};
        periodSales.forEach(sale => {
            sale.items.forEach(item => {
                if (itemCounts[item.medicineId]) {
                    itemCounts[item.medicineId].quantity += item.quantity;
                } else {
                    itemCounts[item.medicineId] = { name: item.name, quantity: item.quantity, category: item.category, id: item.medicineId };
                }
            });
        });

        return Object.values(itemCounts)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [periodSales]);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    if (sales.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-96">
                    <Activity className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">No Sales Data Available</h3>
                    <p className="text-muted-foreground">The dashboard will populate with analytics once you make your first sale.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="w-[180px]">
                    <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatToINR(stats.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">in the last {periodDays} days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.totalSalesInPeriod}</div>
                        <p className="text-xs text-muted-foreground">bills in the last {periodDays} days</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                        <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.totalSalesToday}</div>
                        <p className="text-xs text-muted-foreground">bills generated today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Sale Value</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatToINR(stats.avgSaleValue)}</div>
                        <p className="text-xs text-muted-foreground">per bill</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Daily Sales Overview</CardTitle>
                        <CardDescription>Revenue from sales over the last {periodDays} days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailySalesChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatToINR(value as number).replace('₹', '₹ ')}`} />
                                <Tooltip
                                    cursor={{fill: 'hsl(var(--muted))', radius: 'var(--radius)'}}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
                                                    <span className="font-bold text-muted-foreground">{payload[0].payload.name}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground">Sales</span>
                                                    <span className="font-bold">{formatToINR(payload[0].value as number)}</span>
                                                </div>
                                                </div>
                                            </div>
                                            )
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Selling Medicines</CardTitle>
                        <CardDescription>Top 5 most sold items by quantity.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {topSellingData.map(item => (
                                <li key={`${item.id}-${item.category}`} className="flex items-center">
                                    <div className="p-2 bg-muted rounded-md mr-4">
                                        {item.category === 'Tablet' || item.category === 'Capsule' ? <Pill className="h-5 w-5 text-primary"/> : <Package className="h-5 w-5 text-primary"/>}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium leading-none">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">{item.category}</p>
                                    </div>
                                    <div className="font-mono text-right">
                                        <p className="font-bold">{item.quantity}</p>
                                        <p className="text-xs">units sold</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Distribution of transactions by payment mode.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={paymentModeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {paymentModeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-1 gap-1 text-center">
                                            <span className="font-bold">{payload[0].name}</span>
                                            <span className="text-sm text-muted-foreground">{payload[0].value} transactions</span>
                                        </div>
                                    </div>
                                    )
                                }
                                return null;
                            }}/>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 flex-wrap mt-4">
                        {paymentModeData.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-sm text-muted-foreground">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
