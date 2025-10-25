
'use client';

import React, from 'react';
import { type SaleRecord } from '@/lib/types';
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
import { Download, Trash2, Info, Printer, Search } from 'lucide-react';
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
import { ClientOnly } from './client-only';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatToINR } from '@/lib/currency';
import { createRoot } from 'react-dom/client';
import { PrintableBill } from './printable-bill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface HistoryTabProps {
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
}

export default function HistoryTab({ sales, setSales }: HistoryTabProps) {
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredSales = React.useMemo(() => {
    return sales
        .filter(sale => sale.id.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, searchTerm]);

  const handleExportCSV = () => {
    const headers = ['SaleID', 'CustomerName', 'DoctorName', 'SaleDate', 'PaymentMode', 'TotalAmount', 'MedicineName', 'Category', 'Quantity', 'PricePerUnit', 'ItemTotal'];
    const csvRows = [headers.join(',')];

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const row = [
          sale.id,
          `"${sale.customerName.replace(/"/g, '""')}"`,
          `"${(sale.doctorName || '').replace(/"/g, '""')}"`,
          sale.saleDate,
          sale.paymentMode,
          sale.totalAmount,
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

  const handlePrintBill = (sale: SaleRecord) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Bill</title>');
      // A basic stylesheet for the print view
      printWindow.document.write(`
        <style>
          body { font-family: 'PT Sans', sans-serif; margin: 0; padding: 20px; }
          @media print {
            @page { 
              size: auto;
              margin: 20mm; 
            }
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      `);
      printWindow.document.write('<link rel="preconnect" href="https://fonts.googleapis.com">');
      printWindow.document.write('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300..700&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet">');
      printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
      printWindow.document.close();
      
      const printRoot = printWindow.document.getElementById('print-root');
      if (printRoot) {
          const root = createRoot(printRoot);
          root.render(<PrintableBill sale={sale} />);
          setTimeout(() => { // Timeout to ensure content is rendered
              printWindow.print();
              printWindow.close();
          }, 500);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Sales History</CardTitle>
          <div className="flex gap-2">
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
        <div className="mb-4">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={'Search Bill...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
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
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between">
                      <ClientOnly fallback={<span className="w-24 h-4 bg-muted animate-pulse rounded-md" />}>
                        <span className="text-muted-foreground">{new Date(sale.saleDate).toLocaleDateString()}</span>
                      </ClientOnly>
                      <Badge variant="secondary">{sale.paymentMode}</Badge>
                      <span className="font-mono text-right text-foreground">{formatToINR(sale.totalAmount)}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" size="sm" onClick={() => handlePrintBill(sale)}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Bill
                    </Button>
                  </div>
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
              <Info className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">{searchTerm ? 'No sales found' : 'No Sales Recorded Yet'}</h3>
              <p className="text-muted-foreground">{searchTerm ? 'Try searching for a different bill number.' : 'Completed sales will appear here.'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
