const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get revenue analytics with multi-stage aggregation
// @route   GET /api/analytics/revenue
// @access  Private (Admin)
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    
    const pipeline = [
      // Stage 1: Match completed orders
      {
        $match: {
          status: 'delivered',
          paymentStatus: 'paid',
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      
      // Stage 2: Group by time period
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'monthly' ? '%Y-%m' : '%Y-%U',
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          averageOrder: { $avg: '$total' },
          productsSold: { $sum: { $size: '$items' } }
        }
      },
      
      // Stage 3: Sort chronologically
      {
        $sort: { _id: 1 }
      },
      
      // Stage 4: Add calculated fields
      {
        $addFields: {
          period: '$_id',
          revenueGrowth: {
            $cond: {
              if: { $eq: [{ $indexOfArray: ['$_id', null] }, 0] },
              then: null,
              else: {
                $divide: [
                  { $subtract: ['$revenue', { $arrayElemAt: ['$revenue', -1] }] },
                  { $arrayElemAt: ['$revenue', -1] }
                ]
              }
            }
          }
        }
      }
    ];
    
    const analytics = await Order.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      count: analytics.length,
      period,
      year,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get top selling products (Aggregation with lookup)
// @route   GET /api/analytics/top-products
// @access  Private (Admin)
exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    const pipeline = [
      // Stage 1: Match delivered orders in date range
      {
        $match: {
          status: 'delivered',
          ...(startDate && endDate ? {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          } : {})
        }
      },
      
      // Stage 2: Unwind order items
      { $unwind: '$items' },
      
      // Stage 3: Group by product
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          orderCount: { $sum: 1 }
        }
      },
      
      // Stage 4: Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      
      // Stage 5: Unwind product details
      { $unwind: '$productDetails' },
      
      // Stage 6: Project required fields
      {
        $project: {
          productId: '$_id',
          productName: '$productDetails.name',
          category: '$productDetails.category',
          price: '$productDetails.price',
          totalSold: 1,
          totalRevenue: 1,
          orderCount: 1,
          averageQuantity: { $divide: ['$totalSold', '$orderCount'] }
        }
      },
      
      // Stage 7: Sort by revenue
      { $sort: { totalRevenue: -1 } },
      
      // Stage 8: Limit results
      { $limit: parseInt(limit) }
    ];
    
    const topProducts = await Order.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      count: topProducts.length,
      topProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get customer purchase analytics
