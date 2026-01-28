const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { sequelize } = require('./config/database');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // In this new structure, we serve the root directory? 
  // Or maybe we should serve specific folders. 
  // Let's serve everything from the project root for simplicity since it's "Vanilla".
  app.use(express.static(path.join(__dirname, '../'))); // Serve root
} else {
    // Even in dev, if we aren't using Vite Dev Server proxying, we might want express to serve static files. 
    // The user didn't specify build tool for this structure, likely "Go Live" or simple server.
    // I'll make Express serve the static files from root.
    app.use(express.static(path.join(__dirname, '../')));
}

// Routes
const authRoutes = require('./routes/api/auth.routes');
const productRoutes = require('./routes/api/product.routes');
const cartRoutes = require('./routes/api/cart.routes');
const orderRoutes = require('./routes/api/order.routes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Database Connection & Server Start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Sync models (disable in production or use migrations)
    // await sequelize.sync(); 
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
