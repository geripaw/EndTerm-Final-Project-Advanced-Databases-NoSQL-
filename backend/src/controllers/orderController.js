const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

// helper: count total по items
async function recalcTotal(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) return null;

  let total = 0;
  for (const it of order.items || []) {
    total += (it.quantity || 0) * (it.price || 0);
  }

  await Order.updateOne({ _id: orderId }, { $set: { total } });
  return total;
}

// POST /orders
// body: { items: [{ productId, quantity }] }
async function createOrder(req, res) {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items[] required" });
  }

  // check price from Product
  const normalized = [];
  for (const it of items) {
    if (!it.productId || !it.quantity) {
      return res.status(400).json({ message: "productId and quantity required" });
    }
    if (!mongoose.isValidObjectId(it.productId)) {
      return res.status(400).json({ message: "invalid productId" });
    }

    const product = await Product.findById(it.productId).lean();
    if (!product) return res.status(404).json({ message: "product not found" });

    normalized.push({
      productId: product._id,
      quantity: Number(it.quantity),
      price: Number(product.unitPrice),
    });
  }

  const total = normalized.reduce((s, it) => s + it.quantity * it.price, 0);

  const order = await Order.create({
    invoiceNo: `LOCAL-${Date.now()}`, // локальный номер (не из CSV)
    userId: req.user._id,
    country: req.user.country || "",
    createdAt: new Date(),
    status: "paid",
    items: normalized,
    total,
  });

  return res.status(201).json(order);
}

// GET /orders
// user: свои, admin: все
async function listOrders(req, res) {
  const { limit = 20, page = 1 } = req.query;
  const lim = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * lim;

  const filter = req.user.role === "admin" ? {} : { userId: req.user._id };

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    Order.countDocuments(filter),
  ]);

  return res.json({ items, total, page: Number(page), limit: lim });
}

// GET /orders/:id
async function getOrder(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const order = await Order.findById(id).populate("items.productId").lean();
  if (!order) return res.status(404).json({ message: "Not found" });

  const isOwner = String(order.userId) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  return res.json(order);
}

// PATCH /orders/:id/items  (advanced: $push)
// body: { productId, quantity }
async function addItem(req, res) {
  const { id } = req.params;
  const { productId, quantity } = req.body;

  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid order id" });
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "invalid productId" });
  if (!quantity) return res.status(400).json({ message: "quantity required" });

  const order = await Order.findById(id).lean();
  if (!order) return res.status(404).json({ message: "Not found" });

  const isOwner = String(order.userId) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  const product = await Product.findById(productId).lean();
  if (!product) return res.status(404).json({ message: "product not found" });

  await Order.updateOne(
    { _id: id },
    {
      $push: {
        items: {
          productId: product._id,
          quantity: Number(quantity),
          price: Number(product.unitPrice),
        },
      },
    }
  );

  const total = await recalcTotal(id);
  const updated = await Order.findById(id).lean();
  return res.json({ order: updated, total });
}

// DELETE /orders/:id/items/:productId  (advanced: $pull)
async function removeItem(req, res) {
  const { id, productId } = req.params;

  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid order id" });
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "invalid productId" });

  const order = await Order.findById(id).lean();
  if (!order) return res.status(404).json({ message: "Not found" });

  const isOwner = String(order.userId) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  await Order.updateOne(
    { _id: id },
    { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } }
  );

  const total = await recalcTotal(id);
  const updated = await Order.findById(id).lean();
  return res.json({ order: updated, total });
}

// PATCH /orders/:id/status
// body: { status: "paid" | "cancelled" }
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid order id" });
  if (!["paid", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "status must be paid/cancelled" });
  }

  const order = await Order.findById(id).lean();
  if (!order) return res.status(404).json({ message: "Not found" });

  const isOwner = String(order.userId) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  const updated = await Order.findByIdAndUpdate(
    id,
    { $set: { status } }, // ✅ $set
    { new: true }
  ).lean();

  return res.json(updated);
}

// DELETE /orders/:id (admin only)
async function deleteOrder(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid order id" });

  const deleted = await Order.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: "Not found" });

  return res.json({ message: "deleted", id });
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  addItem,
  removeItem,
  updateStatus,
  deleteOrder,
};
