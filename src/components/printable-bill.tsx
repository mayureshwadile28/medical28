
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
  
  return (
    <div 
        className={cn("font-sans text-sm w-full max-w-[80mm] mx-auto text-black bg-white p-2 border border-dashed border-black", className)}
    >
      <header className="text-center mb-2">
        <h1 className="text-xl m-0 font-bold">Vicky Medical & General Stores</h1>
        <p className="my-0.5 text-xs">Sangavi Road, Boradi, Ta. Shirpur, Dist. Dhule</p>
        <div className="text-[10px] leading-tight">
          <p className="m-0">Lic. No.: 20-DHL-212349, 21-DHL-212351</p>
          <p className="m-0">20-DHL-212350</p>
        </div>
      </header>
      
      <hr className="border-none border-t border-dashed border-black my-2" />

      <section className="mb-2 text-xs">
        <div className="flex justify-between">
            <span>Bill No:</span>
            <span className="font-bold">{sale.id}</span>
        </div>
        <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(sale.saleDate).toLocaleString()}</span>
        </div>
      </section>

       <hr className="border-none border-t border-dashed border-black my-2" />

      <section className="mb-2 text-xs">
         <p className="m-0 mb-0.5"><strong>To:</strong> {sale.customerName}</p>
         {sale.doctorName && <p className="m-0"><strong>Dr. Name:</strong> {sale.doctorName}</p>}
      </section>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-t border-dashed border-black">
            <th className="text-left p-1 pl-0">Item Name</th>
            <th className="text-left p-1">Company</th>
            <th className="text-right p-1">Qty</th>
            <th className="text-right p-1 pr-0">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${sale.id}-${item.medicineId}-${index}`} className="align-top">
              <td className="p-1 pl-0 font-semibold">{item.name}</td>
              <td className="p-1 text-left">{item.company || '-'}</td>
              <td className="text-right p-1">{item.quantity}</td>
              <td className="text-right p-1 pr-0">{formatToINR(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-none border-t border-dashed border-black my-2" />
      
      <div className="text-right text-xs">
        {sale.discountPercentage && sale.discountPercentage > 0 && (
          <>
            <div className="flex justify-between my-0.5">
              <span>Subtotal:</span>
              <span>{formatToINR(subtotal)}</span>
            </div>
            <div className="flex justify-between my-0.5">
              <span>Discount ({sale.discountPercentage}%):</span>
              <span>-{formatToINR(discountAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between my-0.5 text-sm font-bold border-t border-dashed border-black pt-1 mt-1">
          <span>Total:</span>
          <span>{formatToINR(sale.totalAmount)}</span>
        </div>
      </div>

      <hr className="border-none border-t border-dashed border-black my-2" />

      <footer className="text-center mt-2 text-[10px]">
        <p className='m-0'>Tip - Please consult a doctor before using the medicine.</p>
        <p className='m-0'>If overcharged by mistake, extra amount will be refunded.</p>
        <p className="font-bold mt-1">Thank you for your visit!</p>
      </footer>
    </div>
  );
}
