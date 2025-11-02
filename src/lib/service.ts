import { type Medicine, type SaleRecord, type WholesalerOrder, type OrderItem } from './types';

// Helper to get all data from localStorage
const getLocalStorageData = () => {
    if (typeof window === 'undefined') {
        return { medicines: [], sales: [], wholesalerOrders: [] };
    }
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const wholesalerOrders = JSON.parse(localStorage.getItem('wholesalerOrders') || '[]');
    return { medicines, sales, wholesalerOrders };
};

export class AppService {
    private medicines: Medicine[] = [];
    private sales: SaleRecord[] = [];
    private wholesalerOrders: WholesalerOrder[] = [];

    constructor() {
        // Data is now initialized via the initialize method to ensure it's in sync with React state
    }
    
    // This method is called from AppPage to pass the current state from useLocalStorage
    initialize(medicines: Medicine[], sales: SaleRecord[], wholesalerOrders: WholesalerOrder[]): void {
        this.medicines = medicines;
        this.sales = sales;
        this.wholesalerOrders = wholesalerOrders;
    }

    private async simulateLatency<T>(data?: T): Promise<T | void> {
      // await new Promise(resolve => setTimeout(resolve, 50));
      return data;
    }

    // --- Medicine Management ---
    async getMedicines(): Promise<Medicine[]> {
        return this.simulateLatency(this.medicines);
    }

    async saveMedicine(medicine: Medicine): Promise<Medicine> {
        let savedMedicine: Medicine;
        const isEditing = this.medicines.some(m => m.id === medicine.id);
        
        if (isEditing) {
            savedMedicine = medicine;
            this.medicines = this.medicines.map(m => m.id === medicine.id ? savedMedicine : m);
        } else {
            savedMedicine = { ...medicine, id: new Date().toISOString() };
            this.medicines = [...this.medicines, savedMedicine];
        }
        
        localStorage.setItem('medicines', JSON.stringify(this.medicines));
        return this.simulateLatency(savedMedicine);
    }
    
    async saveAllMedicines(medicines: Medicine[]): Promise<void> {
        this.medicines = medicines;
        localStorage.setItem('medicines', JSON.stringify(this.medicines));
        return this.simulateLatency();
    }

    async deleteMedicine(id: string): Promise<string> {
        this.medicines = this.medicines.filter(m => m.id !== id);
        localStorage.setItem('medicines', JSON.stringify(this.medicines));
        return this.simulateLatency(id);
    }

    // --- Sales Management ---
    async getSales(): Promise<SaleRecord[]> {
        return this.simulateLatency(this.sales);
    }

    async saveSale(sale: SaleRecord): Promise<SaleRecord> {
        const isEditing = this.sales.some(s => s.id === sale.id);
        if (isEditing) {
            this.sales = this.sales.map(s => s.id === sale.id ? sale : s);
        } else {
            this.sales.push(sale);
        }
        localStorage.setItem('sales', JSON.stringify(this.sales));
        return this.simulateLatency(sale);
    }
    
    async deleteAllSales(): Promise<void> {
        this.sales = [];
        localStorage.setItem('sales', JSON.stringify(this.sales));
        return this.simulateLatency();
    }

    // --- Wholesaler Order Management ---
    async getWholesalerOrders(): Promise<WholesalerOrder[]> {
        return this.simulateLatency(this.wholesalerOrders);
    }

    async saveWholesalerOrder(order: WholesalerOrder): Promise<WholesalerOrder> {
        this.wholesalerOrders = this.wholesalerOrders.map(o => o.id === order.id ? order : o);
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        return this.simulateLatency(order);
    }

    async addWholesalerOrder(data: { wholesalerName: string, items: Omit<OrderItem, 'id'>[] }): Promise<WholesalerOrder> {
        const newOrder: WholesalerOrder = {
            id: new Date().toISOString(),
            wholesalerName: data.wholesalerName.trim(),
            orderDate: new Date().toISOString(),
            items: data.items.map(item => ({ ...item, id: `${new Date().toISOString()}-${Math.random()}` })),
            status: 'Pending',
        };
        this.wholesalerOrders = [newOrder, ...this.wholesalerOrders];
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        return this.simulateLatency(newOrder);
    }

    async deleteAllWholesalerOrders(): Promise<void> {
        this.wholesalerOrders = [];
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        return this.simulateLatency();
    }
}
