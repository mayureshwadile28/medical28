
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { type SupplierOrder } from '@/lib/types';

interface PrintableOrderListProps {
  order: SupplierOrder;
  className?: string;
}

const getDisplayQuantity = (item: SupplierOrder['items'][0]) => {
    if (item.unitsPerPack && item.unitName) {
        return `${item.quantity} (${item.unitsPerPack} ${item.unitName}/pack)`;
    }
    return item.quantity;
};

export function PrintableOrderList({ order, className }: PrintableOrderListProps) {
  return (
    <div 
        className={cn("font-sans w-full max-w-[210mm] min-h-[297mm] mx-auto text-black bg-white p-8", className)}
    >
      <header className="mb-8 border-b-2 border-black pb-4">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-4xl m-0 font-bold tracking-wider">Vicky Medical</h1>
                <p className="my-1 text-lg">Order Request</p>
            </div>
            <div className="text-right">
                <p className="font-semibold">Order ID: {order.id}</p>
                <p>Date: {new Date(order.orderDate).toLocaleDateString()}</p>
            </div>
        </div>
        <div className="mt-4">
            <p className="text-lg"><strong>Supplier:</strong> {order.supplierName}</p>
        </div>
      </header>
      
      <main>
        <table className="w-full border-collapse text-lg">
            <thead>
                <tr className="border-b-2 border-black">
                    <th className="text-left p-2 w-16">Sr. No.</th>
                    <th className="text-left p-2">Item Name</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2 w-48">Required Quantity</th>
                </tr>
            </thead>
            <tbody>
                {order.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-300">
                        <td className="p-3 font-medium text-center">{index + 1}.</td>
                        <td className="p-3 font-semibold">{item.name}</td>
                        <td className="p-3">{item.category}</td>
                        <td className="p-3 font-medium">{getDisplayQuantity(item)}</td>
                    </tr>
                ))}
                 {order.items.length < 20 && Array.from({ length: 20 - order.items.length }).map((_, i) => (
                     <tr key={`empty-${i}`} className="border-b border-gray-200 h-12">
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                     </tr>
                 ))}
            </tbody>
        </table>
      </main>

      <footer className="text-center mt-12 pt-4 border-t border-dashed border-black text-sm text-gray-600">
        <p>Please supply the above-mentioned items.</p>
        <p>Thank you!</p>
      </footer>
    </div>
  );
}

    