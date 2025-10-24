export type TabletStock = {
  strips: number;
};

export type OtherStock = {
  quantity: number;
};

interface BaseMedicine {
  id: string;
  name: string;
  location: string;
  expiry: string; // ISO date string
}

export type TabletMedicine = BaseMedicine & {
  category: 'Tablet';
  price: number; // price per strip
  stock: TabletStock;
};

export type GenericMedicine = BaseMedicine & {
  category: 'Syrup' | 'Ointment' | 'Capsule' | 'Injection' | 'Other';
  price: number; // price per unit
  stock: OtherStock;
};

export type Medicine = TabletMedicine | GenericMedicine;

export interface SaleItem {
  medicineId: string;
  name: string;
  quantity: number | ''; // Allow empty string for controlled input
  pricePerUnit: number; // Price for the unit sold (e.g., price per strip, price per bottle)
  total: number;
}

export interface SaleRecord {
  id: string;
  customerName: string;
  saleDate: string; // ISO date string
  items: {
    medicineId: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
  }[];
  totalAmount: number;
}
