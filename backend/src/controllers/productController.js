const Product = require("../models/Product");

// GET /products
async function listProducts(req, res) {
  const { q, limit = 20, page = 1 } = req.query;

  const filter = q
    ? { name: { $regex: String(q), $options: "i" } }
    : {};

  const lim = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * lim;

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    Product.countDocuments(filter),
  ]);

  return res.json({ items, total, page: Number(page), limit: lim });
}

// GET /products/:id
async function getProduct(req, res) {
  const { id } = req.params;
  const product = await Product.findById(id).lean();
  if (!product) return res.status(404).json({ message: "Not found" });
  return res.json(product);
}

// POST /products (admin)
async function createProduct(req, res) {
  const { stockCode, name, unitPrice } = req.body;

  if (!stockCode || !name || unitPrice === undefined) {
    return res.status(400).json({ message: "stockCode, name, unitPrice required" });
  }

  const exists = await Product.findOne({ stockCode });
  if (exists) return res.status(409).json({ message: "stockCode already exists" });

  const product = await Product.create({
    stockCode: String(stockCode).trim(),
    name: String(name).trim(),
    unitPrice: Number(unitPrice),
  });

  return res.status(201).json(product);
}

// PATCH /products/:id (admin)
async function updateProduct(req, res) {
  const { id } = req.params;
  const { name, unitPrice } = req.body;

  const update = {};
  if (name !== undefined) update.name = String(name).trim();
  if (unitPrice !== undefined) update.unitPrice = Number(unitPrice);

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: update }, // ✅ advanced update ($set)
    { new: true }
  ).lean();

  if (!product) return res.status(404).json({ message: "Not found" });
  return res.json(product);
}

// DELETE /products/:id (admin)
async function deleteProduct(req, res) {
  const { id } = req.params;
  const deleted = await Product.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: "Not found" });
  return res.json({ message: "deleted", id });
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
