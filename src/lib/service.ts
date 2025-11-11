import { type Medicine, type SaleRecord, type WholesalerOrder, type OrderItem, type Wholesaler, type LicenseInfo } from './types';

// Helper to get all data from localStorage
const getLocalStorageData = () => {
    if (typeof window === 'undefined') {
        return { medicines: [], sales: [], wholesalerOrders: [], wholesalers: [], licenseInfo: { line1: '', line2: '' } };
    }
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const wholesalerOrders = JSON.parse(localStorage.getItem('wholesalerOrders') || '[]');
    const wholesalers = JSON.parse(localStorage.getItem('wholesalers') || '[]');
    const licenseInfo = JSON.parse(localStorage.getItem('vicky-medical-license-info') || '{"line1": "Lic. No.: 20-DHL-212349, 21-DHL-212351", "line2": "Lic. No.: 20-DHL-212350"}');
    return { medicines, sales, wholesalerOrders, wholesalers, licenseInfo };
};

interface AppData {
    medicines: Medicine[];
    sales: SaleRecord[];
    wholesalerOrders: WholesalerOrder[];
    wholesalers: Wholesaler[];
    licenseInfo: LicenseInfo;
}
export class AppService {
    private medicines: Medicine[] = [];
    private sales: SaleRecord[] = [];
    private wholesalerOrders: WholesalerOrder[] = [];
    private wholesalers: Wholesaler[] = [];
    private licenseInfo: LicenseInfo = { line1: '', line2: ''};

    constructor() {
        // Data is now initialized via the initialize method to ensure it's in sync with React state
    }
    
    // This method is called from AppPage to pass the current state from useLocalStorage
    initialize(data: AppData): void {
        this.medicines = data.medicines;
        this.sales = data.sales;
        this.wholesalerOrders = data.wholesalerOrders;
        this.wholesalers = data.wholesalers;
        this.licenseInfo = data.licenseInfo;
    }

    private async simulateLatency<T>(data: T): Promise<T> {
      // await new Promise(resolve => setTimeout(resolve, 50));
      return data;
    }
    
    private async simulateLatencyVoid(): Promise<void> {
        // await new Promise(resolve => setTimeout(resolve, 50));
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
            savedMedicine = { ...medicine, id: new Date().toISOString() + Math.random() };
            this.medicines = [...this.medicines, savedMedicine];
        }
        
        localStorage.setItem('medicines', JSON.stringify(this.medicines));
        return this.simulateLatency(savedMedicine);
    }
    
    async saveAllMedicines(medicines: Medicine[]): Promise<void> {
        this.medicines = medicines;
        localStorage.setItem('medicines', JSON.stringify(this.medicines));
        await this.simulateLatencyVoid();
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
    
    async saveAllSales(sales: SaleRecord[]): Promise<void> {
        this.sales = sales;
        localStorage.setItem('sales', JSON.stringify(this.sales));
        await this.simulateLatencyVoid();
    }
    
    async deleteAllSales(): Promise<void> {
        this.sales = [];
        localStorage.setItem('sales', JSON.stringify(this.sales));
        await this.simulateLatencyVoid();
    }

    // --- Wholesaler Order Management ---
    async getWholesalerOrders(): Promise<WholesalerOrder[]> {
        return this.simulateLatency(this.wholesalerOrders);
    }
    
    async updateWholesalerOrderItemStatus(orderId: string, itemId: string, status: 'Received'): Promise<WholesalerOrder | null> {
        const orderIndex = this.wholesalerOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return null;

        const order = { ...this.wholesalerOrders[orderIndex] };
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
            order.receivedDate = new Date().toISOString();
        }
        
        this.wholesalerOrders[orderIndex] = order;
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        return this.simulateLatency(order);
    }

    async saveWholesalerOrder(order: WholesalerOrder): Promise<WholesalerOrder> {
        this.wholesalerOrders = this.wholesalerOrders.map(o => o.id === order.id ? order : o);
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        return this.simulateLatency(order);
    }

    async addWholesalerOrder(data: { wholesalerName: string, items: Omit<OrderItem, 'id' | 'status'>[] }): Promise<WholesalerOrder> {
        const newOrder: WholesalerOrder = {
            id: new Date().toISOString(),
            wholesalerName: data.wholesalerName.trim(),
            orderDate: new Date().toISOString(),
            items: data.items.map(item => ({ ...item, id: `${new Date().toISOString()}-${Math.random()}`, status: 'Pending' })),
            status: 'Pending',
        };
        this.wholesalerOrders = [newOrder, ...this.wholesalerOrders];
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        return this.simulateLatency(newOrder);
    }

    async deleteAllWholesalerOrders(): Promise<void> {
        this.wholesalerOrders = [];
        localStorage.setItem('wholesalerOrders', JSON.stringify(this.wholesalerOrders));
        await this.simulateLatencyVoid();
    }
    
    // --- Wholesaler (Supplier) Management ---
    async getWholesalers(): Promise<Wholesaler[]> {
        return this.simulateLatency(this.wholesalers);
    }
    
    async saveAllWholesalers(wholesalers: Wholesaler[]): Promise<void> {
        this.wholesalers = wholesalers;
        localStorage.setItem('wholesalers', JSON.stringify(this.wholesalers));
        await this.simulateLatencyVoid();
    }
    
    // --- License Info Management ---
    async getLicenseInfo(): Promise<LicenseInfo> {
        return this.simulateLatency(this.licenseInfo);
    }
}