export type Stock = {
  tablets?: number; // Total number of tablets/capsules
  quantity?: number; // for generic items
};

export interface Batch {
    id: string;
    batchNumber: string;
    stock: Stock;
    mfg?: string; // Manufacturing date
    expiry: string; // ISO date string for the last day of the month
    price: number; // MRP for this batch (per strip or per unit)
    purchasePrice?: number; // Purchase price for this batch (per strip or per unit)
}

export interface MedicineDescription {
  patientType: 'Human' | 'Animal';
  minAge?: number;
  maxAge?: number;
  gender?: 'Male' | 'Female' | 'Both';
  illness: string;
}


interface BaseMedicine {
  id: string;
  name: string;
  company?: string;
  category: string;
  location: string;
  description?: MedicineDescription;
  batches: Batch[];
}

export type TabletMedicine = BaseMedicine & {
  category: 'Tablet' | 'Capsule';
  tabletsPerStrip: number; 
};

export type GenericMedicine = BaseMedicine & {
  category: string; // Allow any string for other categories
};

export type Medicine = TabletMedicine | GenericMedicine;

// Type guards
export function isTablet(medicine?: Medicine | Partial<Medicine> | null): medicine is TabletMedicine {
  if (!medicine) return false;
  return medicine.category === 'Tablet' || medicine.category === 'Capsule';
}

export function isGeneric(medicine?: Medicine | Partial<Medicine> | null): medicine is GenericMedicine {
  if (!medicine) return false;
  return !isTablet(medicine);
}

export const getTotalStock = (medicine: Medicine): number => {
    if (!medicine.batches) return 0;
    return medicine.batches.reduce((total, batch) => {
        if (isTablet(medicine)) {
            return total + (batch.stock.tablets || 0);
        }
        return total + (batch.stock.quantity || 0);
    }, 0);
}

export const getSoonestExpiry = (medicine: Medicine): string | null => {
    if (!medicine.batches || medicine.batches.length === 0) return null;
    
    const validBatches = medicine.batches.filter(b => getTotalStockInBatch(b) > 0);
    if (validBatches.length === 0) return null;

    return validBatches.reduce((soonest, current) => {
        return new Date(current.expiry) < new Date(soonest.expiry) ? current : soonest;
    }).expiry;
}

export const getTotalStockInBatch = (batch: Batch): number => {
    return batch.stock.tablets || batch.stock.quantity || 0;
}


export interface SaleItem {
  medicineId: string;
  name: string;
  company?: string;
  category: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate: string;
  quantity: number | ''; // Allow empty string for controlled input, represents tablets for Tablet category
  pricePerUnit: number; // Price for the unit sold (e.g., price per tablet, price per bottle)
  purchasePricePerUnit?: number; // Purchase price for the unit sold
  total: number;
}

export type PaymentMode = 'Cash' | 'Online' | 'Card' | 'Pending';

export interface SaleRecord {
  id: string;
  customerName: string;
  doctorName?: string;
  saleDate: string; // ISO date string
  items: {
    medicineId: string;
    name: string;
    company?: string;
    category: string;
    batchNumber: string;
    mfgDate?: string;
    expiryDate: string;
    quantity: number;
    pricePerUnit: number;
    purchasePricePerUnit?: number;
    total: number;
  }[];
  totalAmount: number;
  discountPercentage?: number;
  paymentMode: PaymentMode;
  paymentSettledDate?: string; // ISO date string, set when a 'Pending' payment is cleared
}

export type SaleBillItem = Omit<SaleItem, 'quantity'> & {
  quantity: number;
}

// Wholesaler Order Types
export interface OrderItem {
    id: string;
    name: string;
    category: string;
    quantity: string;
    batchNumber?: string;
    unitsPerPack?: number;
    unitName?: string;
    status: 'Pending' | 'Received';
}

export interface WholesalerOrder {
    id: string;
    wholesalerName: string;
    orderDate: string; // ISO date string
    items: OrderItem[];
    status: 'Pending' | 'Partially Received' | 'Completed' | 'Cancelled';
    receivedDate?: string; // ISO date string
}

export interface Wholesaler {
    id: string;
    name: string;
    contact?: string;
    gstin?: string;
}

// PIN and Role Management
export type UserRole = 'Admin' | 'Staff';

export interface PinSettings {
  adminPin: string;
  staffPin: string;
}

export interface LicenseInfo {
    line1: string;
    line2?: string;
}
