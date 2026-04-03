# 🚀 POS UMKM - Complete Point of Sale System

> **Status: 100% READY FOR PRODUCTION** ✅  
> **Phase Completed: Phase 1 (MVP) + Phase 2 (Feature Completeness)**

Sistem Point of Sale lengkap untuk UMKM Indonesia dengan fitur Recipe & BOM, Loyalty Points, Cash Reconciliation, dan Inventory Management.

---

## ✨ Features

### 🛒 **POS/Cashier**
- Product grid dengan category filter & search
- Shopping cart management
- Multiple payment methods (Cash, QRIS, Debit, Credit, E-wallet)
- Customer selection & loyalty points
- Auto stock deduction
- Receipt display

### 📦 **Product Management**
- CRUD products & categories
- Stock tracking dengan low stock alerts
- SKU & barcode support
- Multiple units (pcs, kg, liter, etc.)
- Price & cost management

### 🍳 **Recipe & BOM** ⭐
- Recipe builder dengan ingredient selector
- **Auto HPP calculation**
- **Auto stock deduction** per ingredient saat transaksi
- Yield factor untuk susut bahan (0.1-1.0)
- Food cost percentage display

### 👥 **Customer Management**
- Customer database
- Loyalty points (1 point per Rp 1.000)
- Transaction history
- Total spent tracking

### 📋 **Inventory Management**
- Low stock alerts
- Purchase Order workflow
- Receive goods & update stock
- Stock value calculation

### 📈 **Reports**
- Daily sales report
- Top products ranking
- Payment method breakdown
- Hourly sales chart
- Inventory status

### 🕐 **Shift Management**
- Open/close shift
- Cash reconciliation
- Expected vs actual cash
- Cash difference tracking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running on localhost:27017

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create admin user
npm run seed

# 3. Start development server
npm run dev

# 4. Open browser
http://localhost:3000
```

### Default Login
- **Email:** admin@gmail.com
- **Password:** admin123

---

## 📁 Project Structure

```
pos-umkm/
├── app/
│   ├── page.tsx                    # Login page
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar navigation
│   │   ├── page.tsx                # Dashboard home
│   │   ├── pos/page.tsx            # POS/Cashier interface
│   │   ├── products/page.tsx       # Product management
│   │   ├── inventory/page.tsx      # Inventory & PO
│   │   ├── customers/page.tsx      # Customer management
│   │   ├── recipes/page.tsx        # Recipe builder
│   │   ├── reports/page.tsx        # Reports dashboard
│   │   └── shifts/page.tsx         # Shift management
│   └── api/                        # 30+ REST API endpoints
├── lib/mongodb.ts                  # DB connection
├── models/                         # 9 Mongoose schemas
└── scripts/seed.js                 # Admin seeder
```

---

## 🎯 Usage Guide

### 1. Opening a Shift
1. Go to **Shift** menu
2. Click "Buka Shift"
3. Enter starting cash
4. Click "Buka Shift"

### 2. Making a Sale
1. Go to **Kasir/POS** menu
2. Select products
3. Adjust quantities
4. Select customer (optional)
5. Click "Bayar"
6. Choose payment method
7. Process payment

### 3. Creating a Recipe
1. Go to **Resep & BOM** menu
2. Click "+ Tambah Resep"
3. Select finished product
4. Add ingredients with quantities
5. Set yield factor (0.9 = 10% waste)
6. Save recipe
7. HPP calculated automatically

**When you sell a product with recipe:**
- Ingredient stocks are deducted
- Main product stock is NOT deducted
- Customer gets loyalty points

### 4. Closing a Shift
1. Go to **Shift** menu
2. Click "Tutup Shift"
3. Count and enter ending cash
4. System calculates difference
5. Click "Tutup Shift"

---

## 📖 Documentation

- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Complete user guide, API reference, troubleshooting
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API endpoints, feature checklist, testing guide

---

## 🔥 Key Features Explained

### Recipe & BOM System
**Problem:** Manual stock tracking for F&B products is error-prone

**Solution:** Create recipes that automatically deduct ingredient stocks

**Example:**
```
Product: Nasi Goreng (Rp 25.000)
Recipe:
  - Beras: 200g
  - Telur: 1 pcs
  - Bumbu: 50g
Yield Factor: 0.9 (10% waste)

When sold:
  ✓ Beras stock -200g
  ✓ Telur stock -1 pcs
  ✓ Bumbu stock -50g
  ✓ Nasi Goreng stock unchanged
  ✓ HPP auto-calculated: Rp 15.000
  ✓ Food Cost: 60% (15000/25000)
```

### Loyalty Points System
- Auto-calculate: 1 point per Rp 1.000 spent
- Track total spent & visit count
- Last visit date tracking

### Cash Reconciliation
- Starting cash + Cash sales = Expected cash
- Compare with actual ending cash
- Show difference (surplus/shortage)
- Complete audit trail per shift

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16.2.2, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (REST API)
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT + bcryptjs

---

## 📊 Statistics

- **API Endpoints:** 30+
- **Frontend Pages:** 9
- **Database Models:** 9
- **Features:** 40+
- **Lines of Code:** ~8,000+

---

## 🐛 Troubleshooting

**MongoDB connection error?**
```bash
mongod
```

**Admin user doesn't exist?**
```bash
npm run seed
```

**JWT token expired?**
- Logout and login again

**Stock not deducting?**
- Check if product has recipe
- Verify recipe exists
- Check ingredient stocks

---

## 🎯 Next Steps (Optional)

- [ ] Offline mode with IndexedDB
- [ ] Print receipt
- [ ] Export to Excel
- [ ] WhatsApp/Email integration
- [ ] Dark mode
- [ ] Multi-location support

---

## 📝 License

This project is for educational and business purposes.

---

## 🆘 Support

For help:
1. Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
2. Check browser console for errors
3. Review MongoDB logs
4. Test API with Postman

---

**🎉 System Ready! Happy Selling! 🎉**
