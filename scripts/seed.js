/**
 * Seed data untuk POS Distributor (air mineral, LPG, air minum kemasan).
 *
 *   npm run seed           -> isi data jika database masih kosong
 *   npm run seed:fresh     -> hapus semua koleksi lalu isi ulang
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const FRESH = process.argv.includes('--fresh');

if (!MONGODB_URI) {
  console.error('MONGODB_URI belum diset. Salin .env.example menjadi .env.local lalu isi nilainya.');
  process.exit(1);
}

// Skema longgar: validasi lengkap ada di models/*.ts, di sini cukup nama koleksinya.
const loose = (name) =>
  mongoose.models[name] ||
  mongoose.model(name, new mongoose.Schema({}, { strict: false, timestamps: true }));

const User = loose('User');
const Category = loose('Category');
const Warehouse = loose('Warehouse');
const Vehicle = loose('Vehicle');
const Product = loose('Product');
const Supplier = loose('Supplier');
const Customer = loose('Customer');
const Transaction = loose('Transaction');
const Delivery = loose('Delivery');
const PurchaseOrder = loose('PurchaseOrder');
const StockOpname = loose('StockOpname');
const StockOpnameItem = loose('StockOpnameItem');

// Skema longgar tidak punya getter per field, jadi kembalikan sebagai plain object
const insert = async (Model, docs, opts) =>
  (await Model.insertMany(docs, opts)).map((d) => d.toObject());

const ALL_MODELS = [
  User, Category, Warehouse, Vehicle, Product, Supplier, Customer,
  Transaction, Delivery, PurchaseOrder, StockOpname, StockOpnameItem,
];

// PRNG deterministik supaya hasil seed selalu sama
let rngState = 20260407;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const dateStr = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const daysAgo = (n, hour = 0, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function seedUsers() {
  const users = [
    { name: 'admin', email: 'admin@gmail.com', password: 'admin123', role: 'admin' },
    { name: 'Rina', email: 'kasir1@gmail.com', password: 'kasir123', role: 'cashier' },
    { name: 'Dodi', email: 'kasir2@gmail.com', password: 'kasir123', role: 'cashier' },
  ];
  const docs = [];
  for (const u of users) {
    docs.push({ ...u, password: await bcrypt.hash(u.password, 10) });
  }
  return insert(User, docs);
}

async function seedCategories() {
  const categories = await insert(Category, [
    { name: 'Air Mineral', description: 'Air mineral galon & isi ulang', icon: '💧', color: '#0EA5E9', type: 'product', isActive: true },
    { name: 'LPG', description: 'Gas LPG berbagai ukuran tabung', icon: '🔥', color: '#DC2626', type: 'product', isActive: true },
    { name: 'Air Minum Kemasan', description: 'Air minum dalam kemasan cup & botol', icon: '🥤', color: '#16A34A', type: 'product', isActive: true },
  ]);
  return Object.fromEntries(categories.map((c) => [c.name, c]));
}

async function seedWarehouses() {
  const warehouses = await insert(Warehouse, [
    { code: 'GDG-01', name: 'Gudang Air', address: 'Jl. Raya Industri No. 10', picName: 'Hendra', phone: '081200000001', isActive: true },
    { code: 'GDG-02', name: 'Depot LPG', address: 'Jl. Pergudangan Timur Blok C-3', picName: 'Yusuf', phone: '081200000002', isActive: true },
  ]);
  return Object.fromEntries(warehouses.map((w) => [w.code, w]));
}

async function seedVehicles() {
  return insert(Vehicle, [
    { name: 'Truk Engkel 01', plateNumber: 'B 9123 KXA', driverName: 'Slamet', driverPhone: '081377770001', capacity: { besar: 60, medium: 120, kecil: 300 }, isActive: true },
    { name: 'Pickup L300', plateNumber: 'B 9456 KXB', driverName: 'Joko', driverPhone: '081377770002', capacity: { besar: 25, medium: 60, kecil: 150 }, isActive: true },
    { name: 'Motor Box', plateNumber: 'B 3789 KXC', driverName: 'Agus', driverPhone: '081377770003', capacity: { besar: 0, medium: 8, kecil: 40 }, isActive: true },
  ]);
}

async function seedProducts(cat, wh) {
  // [sku, nama, kategori, ukuran, gudang, satuan, harga beli, harga jual, stok, min stok, barcode]
  const rows = [
    ['AMN-001', 'Air Mineral Galon 19L (Isi Ulang)', 'Air Mineral', 'besar', 'GDG-01', 'pcs', 15000, 19000, 160, 30],
    ['AMN-002', 'Air Mineral Galon 19L + Galon Baru', 'Air Mineral', 'besar', 'GDG-01', 'pcs', 48000, 58000, 40, 10],
    ['AMN-003', 'Air Mineral Galon 15L', 'Air Mineral', 'besar', 'GDG-01', 'pcs', 13000, 16500, 80, 15],
    ['AMN-004', 'Air Mineral Galon 5L (isi 4)', 'Air Mineral', 'medium', 'GDG-01', 'dus', 32000, 38000, 70, 15],
    ['LPG-003', 'LPG 3kg (Isi Ulang)', 'LPG', 'medium', 'GDG-02', 'pcs', 17000, 20000, 300, 60],
    ['LPG-055', 'LPG 5,5kg (Isi Ulang)', 'LPG', 'medium', 'GDG-02', 'pcs', 88000, 97000, 60, 10],
    ['LPG-012', 'LPG 12kg (Isi Ulang)', 'LPG', 'besar', 'GDG-02', 'pcs', 192000, 210000, 80, 15],
    ['LPG-050', 'LPG 50kg (Isi Ulang)', 'LPG', 'besar', 'GDG-02', 'pcs', 780000, 840000, 12, 4],
    ['LPG-T03', 'Tabung LPG 3kg + Isi (Baru)', 'LPG', 'medium', 'GDG-02', 'pcs', 165000, 185000, 25, 5],
    ['AMK-001', 'Air Minum Cup 220ml (isi 48)', 'Air Minum Kemasan', 'medium', 'GDG-01', 'dus', 22000, 27000, 200, 40, '8992753102006'],
    ['AMK-002', 'Air Minum Botol 330ml (isi 24)', 'Air Minum Kemasan', 'medium', 'GDG-01', 'dus', 30000, 36000, 150, 30, '8992753103300'],
    ['AMK-003', 'Air Minum Botol 600ml (isi 24)', 'Air Minum Kemasan', 'medium', 'GDG-01', 'dus', 38000, 45000, 180, 30, '8992753101207'],
    ['AMK-004', 'Air Minum Botol 1500ml (isi 12)', 'Air Minum Kemasan', 'medium', 'GDG-01', 'dus', 42000, 50000, 90, 20, '8992753115006'],
    ['AMK-005', 'Air Minum Botol 600ml (pack isi 6)', 'Air Minum Kemasan', 'kecil', 'GDG-01', 'pack', 10500, 12500, 8, 20],
    ['AMK-006', 'Air Minum Cup 120ml (pack isi 12)', 'Air Minum Kemasan', 'kecil', 'GDG-01', 'pack', 6000, 7500, 240, 40],
  ];

  const docs = rows.map(([sku, name, c, sizeType, w, unit, cost, price, stock, minStock, barcode]) => ({
    sku, name, category: cat[c]._id, sizeType, warehouse: wh[w]._id, unit, cost, price, stock, minStock,
    barcode, isActive: true,
  }));
  const products = await insert(Product, docs);
  return Object.fromEntries(products.map((p) => [p.sku, p]));
}

async function seedSuppliers() {
  const suppliers = await insert(Supplier, [
    {
      name: 'PT. Tirta Sejahtera', contactPerson: 'Budi Santoso', email: 'budi@tirtasejahtera.co.id',
      phone: '081234567890', address: 'Jl. Industri No. 123, Bogor', notes: 'Pabrik air mineral galon', isActive: true,
    },
    {
      name: 'CV. Sumber Air Kemasan', contactPerson: 'Siti Rahayu', email: 'siti@sumberair.com',
      phone: '081234567891', address: 'Jl. Raya Sukabumi KM 12', notes: 'Air minum kemasan cup & botol', isActive: true,
    },
    {
      name: 'PT. Agen Gas Nusantara', contactPerson: 'Ahmad Fauzi', email: 'ahmad@agengas.co.id',
      phone: '081234567892', address: 'Jl. Raya Cikarang No. 78, Bekasi', notes: 'Agen resmi LPG 3kg, 5,5kg, 12kg, 50kg', isActive: true,
    },
  ]);
  return Object.fromEntries(suppliers.map((s) => [s.name, s]));
}

async function seedCustomers() {
  return insert(Customer, [
    { name: 'Toko Sumber Rejeki', phone: '081311112222', address: 'Jl. Melati No. 5, Depok', notes: 'Bayar tempo 7 hari' },
    { name: 'Warung Bu Dewi', phone: '081322223333', address: 'Jl. Kenanga No. 12, Depok' },
    { name: 'Minimarket Berkah', phone: '081333334444', address: 'Jl. Margonda Raya No. 88, Depok' },
    { name: 'Toko Sinar Jaya', phone: '081344445555', address: 'Perum Griya Asri B-7, Cibinong' },
    { name: 'Grosir Pak Fajar', phone: '081355556666', address: 'Pasar Cisalak Blok A-12' },
    { name: 'Toko Makmur Abadi', phone: '081366667777', address: 'Jl. Raya Bogor KM 30' },
  ].map((c) => ({ ...c, loyaltyPoints: 0, totalSpent: 0, transactionCount: 0, isActive: true })));
}

async function seedTransactions(users, prod, customers) {
  const cashiers = users.filter((u) => u.role === 'cashier');
  const products = Object.values(prod);
  const invoiceCounter = {};
  const customerStats = new Map();
  const transactions = [];

  for (let day = 6; day >= 0; day--) {
    const count = randInt(4, 6);
    for (let n = 0; n < count; n++) {
      const createdAt = daysAgo(day, randInt(8, 16), randInt(0, 59));
      const key = dateStr(createdAt);
      invoiceCounter[key] = (invoiceCounter[key] || 0) + 1;
      const cashier = pick(cashiers);
      const customer = pick(customers);

      const chosen = new Map();
      for (let i = 0; i < randInt(1, 3); i++) {
        const p = pick(products);
        const qty = p.sizeType === 'besar' ? randInt(1, 3) : p.sizeType === 'medium' ? randInt(2, 6) : randInt(3, 10);
        chosen.set(p.sku, { p, qty: (chosen.get(p.sku)?.qty || 0) + qty });
      }
      const items = [...chosen.values()].map(({ p, qty }) => ({
        product: p._id, productName: p.name, sku: p.sku, quantity: qty, price: p.price,
        subtotal: p.price * qty, sizeType: p.sizeType, unit: p.unit,
      }));
      const total = items.reduce((s, i) => s + i.subtotal, 0);

      // Campuran: lunas di kasir, DP, dan hutang (dibayar saat kirim)
      const roll = rand();
      const paymentMethod = rand() < 0.6 ? 'cash' : 'transfer';
      let amountPaid = 0;
      if (roll < 0.4) amountPaid = total;
      else if (roll < 0.65) amountPaid = Math.round((total * 0.3) / 1000) * 1000;
      const paymentStatus = amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
      const pickup = rand() < 0.1;

      transactions.push({
        invoiceNumber: `INV-${key}-${String(invoiceCounter[key]).padStart(4, '0')}`,
        items, subtotal: total, tax: 0, discount: 0, total, paymentMethod,
        paymentStatus, amountPaid,
        payments: amountPaid > 0
          ? [{
              _id: new mongoose.Types.ObjectId(), amount: amountPaid, method: paymentMethod, date: createdAt,
              notes: paymentStatus === 'paid' ? 'Pembayaran lunas di kasir' : 'DP di kasir', receivedByName: cashier.name,
            }]
          : [],
        dueDate: paymentStatus !== 'paid' ? daysAgo(day - 7, 0, 0) : undefined,
        deliveryStatus: pickup ? 'not_required' : 'pending',
        customer: customer._id, customerName: customer.name,
        customerPhone: customer.phone, customerAddress: customer.address,
        cashier: cashier._id, cashierName: cashier.name,
        isSynced: true, syncedAt: createdAt, createdAt, updatedAt: createdAt,
      });

      const s = customerStats.get(String(customer._id)) || { totalSpent: 0, transactionCount: 0, loyaltyPoints: 0 };
      s.totalSpent += total;
      s.transactionCount += 1;
      s.loyaltyPoints += Math.floor(total / 1000);
      s.lastVisit = createdAt;
      customerStats.set(String(customer._id), s);
    }
  }

  await Promise.all(
    [...customerStats.entries()].map(([id, s]) => Customer.updateOne({ _id: id }, s))
  );
  return transactions;
}

// Pengiriman: hari 6-3 sudah ditagih driver, hari 2-1 belum ditagih, hari ini masih antrian
async function seedDeliveries(admin, vehicles, transactions) {
  const [truck, pickup] = vehicles;
  const toShip = (from, to) =>
    transactions.filter((t) => {
      const age = Math.round((daysAgo(0).getTime() - new Date(t.createdAt).setHours(0, 0, 0, 0)) / 86400000);
      return t.deliveryStatus === 'pending' && age <= from && age >= to;
    });

  const plans = [
    { name: 'Pengiriman A - Rute Depok', vehicle: truck, day: 3, txs: toShip(6, 3), collect: true },
    { name: 'Pengiriman B - Rute Cibinong', vehicle: pickup, day: -1, txs: toShip(2, 1), collect: false },
  ];

  const deliveries = [];
  for (const plan of plans) {
    const date = daysAgo(plan.day, 7, 0);
    const deliveryId = new mongoose.Types.ObjectId();
    const deliveryNumber = `DLV-${dateStr(date)}-001`;

    for (const t of plan.txs) {
      t.delivery = deliveryId;
      t.deliveryStatus = 'delivered';
      // Driver menagih sebagian besar sisa tagihan saat pengiriman selesai
      if (plan.collect && t.amountPaid < t.total && rand() < 0.75) {
        const remaining = t.total - t.amountPaid;
        const amount = rand() < 0.8 ? remaining : Math.round(remaining / 2000) * 1000;
        t.payments.push({
          _id: new mongoose.Types.ObjectId(), amount, method: 'cash', date: daysAgo(plan.day, 15, 0),
          notes: 'Ditagih saat pengiriman', receivedByName: admin.name, delivery: deliveryId,
        });
        t.amountPaid += amount;
        t.paymentStatus = t.amountPaid >= t.total ? 'paid' : 'partial';
      }
    }

    deliveries.push({
      _id: deliveryId, deliveryNumber, name: plan.name, date,
      vehicle: plan.vehicle._id, vehicleName: plan.vehicle.name, plateNumber: plan.vehicle.plateNumber,
      driverName: plan.vehicle.driverName,
      transactions: plan.txs.map((t) => t._id),
      expenses: plan.collect
        ? [
            { _id: new mongoose.Types.ObjectId(), category: 'bensin', description: 'Solar', amount: 250000, date, createdByName: admin.name },
            { _id: new mongoose.Types.ObjectId(), category: 'tol', amount: 46000, date, createdByName: admin.name },
            { _id: new mongoose.Types.ObjectId(), category: 'makan', description: 'Makan siang driver & kenek', amount: 60000, date, createdByName: admin.name },
          ]
        : [],
      createdBy: admin._id, createdByName: admin.name,
      createdAt: daysAgo(plan.day + 1, 17, 0), updatedAt: date,
    });
  }

  return deliveries;
}

async function seedPurchaseOrders(admin, prod, sup) {
  const orders = [
    {
      supplier: 'PT. Tirta Sejahtera', status: 'received', orderDay: 10, expectedDay: 8, receivedDay: 8,
      items: [['AMN-001', 150, 15000], ['AMN-003', 60, 13000]], notes: 'Stok galon mingguan',
    },
    {
      supplier: 'PT. Agen Gas Nusantara', status: 'received', orderDay: 7, expectedDay: 5, receivedDay: 5,
      items: [['LPG-003', 200, 17000], ['LPG-012', 40, 192000], ['LPG-055', 30, 88000]],
    },
    {
      supplier: 'CV. Sumber Air Kemasan', status: 'sent', orderDay: 1, expectedDay: -2,
      items: [['AMK-005', 100, 10500], ['AMK-003', 80, 38000]],
      notes: 'Pack 600ml sudah di bawah stok minimum',
    },
    {
      supplier: 'PT. Agen Gas Nusantara', status: 'draft', orderDay: 0, expectedDay: -5,
      items: [['LPG-050', 10, 780000], ['LPG-003', 150, 17000]],
    },
  ];

  const counter = {};
  const docs = orders.map((o) => {
    const orderDate = daysAgo(o.orderDay, 10, 0);
    const key = dateStr(orderDate);
    counter[key] = (counter[key] || 0) + 1;
    const items = o.items.map(([sku, quantity, unitPrice]) => ({
      product: prod[sku]._id, productName: prod[sku].name, quantity, unitPrice, subtotal: quantity * unitPrice,
      receivedQuantity: o.status === 'received' ? quantity : 0,
    }));
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    return {
      poNumber: `PO-${key}-${String(counter[key]).padStart(4, '0')}`,
      supplier: sup[o.supplier]._id, supplierName: o.supplier,
      items, subtotal, tax: 0, total: subtotal, status: o.status,
      orderDate, expectedDate: daysAgo(o.expectedDay, 9, 0),
      receivedDate: o.receivedDay !== undefined ? daysAgo(o.receivedDay, 9, 0) : undefined,
      createdBy: admin._id, createdByName: admin.name, notes: o.notes || '',
      createdAt: orderDate, updatedAt: orderDate,
    };
  });
  return PurchaseOrder.insertMany(docs, { timestamps: false });
}

async function seedStockOpname(admin, prod, cat) {
  const openedAt = daysAgo(3, 17, 45);
  const finalizedAt = daysAgo(3, 19, 30);
  const sessionId = new mongoose.Types.ObjectId();
  const targetCats = [cat['Air Mineral'], cat['LPG']];
  const catName = Object.fromEntries(targetCats.map((c) => [String(c._id), c.name]));
  const targets = Object.values(prod).filter((p) => catName[String(p.category)]);

  // Selisih yang sengaja dibuat: [sku, selisih, alasan, catatan]
  const adjustments = {
    'AMN-001': [-3, 'rusak', 'Galon bocor'],
    'LPG-003': [-2, 'rusak', 'Tabung bocor, diretur ke agen'],
    'LPG-012': [-1, 'rusak', 'Segel rusak'],
    'AMN-003': [2, 'kesalahan_input', 'Salah input saat penerimaan'],
  };

  let totalDifference = 0;
  let totalLossValue = 0;
  const items = targets.map((p) => {
    const [diff, reason, notes] = adjustments[p.sku] || [0];
    const lossValue = diff < 0 ? Math.abs(diff) * p.cost : 0;
    totalDifference += diff;
    totalLossValue += lossValue;
    return {
      session: sessionId, product: p._id, productName: p.name, sku: p.sku,
      category: catName[String(p.category)], unit: p.unit,
      snapshotStock: p.stock, physicalCount: p.stock + diff, difference: diff,
      costAtTime: p.cost, lossValue, reason, notes,
      isCounted: true, countedBy: admin._id, countedByName: admin.name, countedAt: finalizedAt,
      createdAt: openedAt, updatedAt: finalizedAt,
    };
  });

  await StockOpname.create({
    _id: sessionId,
    sessionName: `Opname Gudang ${openedAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    status: 'completed', categoryFilter: targetCats.map((c) => c._id),
    openedBy: admin._id, openedByName: admin.name, finalizedBy: admin._id, finalizedByName: admin.name,
    openedAt, finalizedAt, totalItems: items.length, countedItems: items.length,
    totalDifference, totalLossValue, notes: 'Opname rutin mingguan',
  });
  await StockOpnameItem.insertMany(items, { timestamps: false });
  return items;
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    if (FRESH) {
      console.log('Mode --fresh: menghapus data lama...');
      await Promise.all(ALL_MODELS.map((m) => m.deleteMany({})));
      // Koleksi lama dari versi kafe (resep & shift) ikut dibersihkan
      await Promise.all(['recipes', 'shifts'].map((c) => mongoose.connection.db.collection(c).deleteMany({})));
    } else {
      const [userCount, productCount] = await Promise.all([User.countDocuments(), Product.countDocuments()]);
      if (userCount > 0 || productCount > 0) {
        console.log('Database sudah berisi data. Jalankan "npm run seed:fresh" untuk menghapus dan mengisi ulang.');
        await mongoose.connection.close();
        return;
      }
    }

    const users = await seedUsers();
    const admin = users.find((u) => u.role === 'admin');
    const cat = await seedCategories();
    const wh = await seedWarehouses();
    const vehicles = await seedVehicles();
    const prod = await seedProducts(cat, wh);
    const sup = await seedSuppliers();
    const customers = await seedCustomers();
    const transactions = await seedTransactions(users, prod, customers);
    transactions.forEach((t) => { t._id = new mongoose.Types.ObjectId(); });
    const deliveries = await seedDeliveries(admin, vehicles, transactions);
    await Transaction.insertMany(transactions, { timestamps: false });
    await Delivery.insertMany(deliveries, { timestamps: false });
    const pos = await seedPurchaseOrders(admin, prod, sup);
    const opnameItems = await seedStockOpname(admin, prod, cat);

    console.log('\nSeed selesai:');
    console.table({
      users: users.length,
      categories: Object.keys(cat).length,
      warehouses: Object.keys(wh).length,
      vehicles: vehicles.length,
      products: Object.keys(prod).length,
      suppliers: Object.keys(sup).length,
      customers: customers.length,
      transactions: transactions.length,
      deliveries: deliveries.length,
      purchaseOrders: pos.length,
      stockOpnameItems: opnameItems.length,
    });
    console.log('Akun login:');
    console.log('  admin@gmail.com  / admin123  (admin)');
    console.log('  kasir1@gmail.com / kasir123  (cashier)');
    console.log('  kasir2@gmail.com / kasir123  (cashier)');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

seedDatabase();
