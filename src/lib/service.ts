import { type Medicine, type SaleRecord, type WholesalerOrder, type OrderItem, type Wholesaler, type LicenseInfo, AppSettings } from './types';
import { Firestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';

export class AppService {
    private db: Firestore;

    constructor(db: Firestore) {
        this.db = db;
    }

    private medicinesCol = collection(this.db, 'medicines');
    private salesCol = collection(this.db, 'sales');
    private wholesalersCol = collection(this.db, 'wholesalers');
    private wholesalerOrdersCol = collection(this.db, 'wholesalerOrders');
    private settingsDoc = doc(this.db, 'settings', 'app');

    // --- Settings Management ---
    async getAppSettings(): Promise<AppSettings | null> {
        const docSnap = await getDoc(this.settingsDoc);
        return docSnap.exists() ? docSnap.data() as AppSettings : null;
    }

    async saveAppSettings(settings: AppSettings): Promise<void> {
        await setDoc(this.settingsDoc, settings, { merge: true });
    }

    // --- Medicine Management ---
    async getMedicines(): Promise<Medicine[]> {
        const snapshot = await getDocs(this.medicinesCol);
        return snapshot.docs.map(doc => doc.data() as Medicine);
    }

    async saveMedicine(medicine: Medicine): Promise<Medicine> {
        const docRef = doc(this.medicinesCol, medicine.id);
        await setDoc(docRef, medicine);
        return medicine;
    }
    
    async saveAllMedicines(medicines: Medicine[]): Promise<void> {
        const batch = writeBatch(this.db);
        medicines.forEach(med => {
            const docRef = doc(this.medicinesCol, med.id);
            batch.set(docRef, med);
        });
        await batch.commit();
    }

    async deleteMedicine(id: string): Promise<string> {
        await deleteDoc(doc(this.medicinesCol, id));
        return id;
    }

    // --- Sales Management ---
    async getSales(): Promise<SaleRecord[]> {
        const snapshot = await getDocs(this.salesCol);
        return snapshot.docs.map(doc => doc.data() as SaleRecord);
    }

    async saveSale(sale: Omit<SaleRecord, 'saleDate'> & { saleDate: string | Timestamp }): Promise<SaleRecord> {
        const saleToSave = {
            ...sale,
            saleDate: Timestamp.now(),
            items: sale.items.map(item => ({ ...item, quantity: Number(item.quantity) }))
        };
        const docRef = doc(this.salesCol, sale.id);
        await setDoc(docRef, saleToSave);
        return saleToSave;
    }
    
    async saveAllSales(sales: SaleRecord[]): Promise<void> {
        const batch = writeBatch(this.db);
        sales.forEach(sale => {
            const docRef = doc(this.salesCol, sale.id);
            batch.set(docRef, sale);
        });
        await batch.commit();
    }
    
    async deleteAllSales(): Promise<void> {
        const snapshot = await getDocs(this.salesCol);
        const batch = writeBatch(this.db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }

    // --- Wholesaler Order Management ---
    async getWholesalerOrders(): Promise<WholesalerOrder[]> {
        const snapshot = await getDocs(this.wholesalerOrdersCol);
        return snapshot.docs.map(doc => doc.data() as WholesalerOrder);
    }
    
    async updateWholesalerOrderItemStatus(orderId: string, itemId: string, status: 'Received'): Promise<WholesalerOrder | null> {
        const orderRef = doc(this.wholesalerOrdersCol, orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return null;

        const order = orderSnap.data() as WholesalerOrder;
        
        const itemIndex = order.items.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
            order.items[itemIndex].status = status;
        }

        const allItemsReceived = order.items.every(i => i.status === 'Received');
        if (allItemsReceived) {
            order.status = 'Completed';
        } else {
            order.status = 'Partially Received';
        }
        
        if (order.status === 'Completed' || order.status === 'Partially Received') {
            order.receivedDate = Timestamp.now();
        }
        
        await setDoc(orderRef, order);
        return order;
    }

    async saveWholesalerOrder(order: WholesalerOrder): Promise<WholesalerOrder> {
        const docRef = doc(this.wholesalerOrdersCol, order.id);
        await setDoc(docRef, order);
        return order;
    }

    async addWholesalerOrder(data: { wholesalerName: string, items: Omit<OrderItem, 'id' | 'status'>[] }): Promise<WholesalerOrder> {
        const newOrder: WholesalerOrder = {
            id: new Date().toISOString(),
            wholesalerName: data.wholesalerName.trim(),
            orderDate: Timestamp.now(),
            items: data.items.map(item => ({ ...item, id: `${new Date().toISOString()}-${Math.random()}`, status: 'Pending' })),
            status: 'Pending',
        };
        const docRef = doc(this.wholesalerOrdersCol, newOrder.id);
        await setDoc(docRef, newOrder);
        return newOrder;
    }

    async deleteAllWholesalerOrders(): Promise<void> {
        const snapshot = await getDocs(this.wholesalerOrdersCol);
        const batch = writeBatch(this.db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }
    
    // --- Wholesaler (Supplier) Management ---
    async getWholesalers(): Promise<Wholesaler[]> {
        const snapshot = await getDocs(this.wholesalersCol);
        return snapshot.docs.map(doc => doc.data() as Wholesaler);
    }
    
    async saveAllWholesalers(wholesalers: Wholesaler[]): Promise<void> {
        const batch = writeBatch(this.db);
        wholesalers.forEach(w => {
            const docRef = doc(this.wholesalersCol, w.id);
            batch.set(docRef, w);
        });
        await batch.commit();
    }

    // --- License Info Management ---
    async getLicenseInfo(): Promise<LicenseInfo> {
        const settings = await this.getAppSettings();
        return settings?.licenseInfo ?? { line1: '', line2: '' };
    }
}
