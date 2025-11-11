
'use client';

import React from 'react';
import { type SaleRecord, type PaymentMode } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Trash2, Info, Printer, Search, Calendar as CalendarIcon, X, ArrowDownUp, Receipt } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { ClientOnly } from './client-only';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { formatToINR } from '@/lib/currency';
import { PrintableBill } from './printable-bill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import ReactDOMServer from 'react-dom/server';
import { AppService } from '@/lib/service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


interface HistoryTabProps {
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
  service: AppService;
}

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'amount_desc' | 'amount_asc';

function PendingPaymentsDialog({ allSales, setSales, service }: { allSales: SaleRecord[], setSales: (sales: SaleRecord[]) => void, service: AppService }) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [settlingSale, setSettlingSale] = React.useState<SaleRecord | null>(null);
    const [settlePaymentMode, setSettlePaymentMode] = React.useState<PaymentMode>('Cash');
    const { toast } = useToast();

    const pendingSales = allSales.filter(s => s.paymentMode === 'Pending');

    const handleSettlePayment = async () => {
        if (!settlingSale) return;

        const updatedSale: SaleRecord = {
            ...settlingSale,
            paymentMode: settlePaymentMode,
            paymentSettledDate: new Date().toISOString(),
        };

        const savedSale = await service.saveSale(updatedSale);
        if (savedSale) {
            const allSales = await service.getSales();
            setSales(allSales);

            toast({
                title: "Payment Settled",
                description: `Bill ${settlingSale.id} for ${settlingSale.customerName} has been marked as paid.`,
            });
        }

        setSettlingSale(null);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={pendingSales.length === 0}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Pending Payments
                    {pendingSales.length > 0 && <Badge variant="destructive" className="ml-2">{pendingSales.length}</Badge>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Pending Payments ({pendingSales.length})</DialogTitle>
                    <DialogDescription>
                        View and settle all pending payments here.
                    </DialogDescription>
                </DialogHeader>
                {pendingSales.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto pr-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Bill ID</TableHead>
                                    <TableHead>Sale Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingSales.map(sale => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-semibold">{sale.customerName}</TableCell>
                                        <TableCell>{sale.id}</TableCell>
                                        <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right font-mono">{formatToINR(sale.totalAmount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => setSettlingSale(sale)}>
                                                Settle
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                        <Info className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">All Clear!</h3>
                        <p className="text-muted-foreground">There are no pending payments.</p>
                    </div>
                )}
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                </DialogFooter>

                {settlingSale && (
                     <AlertDialog open={!!settlingSale} onOpenChange={() => setSettlingSale(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Settle Payment for {settlingSale.customerName}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Select the mode of payment for the total amount of {formatToINR(settlingSale.totalAmount)}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <RadioGroup
                                    value={settlePaymentMode}
                                    onValueChange={(value: PaymentMode) => setSettlePaymentMode(value)}
                                    className="flex space-x-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Cash" id="settle-cash" />
                                        <Label htmlFor="settle-cash">Cash</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Online" id="settle-online" />
                                        <Label htmlFor="settle-online">Online</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Card" id="settle-card" />
                                        <Label htmlFor="settle-card">Card</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSettlePayment}>Confirm and Settle</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </DialogContent>
        </Dialog>
    );
}

function PrintBillDialog({ sale }: { sale: SaleRecord }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
        // Render React component to HTML string
        const billHtml = ReactDOMServer.renderToStaticMarkup(<PrintableBill sale={sale} />);
        
        // Get tailwind styles
        const styles = Array.from(document.styleSheets)
            .map(s => {
                try {
                    return Array.from(s.cssRules).map(r => r.cssText).join('\n');
                } catch (e) {
                    // Ignore cross-origin stylesheets
                    return '';
                }
            })
            .filter(Boolean)
            .join('\n');

        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>Print Bill</title>
                    <style>${styles}</style>
                    <style>
                        @media print {
                           body {
                                margin: 0;
                                padding: 0;
                           }
                           @page {
                                size: landscape;
                                margin: 1cm;
                           }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-preview-bill">${billHtml}</div>
                </body>
            </html>
        `);
        doc.close();
        
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Clean up the iframe after a short delay
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="mr-2 h-4 w-4" />
          Print Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Print Preview: Bill {sale.id}</DialogTitle>
          <DialogDescription>
            This is a preview of the bill for {sale.customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 max-h-[70vh] overflow-y-auto rounded-lg border p-4">
           <div className="print-preview-bill">
             <PrintableBill sale={sale} />
           </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DownloadBillButton({ sale }: { sale: SaleRecord }) {
    const { toast } = useToast();

    const handleDownload = async () => {
        const billElement = document.createElement('div');
        billElement.style.position = 'fixed';
        billElement.style.left = '-9999px';
        billElement.style.top = '0';
        billElement.style.backgroundColor = 'white';
        billElement.style.padding = '1rem';
        // Force a width to ensure layout consistency
        billElement.style.width = '1000px'; 
        
        document.body.appendChild(billElement);
        // We need to use ReactDOM.render to handle hooks if any, but since it's just for display, this is fine
        billElement.innerHTML = ReactDOMServer.renderToStaticMarkup(<PrintableBill sale={sale} />);

        try {
            const canvas = await html2canvas(billElement, {
                scale: 2,
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            
            // Now use jsPDF to create a landscape PDF
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
            pdf.save(`${sale.customerName.replace(/ /g, '_')}-${saleDate}.pdf`);

            toast({
                title: 'Download Started',
                description: 'Your bill is being downloaded as a PDF file.',
            });
        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not generate the bill PDF. Please try again.',
            });
        } finally {
            document.body.removeChild(billElement);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
        </Button>
    );
}


export default function HistoryTab({ sales, setSales, service }: HistoryTabProps) {
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(startOfDay(new Date()));
  const [sortOption, setSortOption] = React.useState<SortOption>('date_desc');

  const uniqueSales = React.useMemo(() => {
    // This list contains ALL sales, including pending, to be used by child components like PendingPaymentsDialog
    return sales.filter((sale, index, self) =>
        index === self.findIndex((s) => s.id === sale.id)
    );
  }, [sales]);

  const filteredSales = React.useMemo(() => {
    let sortedSales = [...uniqueSales].filter(s => s.paymentMode !== 'Pending');

    sortedSales.sort((a, b) => {
        const subtotalA = a.items.reduce((sum, item) => sum + item.total, 0);
        const subtotalB = b.items.reduce((sum, item) => sum + item.total, 0);
        switch (sortOption) {
            case 'date_asc':
                return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
            case 'name_asc':
                return a.customerName.localeCompare(b.customerName);
            case 'name_desc':
                return b.customerName.localeCompare(a.customerName);
            case 'amount_asc':
                return subtotalA - subtotalB;
            case 'amount_desc':
                return subtotalB - subtotalA;
            case 'date_desc':
            default:
                return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
        }
    });

    return sortedSales
        .filter(sale => {
          const searchTermMatch = sale.id.toLowerCase().includes(searchTerm.toLowerCase()) || sale.customerName.toLowerCase().includes(searchTerm.toLowerCase());
          if (!selectedDate) {
              return searchTermMatch;
          }
          const saleDate = new Date(sale.saleDate);
          return searchTermMatch && saleDate.toDateString() === selectedDate.toDateString();
        });
  }, [uniqueSales, searchTerm, selectedDate, sortOption]);

  const dailySummary = React.useMemo(() => {
    if (!selectedDate || filteredSales.length === 0) return null;
    
    // Use the already filtered sales for the summary to respect search terms
    const summarySales = filteredSales;
    
    if(summarySales.length === 0) return null;

    const totalEntries = summarySales.length;
    const totalAmount = summarySales.reduce((acc, sale) => acc + sale.totalAmount, 0);

    return { totalEntries, totalAmount };
  }, [filteredSales, selectedDate]);


  const handleExportCSV = () => {
    const headers = ['SaleID', 'CustomerName', 'DoctorName', 'SaleDate', 'PaymentMode', 'DiscountPercentage', 'TotalAmount', 'PaymentSettledDate', 'MedicineName', 'Category', 'BatchNumber', 'PurchasePricePerUnit', 'SalePricePerUnit', 'Quantity', 'ItemTotal', 'ItemProfit'];
    const csvRows = [headers.join(',')];

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const profit = (item.pricePerUnit - (item.purchasePricePerUnit || 0)) * item.quantity;
        const row = [
          sale.id,
          `"${sale.customerName.replace(/"/g, '""')}"`,
          `"${(sale.doctorName || '').replace(/"/g, '""')}"`,
          sale.saleDate,
          sale.paymentMode,
          sale.discountPercentage || 0,
          sale.totalAmount,
          sale.paymentSettledDate || '',
          `"${item.name.replace(/"/g, '""')}"`,
          item.category,
          item.batchNumber,
          item.purchasePricePerUnit || 0,
          item.pricePerUnit,
          item.quantity,
          item.total,
          profit
        ].join(',');
        csvRows.push(row);
      });
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vicky-medical-sales_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearHistory = async () => {
    await service.deleteAllSales();
    setSales([]);
    setIsClearHistoryOpen(false);
    setDeleteConfirmation('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Sales History</CardTitle>
          <div className="flex flex-wrap gap-2">
            <PendingPaymentsDialog allSales={uniqueSales} setSales={setSales} service={service} />
            <Button onClick={handleExportCSV} disabled={uniqueSales.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <AlertDialog open={isClearHistoryOpen} onOpenChange={(open) => { setIsClearHistoryOpen(open); if (!open) setDeleteConfirmation(''); }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={uniqueSales.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all sales history.
                    <br />
                    To confirm, please type <strong>delete</strong> in the box below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                    <Label htmlFor="delete-confirm" className="sr-only">Type "delete" to confirm</Label>
                    <Input 
                        id="delete-confirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={'Type "delete" to confirm'}
                    />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} disabled={deleteConfirmation.toLowerCase() !== 'delete'}>
                    Yes, delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={'Search by Bill ID or Customer...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start sm:w-auto">
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <DropdownMenuRadioItem value="date_desc">Date (Newest first)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date_asc">Date (Oldest first)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">Name (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">Name (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="amount_desc">Amount (High-Low)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="amount_asc">Amount (Low-High)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date...</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                />
                </PopoverContent>
            </Popover>
            {selectedDate && (
                <Button variant="ghost" onClick={() => setSelectedDate(startOfDay(new Date()))}>
                    <X className="mr-2 h-4 w-4" /> Clear
                </Button>
            )}
        </div>
        {filteredSales.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredSales.map(sale => {
              const subtotal = sale.items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
              return (
              <AccordionItem value={sale.id} key={sale.id}>
                <AccordionTrigger>
                  <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between pr-4 gap-2">
                    <div className="flex flex-col text-left flex-1">
                        <span className="font-semibold">{sale.customerName}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Bill: {sale.id}</span>
                          {sale.doctorName && <span className="text-xs text-muted-foreground">Dr. {sale.doctorName}</span>}
                          {sale.paymentSettledDate && (
                            <ClientOnly>
                                <Badge variant="outline" className="text-primary border-primary/50">
                                    Paid: {new Date(sale.paymentSettledDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                </Badge>
                            </ClientOnly>
                          )}
                           {sale.discountPercentage && sale.discountPercentage > 0 && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                {sale.discountPercentage}% off
                            </Badge>
                          )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between">
                      <ClientOnly fallback={<span className="w-24 h-4 bg-muted animate-pulse rounded-md" />}>
                        <span className="text-muted-foreground">{new Date(sale.saleDate).toLocaleDateString(undefined, { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </ClientOnly>
                      <Badge variant={sale.paymentMode === 'Pending' ? 'destructive' : 'secondary'}>{sale.paymentMode}</Badge>
                      <span className="font-mono text-right text-foreground">{formatToINR(sale.totalAmount)}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="hidden sm:table-cell">Batch #</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                            <TableHead className="text-right">Price/Unit</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sale.items.map((item, index) => (
                            <TableRow key={`${sale.id}-${item.medicineId}-${index}`}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-xs">{item.batchNumber}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right font-mono">{formatToINR(item.pricePerUnit)}</TableCell>
                              <TableCell className="text-right font-mono">{formatToINR(item.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                     <div className="flex justify-end gap-2">
                        <DownloadBillButton sale={sale} />
                        <PrintBillDialog sale={sale} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
              <Info className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">{searchTerm || selectedDate ? 'No sales found' : 'No Sales Recorded Yet'}</h3>
              <p className="text-muted-foreground">{searchTerm || selectedDate ? 'Try a different search or date.' : 'Completed sales will appear here.'}</p>
          </div>
        )}
      </CardContent>
      {dailySummary && selectedDate && (
        <CardFooter className="flex-col items-start gap-2 border-t pt-4">
            <h3 className="font-semibold text-lg">
                Summary for {format(selectedDate, "PPP")}
            </h3>
            <div className="flex justify-between w-full text-muted-foreground">
                <span>Total Entries:</span>
                <span className="font-mono text-foreground">{dailySummary.totalEntries}</span>
            </div>
            <div className="flex justify-between w-full text-muted-foreground">
                <span>Total Amount:</span>
                <span className="font-mono text-foreground">{formatToINR(dailySummary.totalAmount)}</span>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
