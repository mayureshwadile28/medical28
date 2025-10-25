
export type TabletStock = {
  tablets: number; // Total number of tablets/capsules
};

export type OtherStock = {
  quantity: number;
};

interface BaseMedicine {
  id: string;
  name: string;
  category: string;
  location: string;
  expiry: string; // ISO date string
}

export type TabletMedicine = BaseMedicine & {
  category: 'Tablet' | 'Capsule';
  price: number; // price per strip
  tabletsPerStrip: number; // number of tablets/capsules in one strip
  stock: TabletStock;
};

export type GenericMedicine = BaseMedicine & {
  category: string; // Allow any string for other categories
  price: number; // price per unit
  stock: OtherStock;
};

export type Medicine = TabletMedicine | GenericMedicine;

export interface SaleItem {
  medicineId: string;
  name: string;
  category: string;
  quantity: number | ''; // Allow empty string for controlled input, represents tablets for Tablet category
  pricePerUnit: number; // Price for the unit sold (e.g., price per tablet, price per bottle)
  total: number;
}

export type PaymentMode = 'Cash' | 'Online' | 'Card';

export interface SaleRecord {
  id: string;
  customerName: string;
  doctorName?: string;
  saleDate: string; // ISO date string
  items: {
    medicineId: string;
    name: string;
    category: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
  }[];
  totalAmount: number;
  paymentMode: PaymentMode;
}
