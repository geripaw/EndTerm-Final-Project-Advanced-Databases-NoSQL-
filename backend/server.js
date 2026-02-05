// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Загружаем переменные окружения
dotenv.config();

// Инициализируем Express
const app = express();

// ========== CORS ДЛЯ ТВОЕГО ПОРТА 5500 ==========
app.use(cors({
  origin: [
    'http://localhost:5500',      // Твой порт
    'http://127.0.0.1:5500',      // Твой порт (альтернатива)
    'http://localhost:3000',       // На всякий случай
    'http://127.0.0.1:3000'        // На всякий случай
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== ПОДКЛЮЧЕНИЕ К ТВОЕЙ БАЗЕ final ==========
const connectDB = async () => {
  try {
    // Подключаемся к базе "final" на localhost:27017
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected to: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    console.log(`📊 Collections:`, Object.keys(conn.connection.collections));
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// ========== ПРОСТЫЕ ДЕМО-МАРШРУТЫ ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'E-Commerce API for Final Project',
    database: mongoose.connection.readyState === 1 ? 'Connected to final' : 'Disconnected',
    mongodb: process.env.MONGODB_URI,
    timestamp: new Date().toISOString()
  });
});

// Демо-статистика для главной страницы
app.get('/api/stats', async (req, res) => {
  try {
    // Проверяем, есть ли коллекции
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📊 Available collections:', collectionNames);
    
    // Используем существующую коллекцию "ecomm" если есть, или создаем демо
    let totalProducts = 42;
    let totalOrders = 156;
    let totalRevenue = 12450;
    
    // Пробуем посчитать реальные данные если коллекции существуют
    if (collectionNames.includes('products') || collectionNames.includes('ecomm')) {
      try {
        const collectionName = collectionNames.includes('products') ? 'products' : 'ecomm';
        totalProducts = await mongoose.connection.db.collection(collectionName).countDocuments();
      } catch (e) {
        console.log('Using demo product count');
      }
    }
    
    res.json({
      success: true,
      totalProducts,
      totalOrders,
      totalRevenue,
      database: 'final',
      collection: 'ecomm'
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    // Возвращаем демо-данные
    res.json({
      success: true,
      totalProducts: 42,
      totalOrders: 156,
      totalRevenue: 12450
    });
  }
});

// Демо-продукты
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    
    // Проверяем коллекцию ecomm
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasEcomm = collections.some(c => c.name === 'ecomm');
    
    let products = [];
    let totalProducts = 0;
    
    if (hasEcomm) {
      // Используем реальные данные из коллекции ecomm
      const collection = mongoose.connection.db.collection('ecomm');
      totalProducts = await collection.countDocuments();
      
      // ВОТ ИСПРАВЛЕННАЯ ЧАСТЬ СО СОРТИРОВКОЙ:
      products = await collection.find({})
        .sort({ createdAt: -1 })  // ← НОВЫЕ ПРОДУКТЫ ПЕРВЫМИ
        .skip(skip)
        .limit(limit)
        .toArray();
      
      console.log(`📦 Found ${products.length} products in ecomm collection`);
    } else {
      // Демо-данные с датами для правильной сортировки
      products = [
        { 
          _id: '1', 
          name: 'iPhone 15 Pro', 
          price: 1199, 
          category: 'electronics', 
          stock: 10,
          createdAt: new Date()  // самый новый
        },
        { 
          _id: '2', 
          name: 'Designer Jeans', 
          price: 89, 
          category: 'clothing', 
          stock: 25,
          createdAt: new Date(Date.now() - 86400000)  // вчера
        },
        { 
          _id: '3', 
          name: 'Coffee Maker', 
          price: 129, 
          category: 'home', 
          stock: 15,
          createdAt: new Date(Date.now() - 172800000)  // 2 дня назад
        },
        { 
          _id: '4', 
          name: 'Programming Book', 
          price: 45, 
          category: 'books', 
          stock: 30,
          createdAt: new Date(Date.now() - 259200000)  // 3 дня назад
        },
        { 
          _id: '5', 
          name: 'Wireless Earbuds', 
          price: 79, 
          category: 'electronics', 
          stock: 20,
          createdAt: new Date(Date.now() - 345600000)  // 4 дня назад
        }
      ];
      totalProducts = 5;
    }
    
    res.json({
      success: true,
      products,
      page,
      limit,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit)
    });
    
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});
// Демо-логин
app.post('/api/auth/demo', (req, res) => {
  res.json({
    success: true,
    token: 'demo-jwt-token-final-project-2024',
    user: {
      id: 'user-123-final',
      email: 'admin@final-project.com',
      name: 'Final Project Admin',
      role: 'admin'
    }
  });
});

// Создание продукта (демо)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required'
      });
    }
    
    const newProduct = {
      _id: new mongoose.Types.ObjectId(),
      name,
      price: parseFloat(price),
      category: category || 'electronics',
      stock: 10,
      createdAt: new Date(),  // ← ВАЖНО! ДОБАВЛЯЕМ ДАТУ СОЗДАНИЯ
      updatedAt: new Date()
    };
    
    // Сохраняем в коллекцию ecomm
    const collection = mongoose.connection.db.collection('ecomm');
    await collection.insertOne(newProduct);
    
    console.log(`✅ Product added: ${name} (created at: ${newProduct.createdAt})`);
    
    res.status(201).json({
      success: true,
      product: newProduct
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});

