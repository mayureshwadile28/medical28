
import React from 'react';
import { type SaleRecord } from '@/lib/types';
import { formatToINR } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface PrintableBillProps {
  sale: SaleRecord;
  className?: string;
}

export function PrintableBill({ sale, className }: PrintableBillProps) {
  const subtotal = sale.items.reduce((acc, item) => acc + item.total, 0);
  const discountAmount = (subtotal * (sale.discountPercentage || 0)) / 100;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}/${year}`;
  }
  
  return (
    <div 
        className={cn("font-sans text-sm w-full mx-auto text-black bg-white p-6 border border-black", className)}
        style={{ width: '25cm', minHeight: '12cm' }}
    >
      <header className="text-center mb-4 border-b-2 border-black pb-2">
        <h1 className="text-3xl m-0 font-bold">Vicky Medical & General Stores</h1>
        <p className="my-1">Sangavi Road, Boradi, Ta. Shirpur, Dist. Dhule</p>
        <div className="text-xs">
          <p className="m-0">Lic. No.: 20-DHL-212349, 21-DHL-212351, 20-DHL-212350</p>
        </div>
      </header>
      
      <section className="mb-4 flex justify-between text-xs">
        <div>
            <p className="m-0 mb-0.5"><strong>To:</strong> {sale.customerName}</p>
            {sale.doctorName && <p className="m-0"><strong>Dr. Name:</strong> {sale.doctorName}</p>}
        </div>
        <div className="text-right">
            <p className="m-0"><strong>Bill No:</strong> {sale.id}</p>
            <p className="m-0"><strong>Date:</strong> {new Date(sale.saleDate).toLocaleString()}</p>
        </div>
      </section>

      <table className="w-full border-collapse text-xs mb-4">
        <thead>
          <tr className="border-y-2 border-black bg-gray-100">
            <th className="text-left p-1">Item Name</th>
            <th className="text-left p-1">Company</th>
            <th className="text-left p-1">Batch#</th>
            <th className="text-center p-1">Mfg</th>
            <th className="text-center p-1">Exp</th>
            <th className="text-right p-1">Qty</th>
            <th className="text-right p-1">MRP</th>
            <th className="text-right p-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${sale.id}-${item.medicineId}-${index}`} className="align-top border-b border-gray-200">
              <td className="p-1 font-semibold">{item.name}</td>
              <td className="p-1">{item.company || '-'}</td>
              <td className="p-1 font-mono">{item.batchNumber}</td>
              <td className="p-1 text-center font-mono">{formatDate(item.mfgDate)}</td>
              <td className="p-1 text-center font-mono">{formatDate(item.expiryDate)}</td>
              <td className="text-right p-1">{item.quantity}</td>
              <td className="text-right p-1 font-mono">{formatToINR(item.pricePerUnit)}</td>
              <td className="text-right p-1 font-mono">{formatToINR(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="flex justify-end">
          <div className="w-1/3 text-xs">
             {sale.discountPercentage && sale.discountPercentage > 0 && (
              <>
                <div className="flex justify-between my-0.5">
                  <span>Subtotal:</span>
                  <span className='font-mono'>{formatToINR(subtotal)}</span>
                </div>
                <div className="flex justify-between my-0.5 text-red-600">
                  <span>Discount ({sale.discountPercentage}%):</span>
                  <span className='font-mono'>-{formatToINR(discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between my-1 text-sm font-bold border-t-2 border-black pt-1">
              <span>Total:</span>
              <span className='font-mono'>{formatToINR(sale.totalAmount)}</span>
            </div>
          </div>
      </div>


      <footer className="mt-8 pt-4 border-t border-dashed border-black">
        <div className="flex justify-between items-end">
            <div className="text-[10px] text-gray-600">
                <p className='m-0'>Tip - Please consult a doctor before using the medicine.</p>
                <p className='m-0'>If overcharged by mistake, extra amount will be refunded.</p>
                <p className="font-bold mt-2">Thank you for your visit!</p>
            </div>
            <div className="text-center">
                <div className="h-12"></div>
                <p className="border-t border-black pt-1 px-4">Signature</p>
            </div>
        </div>
      </footer>
    </div>
  );
}
