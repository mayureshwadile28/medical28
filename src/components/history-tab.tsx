
'use client';

import React from 'react';
import { type SaleRecord, type PaymentMode } from '@/lib/types';
import * as htmlToImage from 'html-to-image';
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
import { format } from 'date-fns';
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

interface HistoryTabProps {
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'amount_desc' | 'amount_asc';

function PendingPaymentsDialog({ sales, setSales }: HistoryTabProps) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [settlingSale, setSettlingSale] = React.useState<SaleRecord | null>(null);
    const [settlePaymentMode, setSettlePaymentMode] = React.useState<PaymentMode>('Cash');
    const { toast } = useToast();

    const pendingSales = sales.filter(s => s.paymentMode === 'Pending');

    const handleSettlePayment = () => {
        if (!settlingSale) return;

        setSales(sales.map(sale => {
            if (sale.id === settlingSale.id) {
                return {
                    ...sale,
                    paymentMode: settlePaymentMode,
                    paymentSettledDate: new Date().toISOString(),
                };
            }
            return sale;
        }));

        toast({
            title: "Payment Settled",
            description: `Bill ${settlingSale.id} for ${settlingSale.customerName} has been marked as paid.`,
        });

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
  const printableContentRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printableContentRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) {
        alert('Could not open print window. Please disable your pop-up blocker.');
        return;
    }

    const printDocument = printWindow.document;
    printDocument.write('<html><head><title>Print Bill</title>');
    
    // This is a workaround to include Tailwind styles in the print window.
    // It's not perfect and might miss some styles, but works for most cases.
    const stylesheets = Array.from(document.styleSheets);
    stylesheets.forEach(styleSheet => {
        try {
            // Check for CORS restriction
            if (styleSheet.cssRules) {
                const rules = Array.from(styleSheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
                printDocument.write(`<style>${rules}</style>`);
            }
        } catch (e) {
            console.warn('Could not read stylesheet due to CORS. This is expected for external stylesheets like Google Fonts.', e);
        }
    });

    printDocument.write('</head><body class="print-preview-bill">');
    printDocument.write(content.innerHTML);
    printDocument.write('</body></html>');
    printDocument.close();
    
    // A timeout is needed to allow the content to render before printing
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 250);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Print Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl print:hidden">
        <DialogHeader>
          <DialogTitle>Print Preview: Bill {sale.id}</DialogTitle>
          <DialogDescription>
            This is a preview of the bill for {sale.customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="print-preview-bill my-4 max-h-[60vh] overflow-y-auto rounded-lg border p-4">
           <div ref={printableContentRef}>
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
  const billRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!billRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(billRef.current, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true, // This will skip embedding fonts and avoid CORS errors
      });

      const link = document.createElement('a');
      const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
      link.download = `${sale.customerName.replace(/ /g, '_')}-${saleDate}.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: 'Download Started',
        description: 'Your bill is being downloaded as a PNG image.',
      });
    } catch (error) {
      console.error('oops, something went wrong!', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not generate the bill image. Please try again.',
      });
    }
  };

  return (
    <>
      <div className="fixed -left-[9999px] top-0">
        <div ref={billRef} className="bg-white p-4">
          <PrintableBill sale={sale} />
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload} className="print:hidden">
        <Download className="mr-2 h-4 w-4" />
        Download
      </Button>
    </>
  );
}


export default function HistoryTab({ sales, setSales }: HistoryTabProps) {
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [sortOption, setSortOption] = React.useState<SortOption>('date_desc');

  const filteredSales = React.useMemo(() => {
    let sortedSales = [...sales].filter(s => s.paymentMode !== 'Pending');

    sortedSales.sort((a, b) => {
        switch (sortOption) {
            case 'date_asc':
                return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
            case 'name_asc':
                return a.customerName.localeCompare(b.customerName);
            case 'name_desc':
                return b.customerName.localeCompare(a.customerName);
            case 'amount_asc':
                return a.totalAmount - b.totalAmount;
            case 'amount_desc':
                return b.totalAmount - a.totalAmount;
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
  }, [sales, searchTerm, selectedDate, sortOption]);

  const dailySummary = React.useMemo(() => {
    if (!selectedDate) return null;
    
    // Filter sales for the selected date, ignoring the search term for the summary
    const summarySales = sales.filter(sale => new Date(sale.saleDate).toDateString() === selectedDate.toDateString() && sale.paymentMode !== 'Pending');
    
    if(summarySales.length === 0) return null;

    const totalEntries = summarySales.length;
    const totalAmount = summarySales.reduce((acc, sale) => acc + sale.totalAmount, 0);

    return { totalEntries, totalAmount };
  }, [sales, selectedDate]);


  const handleExportCSV = () => {
    const headers = ['SaleID', 'CustomerName', 'DoctorName', 'SaleDate', 'PaymentMode', 'TotalAmount', 'PaymentSettledDate', 'MedicineName', 'Category', 'Quantity', 'PricePerUnit', 'ItemTotal'];
    const csvRows = [headers.join(',')];

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const row = [
          sale.id,
          `"${sale.customerName.replace(/"/g, '""')}"`,
          `"${(sale.doctorName || '').replace(/"/g, '""')}"`,
          sale.saleDate,
          sale.paymentMode,
          sale.totalAmount,
          sale.paymentSettledDate || '',
          `"${item.name.replace(/"/g, '""')}"`,
          item.category,
          item.quantity,
          item.pricePerUnit,
          item.total,
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

  const handleClearHistory = () => {
    setSales([]);
    setIsClearHistoryOpen(false);
    setDeleteConfirmation('');
  };

  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Sales History</CardTitle>
          <div className="flex flex-wrap gap-2">
            <PendingPaymentsDialog sales={sales} setSales={setSales} />
            <Button onClick={handleExportCSV} disabled={sales.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <AlertDialog open={isClearHistoryOpen} onOpenChange={(open) => { setIsClearHistoryOpen(open); if (!open) setDeleteConfirmation(''); }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={sales.length === 0}>
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
                <Button variant="ghost" onClick={() => setSelectedDate(undefined)}>
                    <X className="mr-2 h-4 w-4" /> Clear
                </Button>
            )}
        </div>
        {filteredSales.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredSales.map(sale => (
              <AccordionItem value={sale.id} key={sale.id}>
                <AccordionTrigger>
                  <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between pr-4 gap-2">
                    <div className="flex flex-col text-left flex-1">
                        <span className="font-semibold">{sale.customerName}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Bill: {sale.id}</span>
                          {sale.doctorName && <span className="text-xs text-muted-foreground">Prescribed by Dr. {sale.doctorName}</span>}
                          {sale.paymentSettledDate && (
                            <ClientOnly>
                                <Badge variant="outline" className="text-primary border-primary/50">
                                    Paid: {new Date(sale.paymentSettledDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                </Badge>
                            </ClientOnly>
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
                    <div className="flex justify-end gap-2">
                      <DownloadBillButton sale={sale} />
                      <PrintBillDialog sale={sale} />
                    </div>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                            <TableHead className="text-right">Price/Unit</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sale.items.map((item, index) => (
                            <TableRow key={`${sale.id}-${item.medicineId}-${index}`}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.category}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right font-mono">{formatToINR(item.pricePerUnit)}</TableCell>
                              <TableCell className="text-right font-mono">{formatToINR(item.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
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

    