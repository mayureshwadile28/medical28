
import React from 'react';
import { type SaleRecord } from '@/lib/types';
import { formatToINR } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface PrintableBillProps {
  sale: SaleRecord;
  className?: string;
}

export function PrintableBill({ sale, className }: PrintableBillProps) {
  return (
    <div 
        className={cn("font-sans text-xs w-full max-w-[80mm] mx-auto text-black", className)}
    >
      <header className="text-center mb-4">
        <h1 className="text-xl m-0 font-bold">Vicky Medical</h1>
        <p className="my-1">Your Trusted Pharmacy</p>
        <p className="my-1">Shivaji nagar , sangvi road , Boradi</p>
        <p className="my-1">GSTIN: ABCDE12345FGHIJ</p>
      </header>
      
      <hr className="border-none border-t border-dashed border-black my-2.5" />

      <section className="mb-4">
        <div className="flex justify-between">
            <span>Bill No:</span>
            <span className="font-bold">{sale.id}</span>
        </div>
        <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(sale.saleDate).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
            <span>Payment Mode:</span>
            <span>{sale.paymentMode}</span>
        </div>
      </section>

       <hr className="border-none border-t border-dashed border-black my-2.5" />

      <section className="mb-4">
         <p className="m-0 mb-1"><strong>To:</strong> {sale.customerName}</p>
         {sale.doctorName && <p className="m-0"><strong>Prescribed by:</strong> Dr. {sale.doctorName}</p>}
      </section>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-solid border-black">
            <th className="text-left p-1 pl-0">Item</th>
            <th className="text-center p-0.5">Qty</th>
            <th className="text-right p-0.5">Rate</th>
            <th className="text-right p-1 pr-0">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${sale.id}-${item.medicineId}-${index}`}>
              <td className="p-1 pl-0">{item.name}</td>
              <td className="text-center p-0.5">{item.quantity}</td>
              <td className="text-right p-0.5">{formatToINR(item.pricePerUnit)}</td>
              <td className="text-right p-1 pr-0">{formatToINR(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-none border-t border-solid border-black my-2.5" />
      
      <div className="text-right">
        <p className="my-1 text-sm font-bold">
          Total: {formatToINR(sale.totalAmount)}
        </p>
      </div>

      <hr className="border-none border-t border-dashed border-black my-2.5" />

      <footer className="text-center mt-4 text-[10px]">
        <p>Thank you for your visit!</p>
        <p>Get well soon.</p>
      </footer>
    </div>
  );
}
