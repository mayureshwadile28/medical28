
'use client';

import React from 'react';
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
import { Download, Trash2, Info, Printer } from 'lucide-react';
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
import ReactDOM from 'react-dom';
import { PrintableBill } from './printable-bill';

interface HistoryTabProps {
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
}

export default function HistoryTab({ sales, setSales }: HistoryTabProps) {
  const handleExportCSV = () => {
    const headers = ['SaleID', 'CustomerName', 'DoctorName', 'SaleDate', 'TotalAmount', 'MedicineName', 'Quantity', 'PricePerUnit', 'ItemTotal'];
    const csvRows = [headers.join(',')];

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const row = [
          sale.id,
          `"${sale.customerName.replace(/"/g, '""')}"`,
          `"${(sale.doctorName || '').replace(/"/g, '""')}"`,
          sale.saleDate,
          sale.totalAmount,
          `"${item.name.replace(/"/g, '""')}"`,
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
      
      const printRoot = printWindow.document.getElementById('print-root');
      if (printRoot) {
          ReactDOM.render(<PrintableBill sale={sale} />, printRoot, () => {
            setTimeout(() => { // Timeout to ensure content is rendered
                printWindow.print();
                printWindow.close();
            }, 500);
        });
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
            <AlertDialog>
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
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>
                    Yes, delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sales.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {sales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).map(sale => (
              <AccordionItem value={sale.id} key={sale.id}>
                <AccordionTrigger>
                  <div className="flex w-full items-center justify-between pr-4">
                    <div className="flex flex-col text-left">
                        <span className="font-semibold">{sale.customerName}</span>
                        {sale.doctorName && <span className="text-xs text-muted-foreground">Prescribed by Dr. {sale.doctorName}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <ClientOnly fallback={<span className="w-24 h-4 bg-muted animate-pulse rounded-md" />}>
                        <span>{new Date(sale.saleDate).toLocaleDateString()}</span>
                      </ClientOnly>
                      <span className="font-mono text-right">{formatToINR(sale.totalAmount)}</span>
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
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price/Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sale.items.map((item, index) => (
                        <TableRow key={`${sale.id}-${item.medicineId}-${index}`}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatToINR(item.pricePerUnit)}</TableCell>
                          <TableCell className="text-right">{formatToINR(item.total)}</TableCell>
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
              <h3 className="text-xl font-semibold">No Sales Recorded Yet</h3>
              <p className="text-muted-foreground">Completed sales will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