// @route   GET /api/analytics/customer-segments
// @access  Private (Admin)
exports.getCustomerSegments = async (req, res) => {
  try {
    const pipeline = [
      // Stage 1: Group by customer
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 },
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      
      // Stage 2: Lookup user details
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      
      // Stage 3: Unwind customer
      { $unwind: '$customer' },
      
      // Stage 4: Calculate customer segment
      {
        $addFields: {
          customerSegment: {
            $switch: {
              branches: [
                {
                  case: { $gte: ['$totalSpent', 1000] },
                  then: 'VIP'
                },
                {
                  case: { $gte: ['$totalSpent', 500] },
                  then: 'Loyal'
                },
                {
                  case: { $gte: ['$totalSpent', 100] },
                  then: 'Regular'
                }
              ],
              default: 'New'
            }
          },
          daysSinceLastOrder: {
            $divide: [
              { $subtract: [new Date(), '$lastOrder'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      
      // Stage 5: Group by segment
      {
        $group: {
          _id: '$customerSegment',
          customerCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          averageOrderValue: { $avg: '$averageOrderValue' },
          customers: {
            $push: {
              email: '$customer.email',
              name: '$customer.name',
              totalSpent: '$totalSpent',
              orderCount: '$orderCount'
            }
          }
        }
      },
      
      // Stage 6: Sort segments
      { $sort: { totalRevenue: -1 } }
    ];
    
    const segments = await Order.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      count: segments.length,
      segments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get inventory analytics with stock optimization
// @route   GET /api/analytics/inventory
// @access  Private (Admin)
exports.getInventoryAnalytics = async (req, res) => {
  try {
    const pipeline = [
      // Stage 1: Lookup product sales from orders
      {
        $lookup: {
          from: 'orders',
          let: { productId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            {
              $match: {
                $expr: {
                  $eq: ['$items.product', '$$productId']
                },
                status: 'delivered',
                createdAt: {
                  $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            },
            {
              $group: {
                _id: null,
                totalSold: { $sum: '$items.quantity' },
                dailyAverage: {
                  $avg: '$items.quantity'
                }
              }
            }
          ],
          as: 'salesData'
        }
      },
      
      // Stage 2: Calculate inventory metrics
      {
        $addFields: {
          salesData: { $arrayElemAt: ['$salesData', 0] },
          dailySales: { $ifNull: ['$salesData.dailyAverage', 0] },
          totalSoldLastMonth: { $ifNull: ['$salesData.totalSold', 0] },
          daysOfStock: {
            $cond: {
              if: { $gt: ['$dailySales', 0] },
              then: { $divide: ['$stock', '$dailySales'] },
              else: 999
            }
          },
          stockStatus: {
            $switch: {
              branches: [
                {
                  case: { $lte: ['$stock', 0] },
                  then: 'Out of Stock'
                },
                {
                  case: { $lte: ['$daysOfStock', 7] },
                  then: 'Low Stock'
                },
                {
                  case: { $lte: ['$daysOfStock', 30] },
                  then: 'Medium Stock'
                }
              ],
              default: 'High Stock'
            }
          },
          turnoverRate: {
            $cond: {
              if: { $gt: ['$stock', 0] },
              then: {
                $divide: [
                  '$totalSoldLastMonth',
                  { $add: ['$stock', '$totalSoldLastMonth'] }
                ]
              },
              else: 1
            }
          }
        }
      },
      
      // Stage 3: Project final fields
      {
        $project: {
          name: 1,
          sku: 1,
          category: 1,
          price: 1,
          stock: 1,
          dailySales: { $round: ['$dailySales', 2] },
          daysOfStock: { $round: ['$daysOfStock', 1] },
          stockStatus: 1,
          turnoverRate: { $round: ['$turnoverRate', 3] },
          totalSoldLastMonth: 1,
          recommendation: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$stockStatus', 'Out of Stock'] },
                  then: 'URGENT: Restock immediately'
                },
                {
                  case: { $eq: ['$stockStatus', 'Low Stock'] },
                  then: 'Restock within 7 days'
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$stockStatus', 'High Stock'] },
                      { $lt: ['$turnoverRate', 0.1] }
                    ]
                  },
                  then: 'Consider discount to clear stock'
                }
              ],
              default: 'Stock level adequate'
            }
          }
        }
      },
      
      // Stage 4: Sort by stock urgency
      {
        $sort: {
          'stockStatus': 1, // Out of Stock first
          'daysOfStock': 1  // Lowest days first
        }
      },
      
      // Stage 5: Limit for performance
      { $limit: 100 }
    ];
    
    const inventoryAnalytics = await Product.aggregate(pipeline);
    
    // Additional aggregation for summary
    const summaryPipeline = [
      {
        $group: {
          _id: '$stockStatus',
          count: { $sum: 1 },
          totalValue: {
            $sum: { $multiply: ['$price', '$stock'] }
          },
          averageTurnover: { $avg: '$turnoverRate' }
        }
      },
      { $sort: { count: -1 } }
    ];
    
    const summary = await Product.aggregate(summaryPipeline);
    
    res.status(200).json({
      success: true,
      count: inventoryAnalytics.length,
      inventory: inventoryAnalytics,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    // Run multiple aggregations in parallel
    const [
      revenueStats,
      orderStats,
      productStats,
      userStats
    ] = await Promise.all([
      // Revenue statistics
      Order.aggregate([
        {
          $match: {
            status: 'delivered',
            paymentStatus: 'paid',
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' },
            orderCount: { $sum: 1 }
          }
        }
      ]),
      
      // Order status distribution
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Product statistics
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            lowStockProducts: {
              $sum: { $cond: [{ $lte: ['$stock', 10] }, 1, 0] }
            },
            totalInventoryValue: {
              $sum: { $multiply: ['$price', '$stock'] }
            }
          }
        }
      ]),
      
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            adminUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
            },
            newUsersLastMonth: {
              $sum: {
                $cond: [{
                  $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
                }, 1, 0]
              }
            }
          }
        }
      ])
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          avgOrderValue: 0,
          orderCount: 0
        },
        orders: orderStats,
        products: productStats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
          totalInventoryValue: 0
        },
        users: userStats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          adminUsers: 0,
          newUsersLastMonth: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get sales trends by hour/day
// @route   GET /api/analytics/sales-trends
// @access  Private (Admin)
exports.getSalesTrends = async (req, res) => {
  try {
    const { groupBy = 'hour', days = 7 } = req.query;
    
    const formatMap = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      week: '%Y-%U',
      month: '%Y-%m'
    };
    
    const pipeline = [
      {
        $match: {
          status: 'delivered',
          createdAt: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: formatMap[groupBy] || formatMap.hour,
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          customers: { $addToSet: '$user' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $addFields: {
          uniqueCustomers: { $size: '$customers' }
        }
      },
      {
        $project: {
          period: '$_id',
          revenue: 1,
          orders: 1,
          uniqueCustomers: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          conversionRate: {
            $cond: {
              if: { $gt: ['$uniqueCustomers', 0] },
              then: {
                $round: [
                  { $divide: ['$orders', '$uniqueCustomers'] },
                  2
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { period: 1 } }
    ];
    
    const trends = await Order.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      groupBy,
      days,
      count: trends.length,
      trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};