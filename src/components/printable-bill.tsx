
import React from 'react';
import { type SaleRecord } from '@/lib/types';
import { formatToINR } from '@/lib/currency';

interface PrintableBillProps {
  sale: SaleRecord;
}

export function PrintableBill({ sale }: PrintableBillProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: '12px', width: '100%', maxWidth: '80mm', margin: '0 auto', color: '#000' }}>
      <header style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', margin: '0', fontWeight: 'bold' }}>Vicky Medical</h1>
        <p style={{ margin: '4px 0' }}>Your Trusted Pharmacy</p>
        <p style={{ margin: '4px 0' }}>123 Health St, Wellness City</p>
        <p style={{ margin: '4px 0' }}>GSTIN: ABCDE12345FGHIJ</p>
      </header>
      
      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }} />

      <section style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Bill No:</span>
            <span style={{fontWeight: 'bold'}}>{sale.id}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date:</span>
            <span>{new Date(sale.saleDate).toLocaleString()}</span>
        </div>
      </section>

       <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }} />

      <section style={{ marginBottom: '16px' }}>
         <p style={{ margin: '0 0 4px 0' }}><strong>To:</strong> {sale.customerName}</p>
         {sale.doctorName && <p style={{ margin: '0' }}><strong>Prescribed by:</strong> Dr. {sale.doctorName}</p>}
      </section>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
            <th style={{ textAlign: 'center', padding: '4px 2px' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>Rate</th>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${sale.id}-${item.medicineId}-${index}`}>
              <td style={{ padding: '4px 0' }}>{item.name}</td>
              <td style={{ textAlign: 'center', padding: '4px 2px' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '4px 2px' }}>{formatToINR(item.pricePerUnit)}</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatToINR(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '10px 0' }} />
      
      <div style={{ textAlign: 'right' }}>
        <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Total: {formatToINR(sale.totalAmount)}
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }} />

      <footer style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px' }}>
        <p>Thank you for your visit!</p>
        <p>Get well soon.</p>
      </footer>
    </div>
  );
}

    