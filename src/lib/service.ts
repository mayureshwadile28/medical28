import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  where,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { type Medicine, type SaleRecord, type SupplierOrder, type OrderItem } from './types';

const MEDICINES_COLLECTION = 'medicines';
const SALES_COLLECTION = 'sales';
const SUPPLIER_ORDERS_COLLECTION = 'supplierOrders';


export class AppService {
    
  constructor() {
    // Firestore is initialized in firebase/config.ts
  }

  // A simple async wrapper to simulate network latency in the future.
  private async simulateLatency<T>(data: T): Promise<T> {
      // await new Promise(resolve => setTimeout(resolve, 50));
      return data;
  }

  async initialize() {
      // No longer needed for local storage, but kept for API consistency.
      return this.simulateLatency(true);
  }
  
  // --- Medicine Management ---
  async getMedicines(): Promise<Medicine[]> {
    const medicinesCollection = collection(db, MEDICINES_COLLECTION);
    const snapshot = await getDocs(medicinesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
  }

  async saveMedicine(medicine: Medicine): Promise<Medicine> {
    const medicinesCollection = collection(db, MEDICINES_COLLECTION);
    if (medicine.id && typeof medicine.id === 'string' && !medicine.id.startsWith('temp-')) {
      const docRef = doc(db, MEDICINES_COLLECTION, medicine.id);
      await setDoc(docRef, medicine, { merge: true });
      return medicine;
    } else {
      const { id, ...medicineData } = medicine;
      const docRef = await addDoc(medicinesCollection, medicineData);
      return { id: docRef.id, ...medicineData } as Medicine;
    }
  }

  async saveAllMedicines(medicines: Medicine[]): Promise<void> {
    const batch = writeBatch(db);
    medicines.forEach(medicine => {
      let docRef;
      if (medicine.id && typeof medicine.id === 'string' && !medicine.id.startsWith('temp-')) {
        docRef = doc(db, MEDICINES_COLLECTION, medicine.id);
      } else {
        docRef = doc(collection(db, MEDICINES_COLLECTION));
      }
      batch.set(docRef, medicine);
    });
    await batch.commit();
  }

  async deleteMedicine(id: string): Promise<void> {
    const docRef = doc(db, MEDICINES_COLLECTION, id);
    await deleteDoc(docRef);
  }

  // --- Sales Management ---
  async getSales(): Promise<SaleRecord[]> {
    const salesCollection = collection(db, SALES_COLLECTION);
    const q = query(salesCollection, orderBy('saleDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord));
  }

  async saveSale(sale: SaleRecord): Promise<SaleRecord> {
    const salesCollection = collection(db, SALES_COLLECTION);
    const { id, ...saleData } = sale;
    const docRef = await addDoc(salesCollection, saleData);
    return { id: docRef.id, ...saleData } as SaleRecord;
  }
  
  async saveAllSales(sales: SaleRecord[]): Promise<void> {
      const batch = writeBatch(db);
      const salesCollection = collection(db, SALES_COLLECTION);
      sales.forEach(sale => {
          const { id, ...saleData } = sale;
          const docRef = doc(salesCollection, id); // Use existing id
          batch.set(docRef, saleData);
      });
      await batch.commit();
  }
  
  async deleteAllSales(): Promise<void> {
      const salesCollection = collection(db, SALES_COLLECTION);
      const snapshot = await getDocs(salesCollection);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
  }


  // --- Supplier Order Management ---
  async getSupplierOrders(): Promise<SupplierOrder[]> {
    const ordersCollection = collection(db, SUPPLIER_ORDERS_COLLECTION);
    const q = query(ordersCollection, orderBy('orderDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierOrder));
  }
  
  async saveSupplierOrder(order: SupplierOrder): Promise<SupplierOrder> {
    const docRef = doc(db, SUPPLIER_ORDERS_COLLECTION, order.id);
    await setDoc(docRef, order, { merge: true });
    return order;
  }
  
  async addSupplierOrder(data: { supplierName: string, items: Omit<OrderItem, 'id'>[] }): Promise<SupplierOrder> {
      const newOrder: Omit<SupplierOrder, 'id'> = {
          supplierName: data.supplierName.trim(),
          orderDate: new Date().toISOString(),
          items: data.items.map(item => ({...item, id: doc(collection(db, 'temp')).id })), // temp id
          status: 'Pending',
      };
      const docRef = await addDoc(collection(db, SUPPLIER_ORDERS_COLLECTION), newOrder);
      return { id: docRef.id, ...newOrder } as SupplierOrder;
  }
}