// Обновление продукта
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Обновляем в коллекции ecomm
    const collection = mongoose.connection.db.collection('ecomm');
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
});

// Удаление продукта
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const collection = mongoose.connection.db.collection('ecomm');
    const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Демо-заказы
app.get('/api/orders', async (req, res) => {
  try {
    // Проверяем есть ли коллекция orders
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasOrders = collections.some(c => c.name === 'orders');
    
    let orders = [];
    
    if (hasOrders) {
      const collection = mongoose.connection.db.collection('orders');
      orders = await collection.find({}).limit(10).toArray();
    } else {
      // Демо-заказы
      orders = [
        {
          _id: 'order-001',
          orderNumber: 'ORD-001',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          total: 245.99,
          status: 'processing',
          createdAt: new Date('2024-01-15'),
          items: [
            { productId: '1', name: 'iPhone 15 Pro', quantity: 1, price: 1199 },
            { productId: '2', name: 'Designer Jeans', quantity: 1, price: 89 }
          ]
        },
        {
          _id: 'order-002',
          orderNumber: 'ORD-002',
          customerName: 'Jane Smith',
          customerEmail: 'jane@example.com',
          total: 89.50,
          status: 'shipped',
          createdAt: new Date('2024-01-14'),
          items: [
            { productId: '2', name: 'Designer Jeans', quantity: 1, price: 89 }
          ]
        }
      ];
    }
    
    res.json({
      success: true,
      orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Демо-аналитика
app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    stats: {
      revenue: {
        totalRevenue: 12450,
        orderCount: 42,
        avgOrderValue: 296.43
      },
      products: {
        totalProducts: 156,
        activeProducts: 142,
        lowStockProducts: 8,
        totalInventoryValue: 24500
      },
      users: {
        totalUsers: 89,
        activeUsers: 67,
        adminUsers: 3,
        newUsersLastMonth: 15
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  🚀 FINAL PROJECT BACKEND STARTED
  =================================
  📡 API Server: http://localhost:${PORT}
  📊 MongoDB: ${process.env.MONGODB_URI}
  📁 Database: final
  🗂️  Collection: ecomm
  🌐 CORS enabled for: localhost:5500
  =================================
  📋 Available Endpoints:
  • GET  /api/health           - Health check
  • GET  /api/stats            - Statistics
  • GET  /api/products         - Get products
  • POST /api/products         - Create product
  • PUT  /api/products/:id     - Update product
  • DELETE /api/products/:id   - Delete product
  • POST /api/auth/demo        - Demo login
  • GET  /api/orders           - Get orders
  • GET  /api/analytics/dashboard - Analytics
  =================================
  `);
});