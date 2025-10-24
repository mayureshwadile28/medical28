
'use client';

import React, { useState } from 'react';
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
import { createRoot } from 'react-dom/client';
import { PrintableBill } from './printable-bill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n/use-translation';

interface HistoryTabProps {
  sales: SaleRecord[];
  setSales: (sales: SaleRecord[]) => void;
}

export default function HistoryTab({ sales, setSales }: HistoryTabProps) {
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const { t } = useTranslation();

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
          <CardTitle>{t('sales_history_title')}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} disabled={sales.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {t('export_csv_button')}
            </Button>
            <AlertDialog open={isClearHistoryOpen} onOpenChange={(open) => { setIsClearHistoryOpen(open); if (!open) setDeleteConfirmation(''); }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={sales.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('clear_history_button')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('clear_history_alert_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('clear_history_alert_description')}
                    <br />
                    <span dangerouslySetInnerHTML={{ __html: t('clear_history_confirm_prompt') }} />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                    <Label htmlFor="delete-confirm" className="sr-only">Confirm Deletion</Label>
                    <Input 
                        id="delete-confirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={t('delete_confirm_placeholder')}
                    />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel_button')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} disabled={deleteConfirmation !== 'delete'}>
                    {t('confirm_delete_all_button')}
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
                        {sale.doctorName && <span className="text-xs text-muted-foreground">{t('prescribed_by_doctor', { doctorName: sale.doctorName })}</span>}
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
                      {t('print_bill_button')}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('bill_item_header')}</TableHead>
                        <TableHead className="text-right">{t('bill_units_header')}</TableHead>
                        <TableHead className="text-right">{t('bill_price_unit_header')}</TableHead>
                        <TableHead className="text-right">{t('bill_total_header')}</TableHead>
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
              <h3 className="text-xl font-semibold">{t('no_sales_recorded_message')}</h3>
              <p className="text-muted-foreground">{t('completed_sales_appear_here')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
