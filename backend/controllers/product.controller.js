const { Product, Category } = require('../models');
const { Op } = require('sequelize');

// @desc    Fetch all products with filtering
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice } = req.query;
    
    let where = { is_active: true };

    if (keyword) {
      where.name = { [Op.iLike]: `%${keyword}%` };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }
    
    // If category is provided by name or ID (assuming ID for simplicity or join)
    // Here implementing simple filtering if category_id is passed directly
    if (category) {
       where.category_id = category;
    }

    const products = await Product.findAll({
      where,
      include: [{ model: Category, attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, attributes: ['name'] }]
    });

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category_id, image_url } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      stock,
      category_id,
      image_url
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct
};
