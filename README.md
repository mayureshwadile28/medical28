# Vicky Medical POS - Pharmacy Management System

This is a comprehensive, feature-rich Point of Sale (POS) and inventory management system designed specifically for a medical store. It's built as a modern, single-page web application that runs entirely in the browser, making it fast, efficient, and easy to deploy.

### Key Features:

1.  **Secure PIN-Based Access**:
    *   The application features a two-tiered role system (**Admin** and **Staff**) protected by separate PINs.
    *   Admins have full access to all features, including sales reports and application settings, while Staff access is restricted to core POS and inventory functions.

2.  **Intuitive Dashboard**:
    *   Provides at-a-glance analytics of your pharmacy's performance, including total revenue, sales volume, and average sale value.
    *   Visual charts display daily sales trends, top-selling products, and the distribution of payment methods (Cash, Online, Card).

3.  **Advanced Point of Sale (POS) Tab**:
    *   A powerful interface for creating customer bills quickly.
    *   Features a smart search to find medicines by name or by description (e.g., symptoms, patient age, gender).
    *   Automatically selects batches with the soonest expiry date and provides options to choose other batches if needed.
    *   Supports customer name and doctor name association with bills, as well as percentage-based discounts.

4.  **Comprehensive Inventory Management**:
    *   A complete inventory system to track all medicines, including details like batch number, manufacturing/expiry dates, MRP, and stock levels.
    *   Provides clear visual indicators for items that are out of stock or low on stock.
    *   Supports importing and exporting the entire inventory via JSON files, making bulk updates easy.
    *   Includes dedicated, filterable reports for **expiring medicines** and **out-of-stock items**.

5.  **Sales & Customer History**:
    *   A searchable and sortable history of all completed sales, with detailed accordion views for each bill.
    *   Functionality to **print** a professionally formatted bill or **download it as a PNG image**.
    *   A `Customers` tab that acts as a directory, showing purchase history and outstanding balances for each customer.

6.  **Wholesaler Order Management**:
    *   A dedicated tab to create and manage purchase orders for your suppliers.
    *   Seamlessly receive items from an order and add them directly into your inventory, simplifying the restocking process.

7.  **Admin Settings Panel**:
    *   A secure, license-key-protected settings dialog for the Admin.
    *   Allows the Admin to change both the Admin and Staff PINs.
    *   Allows editing the store's license numbers that appear on printed bills.

This application is designed to be a complete, all-in-one solution for managing a pharmacy's day-to-day operations efficiently.
