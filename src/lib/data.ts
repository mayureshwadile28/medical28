import { type Medicine, type SaleRecord } from './types';

export const initialMedicines: Medicine[] = [
  {
    id: 'med1',
    name: 'Paracetamol 500mg',
    category: 'Tablet',
    location: 'Rack A1',
    expiry: new Date(new Date().setDate(new Date().getDate() + 300)).toISOString(),
    price: 30.0,
    stock: { strips: 50, tabletsPerStrip: 15 },
  },
  {
    id: 'med2',
    name: 'Cough Syrup DX',
    category: 'Syrup',
    location: 'Rack B2',
    expiry: new Date(new Date().setDate(new Date().getDate() + 150)).toISOString(),
    price: 120.5,
    stock: { quantity: 25 },
  },
  {
    id: 'med3',
    name: 'Antiseptic Ointment',
    category: 'Ointment',
    location: 'Rack C3',
    expiry: new Date(new Date().setDate(new Date().getDate() + 25)).toISOString(),
    price: 45.0,
    stock: { quantity: 8 },
  },
    {
    id: 'med4',
    name: 'Amoxicillin 250mg',
    category: 'Capsule',
    location: 'Rack A2',
    expiry: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    price: 85.0,
    stock: { quantity: 15 },
  },
];

export const initialSales: SaleRecord[] = [
  {
    id: 'sale1',
    customerName: 'John Doe',
    saleDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    items: [
      { medicineId: 'med1', name: 'Paracetamol 500mg', quantity: 2, pricePerUnit: 30.0, total: 60.0 },
      { medicineId: 'med2', name: 'Cough Syrup DX', quantity: 1, pricePerUnit: 120.5, total: 120.5 },
    ],
    totalAmount: 180.5,
  },
];
