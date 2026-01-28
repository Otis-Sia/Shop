const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct } = require('../../controllers/product.controller');
const { protect, admin } = require('../../middleware/auth');

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, admin, createProduct);

module.exports = router;
