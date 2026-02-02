const Order = require("../models/Order");

// GET /analytics/top-products?limit=10
async function topProducts(req, res) {
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const pipeline = [
    { $match: { status: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        units: { $sum: "$items.quantity" },
        ordersCount: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        revenue: 1,
        units: 1,
        orders: { $size: "$ordersCount" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    // подтягиваем название товара
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: "$_id",
        stockCode: "$product.stockCode",
        name: "$product.name",
        revenue: 1,
        units: 1,
        orders: 1,
        _id: 0,
      },
    },
  ];

  const data = await Order.aggregate(pipeline);
  return res.json({ limit, data });
}

// GET /analytics/revenue-by-country?limit=20
async function revenueByCountry(req, res) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const pipeline = [
    { $match: { status: "paid" } },
    {
      $group: {
        _id: "$country",
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        country: "$_id",
        revenue: 1,
        orders: 1,
        _id: 0,
      },
    },
  ];

  const data = await Order.aggregate(pipeline);
  return res.json({ limit, data });
}


async function revenueByMonth(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();

  
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const pipeline = [
    { $match: { status: "paid", createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
    {
      $project: {
        month: "$_id.month",
        revenue: 1,
        orders: 1,
        _id: 0,
      },
    },
  ];

  const data = await Order.aggregate(pipeline);
  return res.json({ year, data });
}

module.exports = { topProducts, revenueByCountry, revenueByMonth };
