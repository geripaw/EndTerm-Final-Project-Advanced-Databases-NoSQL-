require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");

const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

function parseNumber(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const filePath = path.join(__dirname, "..", "data.csv"); // ✅ кладём data.csv в backend/
  console.log("📄 Reading:", filePath);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected for seeding");

  // seed:
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log("🧹 Cleared users/products/orders");

  // read csv
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log("✅ Rows:", rows.length);

  // unique products and users
  const userMap = new Map();    // customerId -> userDoc
  const productMap = new Map(); // stockCode -> productDoc

  // users
  const uniqueCustomers = new Map(); // customerId -> country
  for (const r of rows) {
    const customerId = parseNumber(r.CustomerID);
    if (customerId) {
      if (!uniqueCustomers.has(customerId)) {
        uniqueCustomers.set(customerId, r.Country || "");
      }
    }
  }

  const usersToInsert = [];
  for (const [customerId, country] of uniqueCustomers.entries()) {
    usersToInsert.push({
      customerId,
      country,
      email: `customer${customerId}@mail.com`,
      passwordHash: "seeded_no_password", // позже сделаем нормальный register/login
      role: "user",
    });
  }
  const insertedUsers = await User.insertMany(usersToInsert);
  for (const u of insertedUsers) userMap.set(u.customerId, u);
  console.log("👤 Users inserted:", insertedUsers.length);

  // products
  const uniqueProducts = new Map(); // stockCode -> {name, unitPrice}
  for (const r of rows) {
    const stockCode = (r.StockCode || "").trim();
    const name = (r.Description || "").trim();
    const unitPrice = parseNumber(r.UnitPrice);
    if (!stockCode) continue;
    if (!uniqueProducts.has(stockCode)) {
      uniqueProducts.set(stockCode, { name: name || stockCode, unitPrice: unitPrice ?? 0 });
    }
  }

  const productsToInsert = [];
  for (const [stockCode, v] of uniqueProducts.entries()) {
    productsToInsert.push({
      stockCode,
      name: v.name,
      unitPrice: v.unitPrice,
    });
  }
  const insertedProducts = await Product.insertMany(productsToInsert);
  for (const p of insertedProducts) productMap.set(p.stockCode, p);
  console.log("📦 Products inserted:", insertedProducts.length);

  
  const orderAgg = new Map(); // invoiceNo -> { userId, createdAt, country, status, items[] }
  for (const r of rows) {
    const invoiceNo = String(r.InvoiceNo || "").trim();
    if (!invoiceNo) continue;

    const customerId = parseNumber(r.CustomerID);
    if (!customerId || !userMap.has(customerId)) continue;

    const stockCode = (r.StockCode || "").trim();
    if (!stockCode || !productMap.has(stockCode)) continue;

    const quantity = parseNumber(r.Quantity) ?? 0;
    const price = parseNumber(r.UnitPrice) ?? 0;
    const country = (r.Country || "").trim();
    const date = new Date(r.InvoiceDate);

    
    const status = invoiceNo.startsWith("C") || quantity < 0 ? "cancelled" : "paid";

    if (!orderAgg.has(invoiceNo)) {
      orderAgg.set(invoiceNo, {
        invoiceNo,
        userId: userMap.get(customerId)._id,
        createdAt: date,
        country,
        status,
        items: [],
      });
    }

    orderAgg.get(invoiceNo).items.push({
      productId: productMap.get(stockCode)._id,
      quantity: Math.abs(quantity),
      price,
    });
  }

  const ordersToInsert = [];
  for (const o of orderAgg.values()) {
    const total = o.items.reduce((sum, it) => sum + it.quantity * it.price, 0);
    ordersToInsert.push({ ...o, total });
  }

  const insertedOrders = await Order.insertMany(ordersToInsert);
  console.log("🧾 Orders inserted:", insertedOrders.length);

  await mongoose.disconnect();
  console.log("✅ Done.");
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
