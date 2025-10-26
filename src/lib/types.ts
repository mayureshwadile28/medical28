import { z } from 'zod';

export type TabletStock = {
  tablets: number; // Total number of tablets/capsules
};

export type OtherStock = {
  quantity: number;
};

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
  category: string;
  location: string;
  expiry: string; // ISO date string
  description?: MedicineDescription;
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

// Type guards
export function isTablet(medicine: Medicine): medicine is TabletMedicine {
  return medicine.category === 'Tablet' || medicine.category === 'Capsule';
}

export function isGeneric(medicine: Medicine): medicine is GenericMedicine {
  return !isTablet(medicine);
}


export interface SaleItem {
  medicineId: string;
  name: string;
  category: string;
  quantity: number | ''; // Allow empty string for controlled input, represents tablets for Tablet category
  pricePerUnit: number; // Price for the unit sold (e.g., price per tablet, price per bottle)
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
    category: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
  }[];
  totalAmount: number;
  paymentMode: PaymentMode;
  paymentSettledDate?: string; // ISO date string, set when a 'Pending' payment is cleared
}

export type SaleBillItem = Omit<SaleItem, 'quantity'> & {
  quantity: number;
}

// Client-side types for non-AI suggestion flow
export interface SuggestMedicinesInput {
  patient: {
    patientType: 'Human' | 'Animal';
    age?: number;
    gender?: 'Male' | 'Female' | 'Both';
    illnesses: string[];
  };
  inventory: Medicine[];
}

export interface SuggestMedicinesOutput {
  suggestions: {
    medicineId: string;
    name: string;
    reason: string;
  }[];
}


// For scan-bill flow
const ScannedItemSchema = z.object({
  name: z.string().describe('The name of the medicine.'),
  quantity: z.number().describe('The quantity of the medicine.'),
});

export const ScanBillOutputSchema = z.object({
  items: z.array(ScannedItemSchema).describe('An array of medicines found on the bill.'),
});
export type ScanBillOutput = z.infer<typeof ScanBillOutputSchema>;

export const ScanBillInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ScanBillInput = z.infer<typeof ScanBillInputSchema>;
