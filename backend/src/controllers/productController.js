const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get all products with pagination, filtering, and sorting
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      inStock
    } = req.query;
    
    // Build query
    let query = {};
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Filter by stock
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      query.stock = { $lte: 0 };
    }
    
    // Search by text
    if (search) {
      query.$text = { $search: search };
    }
    
    // Filter active products
    query.isActive = true;
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const productsPromise = Product.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));
    
    const totalPromise = Product.countDocuments(query);
    
    const [products, total] = await Promise.all([productsPromise, totalPromise]);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin)
exports.createProduct = async (req, res) => {
  try {
    // Generate SKU if not provided
    if (!req.body.sku) {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      req.body.sku = `SKU-${timestamp}-${random}`;
    }
    
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin)
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Use findOneAndUpdate for atomic operations
    product = await Product.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private (Admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Soft delete - set isActive to false
    product.isActive = false;
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk update products (Advanced update operation)
// @route   PUT /api/products/bulk/update
// @access  Private (Admin)
exports.bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updateData } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }
    
    // Use bulkWrite for efficient bulk operations
    const result = await Product.bulkWrite(
      productIds.map(id => ({
        updateOne: {
          filter: { _id: mongoose.Types.ObjectId(id) },
          update: { $set: updateData }
        }
      }))
    );
    
    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} products`,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product stock (Advanced atomic operation)
// @route   PUT /api/products/:id/stock
// @access  Private (Admin)
exports.updateStock = async (req, res) => {
  try {
    const { quantity, operation = 'add' } = req.body;
    
    if (!quantity || typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }
    
    const update = operation === 'add' 
      ? { $inc: { stock: quantity } }
      : { $inc: { stock: -quantity } };
    
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id },
      update,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Stock ${operation === 'add' ? 'added to' : 'removed from'} product`,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add product review (Advanced update with array operation)
// @route   POST /api/products/:id/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Using MongoDB's array operators
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reviews: {
            user: req.user.id,
            rating,
            comment,
            createdAt: new Date()
          }
        },
        $inc: { 'ratings.count': 1 }
      },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Recalculate average rating
    const reviews = product.reviews || [];
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    await Product.findByIdAndUpdate(req.params.id, {
      $set: { 'ratings.average': averageRating.toFixed(1) }
    });
    
    res.status(200).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search products with full-text search
// @route   GET /api/products/search
// @access  Public
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const products = await Product.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// @desc    Bulk update with advanced operators
// @route   PUT /api/products/bulk/advanced
// @access  Private (Admin)
exports.bulkAdvancedUpdate = async (req, res) => {
  try {
    const { filter, updates, arrayFilters } = req.body;
    
    // Пример сложного обновления с $set, $inc, $push, $pull
    const result = await Product.bulkWrite([
      {
        updateMany: {
          filter: filter || { category: 'electronics' },
          update: {
            $set: updates.$set || { 'attributes.warranty': '2 years' },
            $inc: updates.$inc || { price: -50 }, // скидка $50
            $push: updates.$push || { tags: 'discounted' },
            $pull: updates.$pull || { tags: 'new' }
          },
          arrayFilters: arrayFilters || []
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} products`,
      details: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update with positional operator
// @route   PUT /api/products/:id/reviews/:reviewId
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Positional operator $ для обновления конкретного элемента массива
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        'reviews._id': req.params.reviewId,
        'reviews.user': req.user.id
      },
      {
        $set: {
          'reviews.$.rating': rating,
          'reviews.$.comment': comment,
          'reviews.$.updatedAt': new Date()
        }
      },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or not authorized'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Review updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};